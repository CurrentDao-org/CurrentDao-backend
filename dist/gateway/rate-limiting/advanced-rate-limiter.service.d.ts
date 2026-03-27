export declare class AdvancedRateLimiterService {
    private readonly logger;
    constructor();
    checkRateLimit(ip: string, userId?: string, limit?: number, ttl?: number): Promise<boolean>;
    getUsage(key: string): Promise<number>;
}
