"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var TransactionWorkflowService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionWorkflowService = exports.WorkflowStatus = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const transaction_status_entity_1 = require("../entities/transaction-status.entity");
const transaction_monitor_service_1 = require("../transaction-monitor.service");
const retry_service_1 = require("../retry/retry.service");
const alert_service_1 = require("../alerts/alert.service");
const StellarSdk = require('stellar-sdk');
var WorkflowStatus;
(function (WorkflowStatus) {
    WorkflowStatus["PENDING"] = "pending";
    WorkflowStatus["RUNNING"] = "running";
    WorkflowStatus["COMPLETED"] = "completed";
    WorkflowStatus["FAILED"] = "failed";
    WorkflowStatus["CANCELLED"] = "cancelled";
})(WorkflowStatus || (exports.WorkflowStatus = WorkflowStatus = {}));
let TransactionWorkflowService = TransactionWorkflowService_1 = class TransactionWorkflowService {
    constructor(transactionStatusRepository, transactionMonitorService, retryService, alertService) {
        this.transactionStatusRepository = transactionStatusRepository;
        this.transactionMonitorService = transactionMonitorService;
        this.retryService = retryService;
        this.alertService = alertService;
        this.logger = new common_1.Logger(TransactionWorkflowService_1.name);
        this.activeWorkflows = new Map();
    }
    async createWorkflow(transactionHash, workflowType = 'standard') {
        const transaction = await this.transactionStatusRepository.findOne({
            where: { transactionHash },
        });
        if (!transaction) {
            throw new Error(`Transaction ${transactionHash} not found`);
        }
        const steps = this.getWorkflowSteps(workflowType, transaction);
        const context = {
            transaction,
            server: new (require('stellar-sdk')).Horizon.Server(process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org'),
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
    async executeWorkflow(workflowId) {
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
            await this.transactionStatusRepository.update({ transactionHash: workflow.context.transaction.transactionHash }, { status: transaction_status_entity_1.TransactionStatus.CONFIRMED, confirmedAt: new Date() });
            await this.alertService.sendCriticalAlert(`Workflow ${workflowId} completed successfully for transaction ${workflow.context.transaction.transactionHash}`);
            this.logger.log(`Workflow ${workflowId} completed successfully`);
        }
        catch (error) {
            workflow.status = WorkflowStatus.FAILED;
            await this.handleWorkflowFailure(workflowId, error);
            this.logger.error(`Workflow ${workflowId} failed:`, error);
            throw error;
        }
        finally {
            this.activeWorkflows.delete(workflowId);
        }
    }
    async executeStepWithRetry(step, context) {
        const maxAttempts = step.retryPolicy?.maxAttempts || 1;
        let lastError = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                await step.execute(context);
                return;
            }
            catch (error) {
                lastError = error;
                this.logger.warn(`Step ${step.name} failed (attempt ${attempt}/${maxAttempts}):`, error.message);
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
            }
            catch (rollbackError) {
                this.logger.error(`Rollback failed for step ${step.name}:`, rollbackError);
            }
        }
        throw lastError;
    }
    calculateRetryDelay(step, attempt) {
        if (!step.retryPolicy)
            return 1000;
        const { delay, backoffMultiplier = 2 } = step.retryPolicy;
        return delay * Math.pow(backoffMultiplier, attempt - 1);
    }
    async handleWorkflowFailure(workflowId, error) {
        const workflow = this.activeWorkflows.get(workflowId);
        if (!workflow)
            return;
        const { transaction } = workflow.context;
        await this.transactionStatusRepository.update({ transactionHash: transaction.transactionHash }, {
            status: transaction_status_entity_1.TransactionStatus.FAILED,
            errorMessage: error.message,
        });
        await this.alertService.sendFailureAlert(transaction, error.message);
        if (transaction.retryCount < transaction.maxRetries) {
            await this.retryService.scheduleRetry(transaction);
        }
    }
    getWorkflowSteps(workflowType, transaction) {
        const baseSteps = [
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
                    }
                    catch (error) {
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
                    }
                    catch (error) {
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
                    await this.transactionStatusRepository.update({ transactionHash: context.transaction.transactionHash }, {
                        ledgerSequence: context.stellarTransaction.ledger,
                        confirmedAt: new Date(),
                    });
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
                            if (context.transaction.priority !== transaction_status_entity_1.TransactionPriority.CRITICAL) {
                                throw new Error('Priority workflow requires critical priority');
                            }
                            context.metadata.priorityVerified = true;
                        },
                    },
                    {
                        name: 'enhanced_monitoring',
                        execute: async (context) => {
                            await this.alertService.sendCriticalAlert(`Priority transaction ${context.transaction.transactionHash} is being processed with enhanced monitoring`);
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
                                    status: transaction_status_entity_1.TransactionStatus.PENDING,
                                    priority: transaction_status_entity_1.TransactionPriority.LOW,
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
    async cancelWorkflow(workflowId) {
        const workflow = this.activeWorkflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }
        workflow.status = WorkflowStatus.CANCELLED;
        await this.transactionStatusRepository.update({ transactionHash: workflow.context.transaction.transactionHash }, { status: transaction_status_entity_1.TransactionStatus.FAILED, errorMessage: 'Workflow cancelled' });
        this.activeWorkflows.delete(workflowId);
        this.logger.log(`Workflow ${workflowId} cancelled`);
    }
    async getWorkflowStatus(workflowId) {
        const workflow = this.activeWorkflows.get(workflowId);
        if (!workflow)
            return null;
        return {
            status: workflow.status,
            currentStep: workflow.currentStep,
            totalSteps: workflow.steps.length,
            startTime: workflow.startTime,
            elapsedMs: Date.now() - workflow.startTime.getTime(),
        };
    }
    async getActiveWorkflows() {
        const workflows = [];
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
    async cleanupExpiredWorkflows() {
        const now = Date.now();
        const expiredWorkflows = [];
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
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getWorkflowStats() {
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
};
exports.TransactionWorkflowService = TransactionWorkflowService;
exports.TransactionWorkflowService = TransactionWorkflowService = TransactionWorkflowService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(transaction_status_entity_1.TransactionStatusEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        transaction_monitor_service_1.TransactionMonitorService,
        retry_service_1.RetryService,
        alert_service_1.AlertService])
], TransactionWorkflowService);
//# sourceMappingURL=transaction.workflow.js.map