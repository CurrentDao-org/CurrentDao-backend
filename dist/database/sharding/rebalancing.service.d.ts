import { ShardRouterService } from './shard-router.service';
export declare class RebalancingService {
    private readonly router;
    private readonly logger;
    private isRebalancingInProgress;
    constructor(router: ShardRouterService);
    runRebalancing(): Promise<{
        moved_records: number;
        variance_reduction: number;
        duration_ms: number;
    } | {
        status: string;
    }>;
    checkSkewness(threshold?: number): Promise<{
        skew: number;
        suggestRebalance: boolean;
    }>;
}
