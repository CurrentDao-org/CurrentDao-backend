export declare class HealthController {
    getHealth(): {
        status: string;
        timestamp: string;
        uptime: number;
        version: string;
        environment: string;
    };
    getReady(): {
        status: string;
        timestamp: string;
        checks: {
            database: string;
            redis: string;
            api: string;
        };
    };
}
