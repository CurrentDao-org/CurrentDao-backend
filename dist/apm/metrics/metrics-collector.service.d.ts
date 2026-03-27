import { OnModuleInit } from '@nestjs/common';
export declare class MetricsCollectorService implements OnModuleInit {
    private readonly logger;
    private readonly meter;
    private readonly cpuUsageGauge;
    private readonly memoryUsageGauge;
    private readonly activeHandlesGauge;
    private readonly eventLoopDelayGauge;
    private readonly totalRequests;
    constructor();
    onModuleInit(): void;
    private startCollection;
    trackBusinessMetric(name: string, value?: number): void;
}
