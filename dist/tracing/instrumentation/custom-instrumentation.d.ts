import { Tracer } from '@opentelemetry/api';
export declare class CustomInstrumentation {
    private readonly logger;
    private readonly tracer;
    constructor();
    instrument<T>(name: string, fn: () => Promise<T>): Promise<T>;
    getTracer(): Tracer;
}
export declare function Trace(spanName?: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
