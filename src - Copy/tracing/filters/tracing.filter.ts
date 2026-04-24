import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { trace, context } from '@opentelemetry/api';

@Catch()
export class TracingFilter implements ExceptionFilter {
  private readonly logger = new Logger(TracingFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = (exception as any).message || 'Internal server error';
    const traceId = trace.getSpan(context.active())?.spanContext().traceId;

    this.logger.error(
      `Error on ${request.method} ${request.url}: ${message}`,
      (exception as any).stack,
    );
    this.logger.debug(`Error correlation traceId: ${traceId}`);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      traceId, // Return traceId for easier log correlation
    });
  }
}
