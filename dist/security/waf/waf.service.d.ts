import { OnModuleInit } from '@nestjs/common';
export declare class WafService implements OnModuleInit {
    private readonly logger;
    private config;
    private readonly ruleCache;
    onModuleInit(): void;
    private loadRules;
    isRequestSafe(url: string, body: any, query: any): {
        safe: boolean;
        reason?: string;
    };
}
