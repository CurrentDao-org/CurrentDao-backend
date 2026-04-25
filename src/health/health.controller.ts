import { Controller, Get, HttpStatus, Res, HttpCode } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthStatus } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async healthCheck(@Res() res: Response) {
    try {
      const health = await this.healthService.checkBasicHealth();
      const statusCode = health.status === 'healthy' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
      return res.status(statusCode).json(health);
    } catch (error) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check endpoint - checks all dependencies' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async readinessCheck(@Res() res: Response) {
    try {
      const ready = await this.healthService.checkReadiness();
      const statusCode = ready.status === 'healthy' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
      return res.status(statusCode).json(ready);
    } catch (error) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe endpoint' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  @ApiResponse({ status: 503, description: 'Service is not alive' })
  async livenessCheck(@Res() res: Response) {
    try {
      const live = await this.healthService.checkLiveness();
      const statusCode = live.status === 'healthy' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
      return res.status(statusCode).json(live);
    } catch (error) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'not alive',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health status with all dependencies' })
  @ApiResponse({ status: 200, description: 'Detailed health information' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async detailedHealthCheck(@Res() res: Response) {
    try {
      const health = await this.healthService.getDetailedHealth();
      const statusCode = health.status === 'healthy' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
      return res.status(statusCode).json(health);
    } catch (error) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Metrics endpoint for monitoring' })
  @ApiResponse({ status: 200, description: 'System metrics' })
  @HttpCode(HttpStatus.OK)
  async getMetrics(@Res() res: Response) {
    try {
      const metrics = await this.healthService.getMetrics();
      return res.status(HttpStatus.OK).json(metrics);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }
}
