import { TransactionMonitorService } from './transaction-monitor.service';
import { CreateTransactionStatusDto, TransactionStatusQueryDto } from './dto/transaction-status.dto';
export declare class MonitoringController {
    private readonly transactionMonitorService;
    constructor(transactionMonitorService: TransactionMonitorService);
    createTransaction(createDto: CreateTransactionStatusDto): Promise<import("./entities/transaction-status.entity").TransactionStatusEntity>;
    getTransaction(hash: string): Promise<import("./entities/transaction-status.entity").TransactionStatusEntity>;
    getTransactions(query: TransactionStatusQueryDto): Promise<{
        transactions: import("./entities/transaction-status.entity").TransactionStatusEntity[];
        total: number;
    }>;
    getAnalytics(timeRange?: 'hour' | 'day' | 'week' | 'month'): Promise<import("./dto/transaction-status.dto").TransactionAnalyticsDto>;
    getMonitoringStats(): Promise<{
        activeMonitors: number;
        totalTransactions: number;
        pendingTransactions: number;
    }>;
}
