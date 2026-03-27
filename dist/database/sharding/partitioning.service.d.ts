import { OnModuleInit } from '@nestjs/common';
export declare class PartitioningService implements OnModuleInit {
    private readonly logger;
    onModuleInit(): void;
    private startPartitioningManager;
    private maintainPartitions;
    getPartitionStats(tableName: string): Promise<{
        table: string;
        count: number;
        strategy: string;
        avg_size_per_partition: string;
        query_performance_gain: string;
    }>;
    createPartitionRange(tableName: string, from: Date, to: Date): Promise<boolean>;
}
