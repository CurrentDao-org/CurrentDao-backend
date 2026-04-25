import { Injectable } from '@nestjs/common';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { StellarHealthIndicator } from './indicators/stellar.health';
import { MemoryHealthIndicator } from './indicators/memory.health';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks?: Record<string, any>;
  details?: Record<string, any>;
  metrics?: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
    responseTime: number;
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly databaseHealthIndicator: DatabaseHealthIndicator,
    private readonly stellarHealthIndicator: StellarHealthIndicator,
    private readonly memoryHealthIndicator: MemoryHealthIndicator,
  ) {}

  async checkBasicHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Basic health check - just verify the service is running
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        metrics: {
          memory: await this.memoryHealthIndicator.getMemoryUsage(),
          cpu: await this.memoryHealthIndicator.getCpuUsage(),
          responseTime,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        details: {
          error: error.message,
        },
      };
    }
  }

  async checkReadiness(): Promise<HealthStatus> {
    const startTime = Date.now();
    const checks: Record<string, any> = {};
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    try {
      // Database connectivity check
      const dbCheck = await this.databaseHealthIndicator.checkDatabase();
      checks.database = dbCheck;
      if (dbCheck.status !== 'healthy') {
        overallStatus = 'unhealthy';
      }

      // Stellar API connectivity check
      const stellarCheck = await this.stellarHealthIndicator.checkStellarApi();
      checks.stellar = stellarCheck;
      if (stellarCheck.status !== 'healthy') {
        overallStatus = overallStatus === 'healthy' ? 'degraded' : 'unhealthy';
      }

      // Memory check
      const memoryCheck = await this.memoryHealthIndicator.checkMemory();
      checks.memory = memoryCheck;
      if (memoryCheck.status !== 'healthy') {
        overallStatus = overallStatus === 'healthy' ? 'degraded' : 'unhealthy';
      }

      const responseTime = Date.now() - startTime;

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        checks,
        metrics: {
          memory: await this.memoryHealthIndicator.getMemoryUsage(),
          cpu: await this.memoryHealthIndicator.getCpuUsage(),
          responseTime,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        checks,
        details: {
          error: error.message,
        },
      };
    }
  }

  async checkLiveness(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Liveness check - just verify the service is responsive
      const responseTime = Date.now() - startTime;
      
      // If response time is too high, service might be hanging
      if (responseTime > 5000) { // 5 seconds threshold
        return {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          details: {
            error: 'Service response time too high',
            responseTime,
          },
        };
      }

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        metrics: {
          memory: await this.memoryHealthIndicator.getMemoryUsage(),
          cpu: await this.memoryHealthIndicator.getCpuUsage(),
          responseTime,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        details: {
          error: error.message,
        },
      };
    }
  }

  async getDetailedHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    const checks: Record<string, any> = {};
    const details: Record<string, any> = {};
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    try {
      // Database detailed check
      const dbCheck = await this.databaseHealthIndicator.checkDatabaseDetailed();
      checks.database = dbCheck.check;
      details.database = dbCheck.details;
      if (dbCheck.check.status !== 'healthy') {
        overallStatus = 'unhealthy';
      }

      // Stellar API detailed check
      const stellarCheck = await this.stellarHealthIndicator.checkStellarApiDetailed();
      checks.stellar = stellarCheck.check;
      details.stellar = stellarCheck.details;
      if (stellarCheck.check.status !== 'healthy') {
        overallStatus = overallStatus === 'healthy' ? 'degraded' : 'unhealthy';
      }

      // Memory detailed check
      const memoryCheck = await this.memoryHealthIndicator.checkMemoryDetailed();
      checks.memory = memoryCheck.check;
      details.memory = memoryCheck.details;
      if (memoryCheck.check.status !== 'healthy') {
        overallStatus = overallStatus === 'healthy' ? 'degraded' : 'unhealthy';
      }

      const responseTime = Date.now() - startTime;

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        checks,
        details,
        metrics: {
          memory: await this.memoryHealthIndicator.getMemoryUsage(),
          cpu: await this.memoryHealthIndicator.getCpuUsage(),
          responseTime,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        checks,
        details: {
          error: error.message,
        },
      };
    }
  }

  async getMetrics(): Promise<any> {
    try {
      return {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: await this.memoryHealthIndicator.getMemoryUsage(),
        cpu: await this.memoryHealthIndicator.getCpuUsage(),
        process: {
          pid: process.pid,
          version: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get metrics: ${error.message}`);
    }
  }
}
