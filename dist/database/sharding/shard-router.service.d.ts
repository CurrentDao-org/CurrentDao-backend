import { OnModuleInit } from '@nestjs/common';
interface ShardNode {
    shard_id: number;
    host: string;
    port: number;
    database: string;
}
export declare class ShardRouterService implements OnModuleInit {
    private readonly logger;
    private nodes;
    onModuleInit(): void;
    private loadConfig;
    getShardNode(key: string): ShardNode | null;
    executeCrossShardQuery<T>(query: string): Promise<T[]>;
    private queryOnShard;
}
export {};
