import { Injectable } from '@nestjs/common';

export interface ResponseTimeMetrics {
  average: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
}

export interface ThroughputMetrics {
  requests: number;
  errors: number;
  rate: number;
  errorRate: number;
}

export interface ProfilingData {
  timestamp: string;
  duration: number;
  endpoints: EndpointProfile[];
  databaseQueries: DatabaseProfile[];
  memoryProfile: MemoryProfile;
  cpuProfile: CpuProfile;
}

export interface EndpointProfile {
  path: string;
  method: string;
  responseTime: number;
  status: number;
  count: number;
  errors: number;
}

export interface DatabaseProfile {
  query: string;
  duration: number;
  rows: number;
  index: string;
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
}

export interface MemoryProfile {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

export interface CpuProfile {
  user: number;
  system: number;
  idle: number;
}

@Injectable()
export class PerformanceProfilerService {
  private readonly profilingData: ProfilingData[] = [];
  private readonly endpointMetrics: Map<string, EndpointProfile[]> = new Map();
  private readonly queryMetrics: Map<string, DatabaseProfile[]> = new Map();

  async getProfilingData(durationMinutes: number): Promise<ProfilingData> {
    const cutoffTime = Date.now() - (durationMinutes * 60 * 1000);
    const recentData = this.profilingData.filter(d => 
      new Date(d.timestamp).getTime() >= cutoffTime
    );

    if (recentData.length === 0) {
      return this.generateMockProfilingData(durationMinutes);
    }

    return this.aggregateProfilingData(recentData);
  }

  async getResponseTimeMetrics(): Promise<ResponseTimeMetrics> {
    const allEndpoints: EndpointProfile[] = [];
    
    for (const profiles of this.endpointMetrics.values()) {
      allEndpoints.push(...profiles);
    }

    if (allEndpoints.length === 0) {
      return this.generateMockResponseTimeMetrics();
    }

    const responseTimes = allEndpoints.map(e => e.responseTime).sort((a, b) => a - b);
    
    return {
      average: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      p95: this.getPercentile(responseTimes, 95),
      p99: this.getPercentile(responseTimes, 99),
      min: responseTimes[0],
      max: responseTimes[responseTimes.length - 1],
    };
  }

  async getThroughputMetrics(): Promise<ThroughputMetrics> {
    const allEndpoints: EndpointProfile[] = [];
    
    for (const profiles of this.endpointMetrics.values()) {
      allEndpoints.push(...profiles);
    }

    if (allEndpoints.length === 0) {
      return this.generateMockThroughputMetrics();
    }

    const totalRequests = allEndpoints.reduce((sum, e) => sum + e.count, 0);
    const totalErrors = allEndpoints.reduce((sum, e) => sum + e.errors, 0);
    const timeWindow = 60; // 1 minute
    const rate = totalRequests / timeWindow;

    return {
      requests: totalRequests,
      errors: totalErrors,
      rate,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
    };
  }

  async identifySlowEndpoints(thresholdMs = 1000): Promise<EndpointProfile[]> {
    const slowEndpoints: EndpointProfile[] = [];

    for (const [endpoint, profiles] of this.endpointMetrics.entries()) {
      const slowProfiles = profiles.filter(p => p.responseTime > thresholdMs);
      slowEndpoints.push(...slowProfiles);
    }

    return slowEndpoints.sort((a, b) => b.responseTime - a.responseTime);
  }

  async identifySlowQueries(thresholdMs = 500): Promise<DatabaseProfile[]> {
    const slowQueries: DatabaseProfile[] = [];

    for (const [query, profiles] of this.queryMetrics.entries()) {
      const slowProfiles = profiles.filter(p => p.duration > thresholdMs);
      slowQueries.push(...slowProfiles);
    }

    return slowQueries.sort((a, b) => b.duration - a.duration);
  }

  recordEndpointMetrics(endpoint: string, method: string, responseTime: number, status: number): void {
    const key = `${method} ${endpoint}`;
    const existing = this.endpointMetrics.get(key) || [];
    
    const profile: EndpointProfile = {
      path: endpoint,
      method,
      responseTime,
      status,
      count: 1,
      errors: status >= 400 ? 1 : 0,
    };

    existing.push(profile);
    
    // Keep only last 1000 records per endpoint
    if (existing.length > 1000) {
      existing.splice(0, 100);
    }

    this.endpointMetrics.set(key, existing);
  }

