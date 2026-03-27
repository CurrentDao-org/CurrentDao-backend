import { ExceptionFilter, ArgumentsHost, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class HttpExceptionFilter implements ExceptionFilter {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    catch(exception: HttpException, host: ArgumentsHost): void;
    private logError;
}
