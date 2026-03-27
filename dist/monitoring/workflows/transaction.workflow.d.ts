import { Repository } from 'typeorm';
import { TransactionStatusEntity } from '../entities/transaction-status.entity';
import { TransactionMonitorService } from '../transaction-monitor.service';
import { RetryService } from '../retry/retry.service';
import { AlertService } from '../alerts/alert.service';
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
export declare enum WorkflowStatus {
    PENDING = "pending",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export declare class TransactionWorkflowService {
    private readonly transactionStatusRepository;
    private readonly transactionMonitorService;
    private readonly retryService;
    private readonly alertService;
    private readonly logger;
    private readonly activeWorkflows;
    constructor(transactionStatusRepository: Repository<TransactionStatusEntity>, transactionMonitorService: TransactionMonitorService, retryService: RetryService, alertService: AlertService);
    createWorkflow(transactionHash: string, workflowType?: 'standard' | 'priority' | 'batch'): Promise<string>;
    executeWorkflow(workflowId: string): Promise<void>;
    private executeStepWithRetry;
    private calculateRetryDelay;
    private handleWorkflowFailure;
    private getWorkflowSteps;
    cancelWorkflow(workflowId: string): Promise<void>;
    getWorkflowStatus(workflowId: string): Promise<{
        status: WorkflowStatus;
        currentStep: number;
        totalSteps: number;
        startTime: Date;
        elapsedMs: number;
    } | null>;
    getActiveWorkflows(): Promise<Array<{
        workflowId: string;
        transactionHash: string;
        status: WorkflowStatus;
        currentStep: number;
        totalSteps: number;
        startTime: Date;
    }>>;
    cleanupExpiredWorkflows(): Promise<void>;
    private sleep;
    getWorkflowStats(): {
        activeWorkflows: number;
        completedWorkflows: number;
        failedWorkflows: number;
        averageExecutionTime: number;
    };
}
