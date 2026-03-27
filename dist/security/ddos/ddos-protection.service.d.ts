import { ThrottlerOptionsFactory, ThrottlerModuleOptions } from '@nestjs/throttler';
export declare class DdosProtectionService implements ThrottlerOptionsFactory {
    private readonly logger;
    createThrottlerOptions(): ThrottlerModuleOptions;
    logBlockedRequest(ip: string, reason: string): void;
}
