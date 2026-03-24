import otelSDK from './tracing/otel-sdk';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SecurityHeadersService } from './security/headers/security-headers.service';
import { ValidationPipe } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

async function bootstrap() {
  // Start the OpenTelemetry SDK
  await otelSDK.start();

  const app = await NestFactory.create(AppModule);

  // 1. Apply Security Headers (via Helmet)
  const securityHeadersService = app.get(SecurityHeadersService);
  app.use(securityHeadersService.getHelmetMiddleware());

  // 2. Global Validation (XSS/SQLi Prevention via Sanitization)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // 3. Global Throttler Guard (DDoS Protection)
  app.useGlobalGuards(app.get(ThrottlerGuard));

  // 4. CORS configuration
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
  
  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });
  
  // API prefix
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`API available at: http://localhost:${port}/api`);
}
bootstrap();
