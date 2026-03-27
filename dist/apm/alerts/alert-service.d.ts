import { OnModuleInit } from '@nestjs/common';
export declare class AlertService implements OnModuleInit {
    private readonly logger;
    private readonly CPU_THRESHOLD;
    private readonly MEMORY_THRESHOLD;
    onModuleInit(): void;
    private startAlertMonitoring;
    private checkSystemAlerts;
    emitAlert(level: 'INFO' | 'WARNING' | 'CRITICAL', message: string): void;
    private triggerNotifier;
}
