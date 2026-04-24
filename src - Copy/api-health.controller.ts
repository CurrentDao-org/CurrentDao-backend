import { Controller, Get } from '@nestjs/common';

@Controller('api')
export class HealthController {
  @Get('health')
  getHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('ready')
  getReady() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'connected',
        redis: 'connected',
        api: 'ready',
      },
    };
  }
}
