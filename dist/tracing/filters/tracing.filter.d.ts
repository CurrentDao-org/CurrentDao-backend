import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
export declare class TracingFilter implements ExceptionFilter {
    private readonly logger;
    catch(exception: unknown, host: ArgumentsHost): void;
}
