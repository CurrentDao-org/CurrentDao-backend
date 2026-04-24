import otelSDK from './tracing/otel-sdk';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SecurityHeadersService } from './security/headers/security-headers.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Start the OpenTelemetry SDK
  await otelSDK.start();

  const app = await NestFactory.create(AppModule);

  // 1. Apply Security Headers (via Helmet)
  const securityHeadersService = app.get(SecurityHeadersService);
  app.use(securityHeadersService.getHelmetMiddleware());

  // 2. Global Validation (XSS/SQLi Prevention via Sanitization)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 3. Global Throttler Guard (DDoS Protection)
  app.useGlobalGuards(app.get(ThrottlerGuard));

  // 4. Global Response Interceptor
  app.useGlobalInterceptors(app.get(ResponseInterceptor));

  // 5. Global Exception Filter
  app.useGlobalFilters(app.get(HttpExceptionFilter));

  // 5. CORS configuration
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  });

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('CurrentDao Backend API')
      .setDescription('CurrentDao Energy Market Forecasting System API')
      .setVersion('1.0')
      .addTag('forecasting')
      .addTag('app')
      .addTag('health')
      .addTag('contracts')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`Server successfully started on port ${port}`);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`API documentation: http://localhost:${port}/api/docs`);
  logger.log(`API endpoint: http://localhost:${port}/api`);
}

bootstrap();
