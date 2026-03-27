export declare class SecurityHeadersService {
    private readonly logger;
    getHelmetMiddleware(): (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
}
