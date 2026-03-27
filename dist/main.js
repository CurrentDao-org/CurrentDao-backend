"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const otel_sdk_1 = __importDefault(require("./tracing/otel-sdk"));
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const security_headers_service_1 = require("./security/headers/security-headers.service");
const throttler_1 = require("@nestjs/throttler");
const response_interceptor_1 = require("./common/interceptors/response.interceptor");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    await otel_sdk_1.default.start();
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const securityHeadersService = app.get(security_headers_service_1.SecurityHeadersService);
    app.use(securityHeadersService.getHelmetMiddleware());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.useGlobalGuards(app.get(throttler_1.ThrottlerGuard));
    app.useGlobalInterceptors(app.get(response_interceptor_1.ResponseInterceptor));
    app.useGlobalFilters(app.get(http_exception_filter_1.HttpExceptionFilter));
    app.enableCors({
        origin: process.env.ALLOWED_ORIGINS || '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        preflightContinue: false,
        optionsSuccessStatus: 204,
        credentials: true,
    });
    app.setGlobalPrefix('api');
    if (process.env.NODE_ENV !== 'production') {
        const config = new swagger_1.DocumentBuilder()
            .setTitle('CurrentDao Backend API')
            .setDescription('CurrentDao Energy Market Forecasting System API')
            .setVersion('1.0')
            .addTag('forecasting')
            .addTag('app')
            .addTag('health')
            .addTag('contracts')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('api/docs', app, document);
    }
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    logger.log(`Application is running on: http://localhost:${port}`);
    logger.log(`API documentation: http://localhost:${port}/api/docs`);
    logger.log(`API endpoint: http://localhost:${port}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map