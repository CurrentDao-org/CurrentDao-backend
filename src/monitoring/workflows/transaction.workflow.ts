import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionStatusEntity, TransactionStatus, TransactionPriority } from '../entities/transaction-status.entity';
import { TransactionMonitorService } from '../transaction-monitor.service';
import { RetryService } from '../retry/retry.service';
import { AlertService } from '../alerts/alert.service';

const StellarSdk = require('stellar-sdk');

export interface WorkflowStep {
  name: string;
  execute(context: TransactionWorkflowContext): Promise<void>;
  rollback?(context: TransactionWorkflowContext): Promise<void>;
  retryPolicy?: {
    maxAttempts: number;
    delay: number;
    backoffMultiplier?: number;
  };
}

export interface TransactionWorkflowContext {
  transaction: TransactionStatusEntity;
  stellarTransaction?: any;
  server: any;
  metadata: Record<string, any>;
  stepResults: Map<string, any>;
}

export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Injectable()
export class TransactionWorkflowService {
  private readonly logger = new Logger(TransactionWorkflowService.name);
  private readonly activeWorkflows = new Map<string, {
    status: WorkflowStatus;
    currentStep: number;
    steps: WorkflowStep[];
    context: TransactionWorkflowContext;
    startTime: Date;
  }>();

  constructor(
    @InjectRepository(TransactionStatusEntity)
    private readonly transactionStatusRepository: Repository<TransactionStatusEntity>,
    private readonly transactionMonitorService: TransactionMonitorService,
    private readonly retryService: RetryService,
    private readonly alertService: AlertService,
  ) {}

  async createWorkflow(
    transactionHash: string,
    workflowType: 'standard' | 'priority' | 'batch' = 'standard',
  ): Promise<string> {
    const transaction = await this.transactionStatusRepository.findOne({
      where: { transactionHash },
    });

    if (!transaction) {
      throw new Error(`Transaction ${transactionHash} not found`);
    }

    const steps = this.getWorkflowSteps(workflowType, transaction);
    const context: TransactionWorkflowContext = {
      transaction,
      server: new (require('stellar-sdk')).Horizon.Server(
        process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
      ),
      metadata: {},
      stepResults: new Map(),
    };

    const workflowId = `${transactionHash}_${Date.now()}`;
    
    this.activeWorkflows.set(workflowId, {
      status: WorkflowStatus.PENDING,
      currentStep: 0,
      steps,
      context,
      startTime: new Date(),
    });

    this.logger.log(`Created workflow ${workflowId} for transaction ${transactionHash}`);
    
    return workflowId;
  }

  async executeWorkflow(workflowId: string): Promise<void> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.status = WorkflowStatus.RUNNING;
    
