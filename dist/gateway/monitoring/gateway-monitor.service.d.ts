export declare class GatewayMonitorService {
    private readonly logger;
    private readonly registry;
    private readonly requestCounter;
    private readonly responseTimeHistogram;
    constructor();
    logRequest(method: string, path: string, status: number, duration: number): void;
    getMetrics(): Promise<string>;
}
