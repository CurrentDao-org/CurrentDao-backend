import { OnModuleInit } from '@nestjs/common';
export declare class ShardHealthService implements OnModuleInit {
    private readonly logger;
    private lastHealthCheck;
    onModuleInit(): void;
    private startHealthMonitoring;
    private checkAllShards;
    private triggerRecovery;
    getHealthStatus(): {
        status: string;
        shards_count: number;
        last_check: Date;
        avg_latency: string;
        unhealthy_shards: number;
    };
}