    try {
      for (let i = workflow.currentStep; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        workflow.currentStep = i;

        this.logger.log(`Executing step ${i + 1}/${workflow.steps.length}: ${step.name}`);
        
        await this.executeStepWithRetry(step, workflow.context);
        
        workflow.context.stepResults.set(step.name, {
          completed: true,
          timestamp: new Date(),
        });
      }

      workflow.status = WorkflowStatus.COMPLETED;
      
      await this.transactionStatusRepository.update(
        { transactionHash: workflow.context.transaction.transactionHash },
        { status: TransactionStatus.CONFIRMED, confirmedAt: new Date() }
      );

      await this.alertService.sendCriticalAlert(
        `Workflow ${workflowId} completed successfully for transaction ${workflow.context.transaction.transactionHash}`
      );

      this.logger.log(`Workflow ${workflowId} completed successfully`);

    } catch (error: any) {
      workflow.status = WorkflowStatus.FAILED;
      
      await this.handleWorkflowFailure(workflowId, error);
      
      this.logger.error(`Workflow ${workflowId} failed:`, error);
      
      throw error;
    } finally {
      this.activeWorkflows.delete(workflowId);
    }
  }

  private async executeStepWithRetry(
    step: WorkflowStep,
    context: TransactionWorkflowContext,
  ): Promise<void> {
    const maxAttempts = step.retryPolicy?.maxAttempts || 1;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await step.execute(context);
        return;
      } catch (error: any) {
        lastError = error;
        
        this.logger.warn(
          `Step ${step.name} failed (attempt ${attempt}/${maxAttempts}):`,
          error.message
        );

        if (attempt < maxAttempts) {
          const delay = this.calculateRetryDelay(step, attempt);
          await this.sleep(delay);
        }
      }
    }

    if (step.rollback) {
      try {
        await step.rollback(context);
        this.logger.log(`Step ${step.name} rolled back successfully`);
      } catch (rollbackError: any) {
        this.logger.error(`Rollback failed for step ${step.name}:`, rollbackError);
      }
    }

    throw lastError;
  }

  private calculateRetryDelay(step: WorkflowStep, attempt: number): number {
    if (!step.retryPolicy) return 1000;
    
    const { delay, backoffMultiplier = 2 } = step.retryPolicy;
    return delay * Math.pow(backoffMultiplier, attempt - 1);
  }

  private async handleWorkflowFailure(
    workflowId: string,
    error: Error,
  ): Promise<void> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return;

    const { transaction } = workflow.context;
    
    await this.transactionStatusRepository.update(
      { transactionHash: transaction.transactionHash },
      {
        status: TransactionStatus.FAILED,
        errorMessage: error.message,
      }
    );

    await this.alertService.sendFailureAlert(transaction, error.message);

    if (transaction.retryCount < transaction.maxRetries) {
      await this.retryService.scheduleRetry(transaction);
    }
  }

  private getWorkflowSteps(
    workflowType: string,
    transaction: TransactionStatusEntity,
  ): WorkflowStep[] {
    const baseSteps: WorkflowStep[] = [
      {
        name: 'validate_transaction',
        execute: async (context) => {
          if (!context.transaction.transactionHash) {
            throw new Error('Transaction hash is required');
          }
          context.metadata.validated = true;
        },
        retryPolicy: { maxAttempts: 3, delay: 1000 },
      },
      {
        name: 'check_network_status',
        execute: async (context) => {
          try {
            const networkStatus = await context.server.root().call();
            context.metadata.networkStatus = networkStatus;
          } catch (error) {
            throw new Error(`Network status check failed: ${error.message}`);
          }
        },
        retryPolicy: { maxAttempts: 5, delay: 2000, backoffMultiplier: 1.5 },
      },
      {
        name: 'verify_transaction_exists',
        execute: async (context) => {
          try {
            const stellarTx = await context.server.transactions()
              .transaction(context.transaction.transactionHash)
              .call();
            
            context.stellarTransaction = stellarTx;
            context.metadata.verified = true;
          } catch (error: any) {
            if (error.response?.status === 404) {
              throw new Error('Transaction not found on network');
            }
            throw error;
          }
        },
        retryPolicy: { maxAttempts: 10, delay: 5000 },
      },
      {
        name: 'validate_transaction_success',
        execute: async (context) => {
          if (!context.stellarTransaction.successful) {
            throw new Error(`Transaction failed: ${context.stellarTransaction.result_xdr}`);
          }
          context.metadata.successValidated = true;
        },
      },
      {
        name: 'update_ledger_info',
        execute: async (context) => {
          await this.transactionStatusRepository.update(
            { transactionHash: context.transaction.transactionHash },
            {
              ledgerSequence: context.stellarTransaction.ledger,
              confirmedAt: new Date(),
            }
          );
          context.metadata.ledgerUpdated = true;
        },
        retryPolicy: { maxAttempts: 3, delay: 1000 },
      },
    ];

    switch (workflowType) {
      case 'priority':
        return [
          ...baseSteps,
          {
            name: 'priority_verification',
            execute: async (context) => {
              if (context.transaction.priority !== TransactionPriority.CRITICAL) {
                throw new Error('Priority workflow requires critical priority');
              }
              context.metadata.priorityVerified = true;
            },
          },
          {
            name: 'enhanced_monitoring',
            execute: async (context) => {
              await this.alertService.sendCriticalAlert(
                `Priority transaction ${context.transaction.transactionHash} is being processed with enhanced monitoring`
              );
              context.metadata.enhancedMonitoring = true;
            },
          },
        ];

      case 'batch':
        return [
          ...baseSteps,
          {
            name: 'batch_validation',
            execute: async (context) => {
              const batchTransactions = await this.transactionStatusRepository.find({
                where: {
                  status: TransactionStatus.PENDING,
                  priority: TransactionPriority.LOW,
                },
                take: 10,
              });

              context.metadata.batchSize = batchTransactions.length;
              context.metadata.batchValidated = true;
            },
            retryPolicy: { maxAttempts: 2, delay: 1000 },
          },
        ];

      default:
        return baseSteps;
    }
  }

  async cancelWorkflow(workflowId: string): Promise<void> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.status = WorkflowStatus.CANCELLED;
    
    await this.transactionStatusRepository.update(
      { transactionHash: workflow.context.transaction.transactionHash },
      { status: TransactionStatus.FAILED, errorMessage: 'Workflow cancelled' }
    );

    this.activeWorkflows.delete(workflowId);
    
    this.logger.log(`Workflow ${workflowId} cancelled`);
  }

  async getWorkflowStatus(workflowId: string): Promise<{
    status: WorkflowStatus;
    currentStep: number;
    totalSteps: number;
    startTime: Date;
    elapsedMs: number;
  } | null> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return null;

    return {
      status: workflow.status,
      currentStep: workflow.currentStep,
      totalSteps: workflow.steps.length,
      startTime: workflow.startTime,
      elapsedMs: Date.now() - workflow.startTime.getTime(),
    };
  }

  async getActiveWorkflows(): Promise<Array<{
    workflowId: string;
    transactionHash: string;
    status: WorkflowStatus;
    currentStep: number;
    totalSteps: number;
    startTime: Date;
  }>> {
    const workflows: Array<{
      workflowId: string;
      transactionHash: string;
      status: WorkflowStatus;
      currentStep: number;
      totalSteps: number;
      startTime: Date;
    }> = [];

    for (const [workflowId, workflow] of Array.from(this.activeWorkflows.entries())) {
      workflows.push({
        workflowId,
        transactionHash: workflow.context.transaction.transactionHash,
        status: workflow.status,
        currentStep: workflow.currentStep,
        totalSteps: workflow.steps.length,
        startTime: workflow.startTime,
      });
    }

    return workflows;
  }

  async cleanupExpiredWorkflows(): Promise<void> {
    const now = Date.now();
    const expiredWorkflows: string[] = [];

    for (const [workflowId, workflow] of Array.from(this.activeWorkflows.entries())) {
      const elapsed = now - workflow.startTime.getTime();
      const timeoutMs = 30 * 60 * 1000;

      if (elapsed > timeoutMs) {
        expiredWorkflows.push(workflowId);
      }
    }

    for (const workflowId of expiredWorkflows) {
      await this.cancelWorkflow(workflowId);
    }

    if (expiredWorkflows.length > 0) {
      this.logger.log(`Cleaned up ${expiredWorkflows.length} expired workflows`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getWorkflowStats(): {
    activeWorkflows: number;
    completedWorkflows: number;
    failedWorkflows: number;
    averageExecutionTime: number;
  } {
    const workflows = Array.from(this.activeWorkflows.values());
    
    const completed = workflows.filter(w => w.status === WorkflowStatus.COMPLETED).length;
    const failed = workflows.filter(w => w.status === WorkflowStatus.FAILED).length;
    
    const executionTimes = workflows
      .filter(w => w.status === WorkflowStatus.COMPLETED)
      .map(w => Date.now() - w.startTime.getTime());
    
    const averageExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
      : 0;

    return {
      activeWorkflows: workflows.length,
      completedWorkflows: completed,
      failedWorkflows: failed,
      averageExecutionTime,
    };
  }
}
