import { NestModule, MiddlewareConsumer } from '@nestjs/common';
export declare class SecurityModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void;
}
