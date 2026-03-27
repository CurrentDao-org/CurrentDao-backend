import { OnModuleInit } from '@nestjs/common';
export declare class PerformanceAnalyticsService implements OnModuleInit {
    private readonly logger;
    private historicalMetrics;
    private readonly MAX_HISTORY;
    onModuleInit(): void;
    private startAnalyticsCollection;
    private samplePerformance;
    getTrendAnalysis(): {
        isRising: boolean;
        isFalling: boolean;
        stabilityScore: number;
        predictedLoad: number;
    };
    getSLAReport(): {
        target: number;
        actual: number;
        compliant: boolean;
        last_five_minutes_uptime: number;
        sla_status: string;
    };
    identifyBottlenecks(): {
        type: string;
        message: string;
        severity: string;
    };
}
