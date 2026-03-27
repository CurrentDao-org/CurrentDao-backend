export declare class SecurityMonitorService {
    private readonly logger;
    logSecurityEvent(event: {
        type: string;
        ip: string;
        method: string;
        url: string;
        reason?: string;
    }): void;
    private sendAlert;
    getSecurityStatus(): {
        status: string;
        waf: string;
        headers: string;
        ddos: string;
    };
}
