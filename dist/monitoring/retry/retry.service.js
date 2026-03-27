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
var RetryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryService = exports.LinearBackoffStrategy = exports.ExponentialBackoffStrategy = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const transaction_status_entity_1 = require("../entities/transaction-status.entity");
const StellarSdk = require('stellar-sdk');
class ExponentialBackoffStrategy {
    calculateDelay(attempt, priority) {
        const baseDelay = this.getBaseDelay(priority);
        const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 1000;
        return Math.min(exponentialDelay + jitter, 30000);
    }
    shouldRetry(error, attempt, maxRetries) {
        if (attempt >= maxRetries) {
            return false;
        }
        const nonRetryableErrors = [
            'tx_insufficient_fee',
            'tx_no_source_account',
            'tx_bad_auth',
            'tx_bad_auth_extra',
            'tx_internal_error',
        ];
        const errorMessage = error?.message?.toLowerCase() || '';
        return !nonRetryableErrors.some(nonRetryableError => errorMessage.includes(nonRetryableError));
    }
    getBaseDelay(priority) {
        switch (priority) {
            case transaction_status_entity_1.TransactionPriority.CRITICAL:
                return 1000;
            case transaction_status_entity_1.TransactionPriority.HIGH:
                return 2000;
            case transaction_status_entity_1.TransactionPriority.MEDIUM:
                return 5000;
            case transaction_status_entity_1.TransactionPriority.LOW:
                return 10000;
            default:
                return 5000;
        }
    }
}
exports.ExponentialBackoffStrategy = ExponentialBackoffStrategy;
class LinearBackoffStrategy {
    calculateDelay(attempt, priority) {
        const baseDelay = this.getBaseDelay(priority);
        return baseDelay * attempt;
    }
    shouldRetry(error, attempt, maxRetries) {
        return attempt < maxRetries && this.isTransientError(error);
    }
    isTransientError(error) {
        const transientErrors = [
            'timeout',
            'network',
            'connection',
            'rate_limit',
            'server_error',
        ];
        const errorMessage = error?.message?.toLowerCase() || '';
        return transientErrors.some(transientError => errorMessage.includes(transientError));
    }
    getBaseDelay(priority) {
        switch (priority) {
            case transaction_status_entity_1.TransactionPriority.CRITICAL:
                return 500;
            case transaction_status_entity_1.TransactionPriority.HIGH:
                return 1000;
            case transaction_status_entity_1.TransactionPriority.MEDIUM:
                return 2000;
            case transaction_status_entity_1.TransactionPriority.LOW:
                return 5000;
            default:
                return 2000;
        }
    }
}
exports.LinearBackoffStrategy = LinearBackoffStrategy;
let RetryService = RetryService_1 = class RetryService {
    constructor(transactionStatusRepository) {
        this.transactionStatusRepository = transactionStatusRepository;
        this.logger = new common_1.Logger(RetryService_1.name);
        this.retryQueue = new Map();
        this.activeRetries = new Set();
        this.strategies = new Map();
        this.strategies.set('exponential', new ExponentialBackoffStrategy());
        this.strategies.set('linear', new LinearBackoffStrategy());
        this.strategies.set('default', new ExponentialBackoffStrategy());
    }
    async scheduleRetry(transaction, strategy = 'exponential') {
        if (this.activeRetries.has(transaction.transactionHash)) {
            this.logger.warn(`Retry already in progress for transaction ${transaction.transactionHash}`);
            return;
        }
        const retryStrategy = this.strategies.get(strategy) || this.strategies.get('default');
        if (!retryStrategy.shouldRetry({ message: transaction.errorMessage }, transaction.retryCount, transaction.maxRetries)) {
            this.logger.log(`Transaction ${transaction.transactionHash} should not be retried`);
            return;
        }
        const delay = retryStrategy.calculateDelay(transaction.retryCount + 1, transaction.priority);
        this.activeRetries.add(transaction.transactionHash);
        const retryTimeout = setTimeout(async () => {
            try {
                await this.executeRetry(transaction);
            }
            catch (error) {
                this.logger.error(`Retry failed for transaction ${transaction.transactionHash}:`, error);
            }
            finally {
                this.activeRetries.delete(transaction.transactionHash);
                this.retryQueue.delete(transaction.transactionHash);
            }
        }, delay);
        this.retryQueue.set(transaction.transactionHash, retryTimeout);
        await this.updateTransactionForRetry(transaction);
        this.logger.log(`Scheduled retry for transaction ${transaction.transactionHash} in ${delay}ms (attempt ${transaction.retryCount + 1}/${transaction.maxRetries})`);
    }
    async manualRetry(retryDto) {
        const transaction = await this.transactionStatusRepository.findOne({
            where: { id: retryDto.transactionId },
        });
        if (!transaction) {
            throw new Error(`Transaction with ID ${retryDto.transactionId} not found`);
        }
        if (transaction.status !== transaction_status_entity_1.TransactionStatus.FAILED && transaction.status !== transaction_status_entity_1.TransactionStatus.TIMEOUT) {
            throw new Error(`Cannot retry transaction with status ${transaction.status}`);
        }
        if (retryDto.priority) {
            transaction.priority = retryDto.priority;
        }
        if (retryDto.maxRetries) {
            transaction.maxRetries = retryDto.maxRetries;
        }
        await this.cancelRetry(transaction.transactionHash);
        await this.scheduleRetry(transaction);
        return transaction;
    }
    async executeRetry(transaction) {
        this.logger.log(`Executing retry for transaction ${transaction.transactionHash}`);
        try {
            const transactionStatus = await this.checkTransactionOnNetwork(transaction.transactionHash);
            if (transactionStatus.successful) {
                await this.transactionStatusRepository.update({ transactionHash: transaction.transactionHash }, {
                    status: transaction_status_entity_1.TransactionStatus.CONFIRMED,
                    confirmedAt: new Date(),
                    ledgerSequence: transactionStatus.ledger,
                    errorMessage: undefined,
                });
                this.logger.log(`Transaction ${transaction.transactionHash} was confirmed during retry check`);
                return;
            }
            if (!transactionStatus.successful) {
                throw new Error(`Transaction failed on network: ${transactionStatus.result_xdr}`);
            }
        }
        catch (error) {
            const retryStrategy = this.strategies.get('exponential');
            transaction.retryCount++;
            transaction.errorMessage = error.message;
            transaction.lastRetryAt = new Date();
            if (transaction.retryCount >= transaction.maxRetries) {
                transaction.status = transaction_status_entity_1.TransactionStatus.FAILED;
                await this.transactionStatusRepository.save(transaction);
                this.logger.error(`Transaction ${transaction.transactionHash} failed after ${transaction.maxRetries} retries`);
                throw new Error(`Transaction failed after maximum retries: ${error.message}`);
            }
            if (retryStrategy.shouldRetry(error, transaction.retryCount, transaction.maxRetries)) {
                transaction.status = transaction_status_entity_1.TransactionStatus.RETRYING;
                await this.transactionStatusRepository.save(transaction);
                await this.scheduleRetry(transaction);
            }
            else {
                transaction.status = transaction_status_entity_1.TransactionStatus.FAILED;
                await this.transactionStatusRepository.save(transaction);
                this.logger.error(`Transaction ${transaction.transactionHash} marked as failed due to non-retryable error: ${error.message}`);
                throw new Error(`Non-retryable error: ${error.message}`);
            }
        }
    }
    async checkTransactionOnNetwork(transactionHash) {
        const StellarSdk = require('stellar-sdk');
        const server = new StellarSdk.Horizon.Server(process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org');
        try {
            return await server.transactions().transaction(transactionHash).call();
        }
        catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Transaction not found on network');
            }
            throw error;
        }
    }
    async updateTransactionForRetry(transaction) {
        await this.transactionStatusRepository.update({ transactionHash: transaction.transactionHash }, {
            status: transaction_status_entity_1.TransactionStatus.RETRYING,
            retryCount: transaction.retryCount + 1,
            lastRetryAt: new Date(),
        });
    }
    async cancelRetry(transactionHash) {
        const retryTimeout = this.retryQueue.get(transactionHash);
        if (retryTimeout) {
            clearTimeout(retryTimeout);
            this.retryQueue.delete(transactionHash);
            this.activeRetries.delete(transactionHash);
            await this.transactionStatusRepository.update({ transactionHash }, { status: transaction_status_entity_1.TransactionStatus.FAILED });
            this.logger.log(`Cancelled retry for transaction ${transactionHash}`);
        }
    }
    async cancelAllRetries() {
        const retryHashes = Array.from(this.retryQueue.keys());
        for (const hash of retryHashes) {
            await this.cancelRetry(hash);
        }
        this.logger.log(`Cancelled ${retryHashes.length} pending retries`);
    }
    getRetryStats() {
        return {
            activeRetries: this.activeRetries.size,
            queuedRetries: this.retryQueue.size,
            retryStrategies: Array.from(this.strategies.keys()),
        };
    }
    async getRetryHistory(transactionHash) {
        const transaction = await this.transactionStatusRepository.findOne({
            where: { transactionHash },
        });
        if (!transaction) {
            throw new Error(`Transaction ${transactionHash} not found`);
        }
        const retryHistory = [];
        for (let i = 1; i <= transaction.retryCount; i++) {
            const strategy = this.strategies.get('exponential');
            const delay = strategy.calculateDelay(i, transaction.priority);
            retryHistory.push({
                attempt: i,
                timestamp: new Date(transaction.createdAt.getTime() + delay * i),
                delay,
            });
        }
        return {
            transactionHash: transaction.transactionHash,
            retryCount: transaction.retryCount,
            maxRetries: transaction.maxRetries,
            lastRetryAt: transaction.lastRetryAt,
            retryHistory,
        };
    }
    async prioritizeRetries() {
        const retryingTransactions = await this.transactionStatusRepository.find({
            where: { status: transaction_status_entity_1.TransactionStatus.RETRYING },
            order: [
                { priority: 'DESC' },
                { lastRetryAt: 'ASC' },
            ],
        });
        for (const transaction of retryingTransactions) {
            if (!this.activeRetries.has(transaction.transactionHash)) {
                await this.scheduleRetry(transaction, 'exponential');
            }
        }
        this.logger.log(`Reprioritized ${retryingTransactions.length} retrying transactions`);
    }
    registerRetryStrategy(name, strategy) {
        this.strategies.set(name, strategy);
        this.logger.log(`Registered retry strategy: ${name}`);
    }
    getRetryStrategy(name) {
        return this.strategies.get(name);
    }
    async onModuleDestroy() {
        await this.cancelAllRetries();
    }
};
exports.RetryService = RetryService;
exports.RetryService = RetryService = RetryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(transaction_status_entity_1.TransactionStatusEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], RetryService);
//# sourceMappingURL=retry.service.js.map