export declare class GatewayAuthService {
    private readonly logger;
    validateRequest(token: string): Promise<boolean>;
    generateApiKey(userId: string): Promise<string>;
}
