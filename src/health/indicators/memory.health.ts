import { Injectable } from '@nestjs/common';
import * as os from 'os';

export interface MemoryHealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  error?: string;
}

export interface MemoryHealthDetails {
  memory: {
    used: number;
    total: number;
    percentage: number;
    free: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  };
  system: {
    total: number;
    free: number;
    used: number;
    percentage: number;
  };
  process: {
    pid: number;
    uptime: number;
    cpuUsage: {
      user: number;
      system: number;
    };
  };
}

@Injectable()
export class MemoryHealthIndicator {
  private readonly MEMORY_THRESHOLD = 90; // 90% memory usage threshold

  async checkMemory(): Promise<MemoryHealthCheck> {
    try {
      const memoryUsage = await this.getMemoryUsage();
      
      return {
        status: memoryUsage.percentage < this.MEMORY_THRESHOLD ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        memory: memoryUsage,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        memory: {
          used: 0,
          total: 0,
          percentage: 0,
        },
        error: error.message,
      };
    }
  }

  async checkMemoryDetailed(): Promise<{ check: MemoryHealthCheck; details: MemoryHealthDetails }> {
    try {
      const memoryUsage = await this.getMemoryUsage();
      const details = await this.getMemoryDetails();

      const check: MemoryHealthCheck = {
        status: memoryUsage.percentage < this.MEMORY_THRESHOLD ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        memory: memoryUsage,
      };

      return { check, details };
    } catch (error) {
      const check: MemoryHealthCheck = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        memory: {
          used: 0,
          total: 0,
          percentage: 0,
        },
        error: error.message,
      };

      const details: MemoryHealthDetails = {
        memory: {
          used: 0,
          total: 0,
          percentage: 0,
          free: 0,
          heapUsed: 0,
          heapTotal: 0,
          external: 0,
          arrayBuffers: 0,
        },
        system: {
          total: 0,
          free: 0,
          used: 0,
          percentage: 0,
        },
        process: {
          pid: process.pid,
          uptime: process.uptime(),
          cpuUsage: {
            user: 0,
            system: 0,
          },
        },
      };

      return { check, details };
    }
  }

  async getMemoryUsage(): Promise<{ used: number; total: number; percentage: number }> {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    const percentage = (usedMemory / totalMemory) * 100;

    return {
      used: usedMemory,
      total: totalMemory,
      percentage: Math.round(percentage * 100) / 100,
    };
  }

  async getCpuUsage(): Promise<{ usage: number }> {
    const startUsage = process.cpuUsage();
    const startTime = process.hrtime();

    // Wait for a short period to measure CPU usage
    await new Promise(resolve => setTimeout(resolve, 100));

    const endUsage = process.cpuUsage(startUsage);
    const endTime = process.hrtime(startTime);
    
    const totalTime = endTime[0] * 1000000 + endTime[1] / 1000; // Convert to microseconds
    const cpuTime = endUsage.user + endUsage.system;
    const usage = (cpuTime / totalTime) * 100;

    return {
      usage: Math.max(0, Math.min(100, Math.round(usage * 100) / 100)),
    };
  }

  private async getMemoryDetails(): Promise<MemoryHealthDetails> {
    const memUsage = process.memoryUsage();
    const totalSysMem = os.totalmem();
    const freeSysMem = os.freemem();
    const usedSysMem = totalSysMem - freeSysMem;

    return {
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        free: memUsage.heapTotal - memUsage.heapUsed,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers,
      },
      system: {
        total: totalSysMem,
        free: freeSysMem,
        used: usedSysMem,
        percentage: (usedSysMem / totalSysMem) * 100,
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        cpuUsage: process.cpuUsage(),
      },
    };
  }
}
