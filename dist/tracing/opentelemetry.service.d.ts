import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Span, SpanOptions } from '@opentelemetry/api';
export declare class OpenTelemetryService implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private readonly tracer;
    constructor();
    onModuleInit(): void;
    onModuleDestroy(): Promise<void>;
    startSpan(name: string, options?: SpanOptions): Span;
    withSpan<T>(name: string, callback: (span: Span) => Promise<T>): Promise<T>;
    injectContext(headers: Record<string, string>): void;
    extractContext(headers: Record<string, string>): import("@opentelemetry/api").Context;
}
