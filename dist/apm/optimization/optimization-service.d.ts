import { PerformanceAnalyticsService } from '../analytics/performance-analytics.service';
export declare class OptimizationService {
    private readonly analytics;
    private readonly logger;
    private lastOptimizationDate;
    constructor(analytics: PerformanceAnalyticsService);
    runAutomatedOptimization(): Promise<{
        status: string;
        date: Date;
        recommendation: string;
    }>;
    getRecommendations(): {
        id: string;
        title: string;
        description: string;
        priority: string;
    }[];
}
