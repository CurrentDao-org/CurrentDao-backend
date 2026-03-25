import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const isDevelopment = this.configService.get('NODE_ENV') === 'development';

    let errorResponse: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: exception.message || 'Internal server error',
    };

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      errorResponse = {
        ...errorResponse,
        ...exceptionResponse,
      };
    }

    if (exceptionResponse.details && Array.isArray(exceptionResponse.details)) {
      errorResponse.details = exceptionResponse.details.map((detail: any) => ({
        field: detail.property || detail.field,
        message: detail.constraints ? Object.values(detail.constraints).join(', ') : detail.message,
        value: detail.value,
      }));
    }

    if (isDevelopment) {
      errorResponse.stack = exception.stack;
      errorResponse.exception = {
        name: exception.constructor.name,
        message: exception.message,
      };
    }

    this.logError(exception, request, errorResponse);

    response.status(status).json(errorResponse);
  }

  private logError(exception: HttpException, request: Request, errorResponse: any) {
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'Unknown';
    const userId = (request as any).user?.id || 'Anonymous';

    const logData = {
      method,
      url,
      ip,
      userAgent,
      userId,
      statusCode: exception.getStatus(),
      message: exception.message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (exception.getStatus() >= 500) {
      this.logger.error(
        `Server Error: ${method} ${url}`,
        {
          ...logData,
          stack: exception.stack,
          response: errorResponse,
        },
      );
    } else if (exception.getStatus() >= 400) {
      this.logger.warn(
        `Client Error: ${method} ${url}`,
        {
          ...logData,
          response: errorResponse,
        },
      );
    } else {
      this.logger.log(
        `HTTP Exception: ${method} ${url}`,
        {
          ...logData,
          response: errorResponse,
        },
      );
    }
  }
}
