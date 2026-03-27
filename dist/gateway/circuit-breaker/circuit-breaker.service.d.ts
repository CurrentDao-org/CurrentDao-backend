export declare class CircuitBreakerService {
    private readonly logger;
    private state;
    private failureCount;
    private readonly threshold;
    private readonly timeout;
    checkCircuit(): Promise<void>;
    reportSuccess(): Promise<void>;
    reportFailure(): Promise<void>;
}
