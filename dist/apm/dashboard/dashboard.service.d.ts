import { MetricsCollectorService } from '../metrics/metrics-collector.service';
export declare class DashboardService {
    private readonly metrics;
    private readonly logger;
    constructor(metrics: MetricsCollectorService);
    getDashboardState(): {
        timestamp: string;
        system: {
            platform: NodeJS.Platform;
            uptime: number;
            loadavg: number[];
            total_memory: number;
            free_memory: number;
            cpus: number;
        };
        process: {
            pid: number;
            uptime: number;
            memory: {
                rss: number;
                heapTotal: number;
                heapUsed: number;
                external: number;
                arrayBuffers: number;
            };
            cpu: NodeJS.CpuUsage;
        };
        health: {
            status: string;
            checks: number;
            errors_last_hour: number;
        };
    };
    streamDashboardUpdates(callback: (data: any) => void): Promise<void>;
}
