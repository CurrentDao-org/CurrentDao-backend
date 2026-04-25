import { Injectable } from '@nestjs/common';

export interface CpuMetrics {
  usage: number;
  cores: number;
  loadAverage: number[];
  frequency: number;
}

export interface MemoryMetrics {
  used: number;
  total: number;
  percentage: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
}

export interface NetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  connections: number;
  packetsIn: number;
  packetsOut: number;
}

export interface DiskMetrics {
  used: number;
  total: number;
  percentage: number;
  iops: number;
  readThroughput: number;
  writeThroughput: number;
}

@Injectable()
export class ResourceManagerService {
  async getCpuMetrics(): Promise<CpuMetrics> {
    const cpus = require('os').cpus();
    const loadAvg = require('os').loadavg();
    
    return {
      usage: this.calculateCpuUsage(),
      cores: cpus.length,
      loadAverage: loadAvg,
      frequency: cpus[0]?.speed || 0,
    };
  }

  async getMemoryMetrics(): Promise<MemoryMetrics> {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const freeMem = require('os').freemem();
    const usedMem = totalMem - freeMem;

    return {
      used: usedMem,
      total: totalMem,
      percentage: (usedMem / totalMem) * 100,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
    };
  }

  async getNetworkMetrics(): Promise<NetworkMetrics> {
    // Simulate network metrics
    return {
      bytesIn: Math.random() * 1000000,
      bytesOut: Math.random() * 1000000,
      connections: Math.floor(Math.random() * 1000),
      packetsIn: Math.floor(Math.random() * 10000),
      packetsOut: Math.floor(Math.random() * 10000),
    };
  }

  async getDiskMetrics(): Promise<DiskMetrics> {
    // Simulate disk metrics
    const total = 1000000000000; // 1TB
    const used = total * (0.3 + Math.random() * 0.4); // 30-70% used

    return {
      used,
      total,
      percentage: (used / total) * 100,
      iops: Math.floor(Math.random() * 10000),
      readThroughput: Math.random() * 100000000, // bytes/sec
      writeThroughput: Math.random() * 100000000, // bytes/sec
    };
  }

  private calculateCpuUsage(): number {
    const startUsage = process.cpuUsage();
    const startTime = process.hrtime();

    // Wait for a short period to measure CPU usage
    setTimeout(() => {}, 100);

    const endUsage = process.cpuUsage(startUsage);
    const endTime = process.hrtime(startTime);
    
    const totalTime = endTime[0] * 1000000 + endTime[1] / 1000; // microseconds
    const cpuTime = endUsage.user + endUsage.system;
    const usage = (cpuTime / totalTime) * 100;

    return Math.max(0, Math.min(100, usage));
  }
}