  recordQueryMetrics(query: string, duration: number, rows: number, index: string, type: string): void {
    const existing = this.queryMetrics.get(query) || [];
    
    const profile: DatabaseProfile = {
      query,
      duration,
      rows,
      index,
      type: type as any,
    };

    existing.push(profile);
    
    // Keep only last 1000 records per query
    if (existing.length > 1000) {
      existing.splice(0, 100);
    }

    this.queryMetrics.set(query, existing);
  }

  private generateMockProfilingData(durationMinutes: number): ProfilingData {
    const endpoints: EndpointProfile[] = [
      { path: '/api/health', method: 'GET', responseTime: 45, status: 200, count: 100, errors: 0 },
      { path: '/api/forecasting/demand', method: 'GET', responseTime: 230, status: 200, count: 50, errors: 2 },
      { path: '/api/performance/metrics', method: 'GET', responseTime: 120, status: 200, count: 75, errors: 1 },
      { path: '/api/trading/signals', method: 'POST', responseTime: 450, status: 201, count: 25, errors: 0 },
    ];

    const queries: DatabaseProfile[] = [
      { query: 'SELECT * FROM forecasts', duration: 120, rows: 1000, index: 'idx_forecasts_timestamp', type: 'SELECT' },
      { query: 'INSERT INTO trading_signals', duration: 45, rows: 1, index: '', type: 'INSERT' },
      { query: 'UPDATE performance_metrics', duration: 85, rows: 500, index: 'idx_metrics_timestamp', type: 'UPDATE' },
    ];

    return {
      timestamp: new Date().toISOString(),
      duration: durationMinutes * 60,
      endpoints,
      databaseQueries: queries,
      memoryProfile: {
        heapUsed: 150000000,
        heapTotal: 250000000,
        external: 10000000,
        arrayBuffers: 5000000,
      },
      cpuProfile: {
        user: 25.5,
        system: 12.3,
        idle: 62.2,
      },
    };
  }

  private generateMockResponseTimeMetrics(): ResponseTimeMetrics {
    return {
      average: 150,
      p95: 800,
      p99: 1200,
      min: 25,
      max: 2500,
    };
  }

  private generateMockThroughputMetrics(): ThroughputMetrics {
    return {
      requests: 1250,
      errors: 15,
      rate: 20.8,
      errorRate: 1.2,
    };
  }

  private aggregateProfilingData(data: ProfilingData[]): ProfilingData {
    const allEndpoints: EndpointProfile[] = [];
    const allQueries: DatabaseProfile[] = [];
    
    data.forEach(d => {
      allEndpoints.push(...d.endpoints);
      allQueries.push(...d.databaseQueries);
    });

    return {
      timestamp: new Date().toISOString(),
      duration: data.reduce((sum, d) => sum + d.duration, 0),
      endpoints: this.aggregateEndpoints(allEndpoints),
      databaseQueries: this.aggregateQueries(allQueries),
      memoryProfile: data[data.length - 1]?.memoryProfile || this.getMemoryProfile(),
      cpuProfile: data[data.length - 1]?.cpuProfile || this.getCpuProfile(),
    };
  }

  private aggregateEndpoints(endpoints: EndpointProfile[]): EndpointProfile[] {
    const grouped = new Map<string, EndpointProfile>();

    endpoints.forEach(endpoint => {
      const key = `${endpoint.method} ${endpoint.path}`;
      const existing = grouped.get(key);
      
      if (existing) {
        existing.count += endpoint.count;
        existing.errors += endpoint.errors;
        existing.responseTime = (existing.responseTime + endpoint.responseTime) / 2;
      } else {
        grouped.set(key, { ...endpoint });
      }
    });

    return Array.from(grouped.values());
  }

  private aggregateQueries(queries: DatabaseProfile[]): DatabaseProfile[] {
    const grouped = new Map<string, DatabaseProfile>();

    queries.forEach(query => {
      const existing = grouped.get(query.query);
      
      if (existing) {
        existing.duration = (existing.duration + query.duration) / 2;
        existing.rows += query.rows;
      } else {
        grouped.set(query.query, { ...query });
      }
    });

    return Array.from(grouped.values());
  }

  private getPercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  private getMemoryProfile(): MemoryProfile {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
    };
  }

  private getCpuProfile(): CpuProfile {
    const usage = process.cpuUsage();
    return {
      user: usage.user / 1000000, // Convert to seconds
      system: usage.system / 1000000,
      idle: 0, // Would need more complex calculation
    };
  }
}
