import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorHandlingService } from '../error-handling.service';
import { ErrorMonitorService } from '../monitors/error-monitor.service';
import { ApiErrorResponse } from '../../common/interfaces/response.interface';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(
    private readonly errorHandlingService: ErrorHandlingService,
    private readonly errorMonitorService: ErrorMonitorService,
  ) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = await this.errorHandlingService.handleError(exception, request);
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (this.errorMonitorService.predictFailure()) {
      this.logger.warn('Predicted failure pattern detected, triggering fallback alert.');
    }

    response.setHeader('X-Request-Id', request.headers['x-request-id'] as string || 'unknown');
    response.status(status).json(errorResponse);
  }
}
