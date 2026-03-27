export declare class TraceAnalyticsService {
    private readonly logger;
    private readonly meter;
    private readonly requestCounter;
    private readonly requestDuration;
    private readonly errorCounter;
    constructor();
    trackRequest(labels: {
        method: string;
        path: string;
        status: number;
    }, durationMs: number): void;
    getHealthReport(): {
        status: string;
        active_meter: string;
    };
}
