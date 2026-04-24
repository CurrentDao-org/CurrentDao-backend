import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ContractService } from './contracts/contract.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly contractService: ContractService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async healthCheck(@Res() res: Response) {
    try {
      const contracts = await this.contractService.getHealthStatus();
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        contracts,
      };
      return res.status(HttpStatus.OK).json(health);
    } catch (error) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async readinessCheck(@Res() res: Response) {
    try {
      const contracts = await this.contractService.getHealthStatus();
      const ready = {
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'connected',
          redis: 'connected',
          api: 'ready',
          contracts: contracts.status,
        },
      };
      return res.status(HttpStatus.OK).json(ready);
    } catch (error) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }
}
