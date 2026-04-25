import { Injectable } from '@nestjs/common';

export interface DatabaseMetrics {
  averageQueryTime: number;
  slowQueries: number;
  totalQueries: number;
  indexUsage: number;
  connectionPool: {
    active: number;
    idle: number;
    total: number;
  };
}

export interface QueryPerformance {
  query: string;
  executionTime: number;
  rowsReturned: number;
  indexUsed: string;
  recommendations: string[];
  optimizedQuery?: string;
}

export interface OptimizationResult {
  query: string;
  originalTime: number;
  optimizedTime: number;
  improvement: number;
  appliedOptimizations: string[];
  success: boolean;
}

@Injectable()
export class QueryOptimizerService {
  private readonly queryHistory: QueryPerformance[] = [];
  private readonly optimizationResults: OptimizationResult[] = [];

  async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    // Simulate database metrics
    return {
      averageQueryTime: 150 + Math.random() * 350, // 150-500ms
      slowQueries: Math.floor(Math.random() * 50),
      totalQueries: Math.floor(Math.random() * 10000) + 1000,
      indexUsage: 0.75 + Math.random() * 0.2, // 75-95%
      connectionPool: {
        active: Math.floor(Math.random() * 20) + 5,
        idle: Math.floor(Math.random() * 30) + 10,
        total: Math.floor(Math.random() * 50) + 20,
      },
    };
  }

  async getQueryPerformance(limit: number): Promise<QueryPerformance[]> {
    if (this.queryHistory.length === 0) {
      return this.generateMockQueryPerformance(limit);
    }

    return this.queryHistory
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }

  async optimizeQueries(queries?: string[], force = false): Promise<OptimizationResult[]> {
    const targetQueries = queries || await this.getSlowQueries();
    const results: OptimizationResult[] = [];

    for (const query of targetQueries) {
      const result = await this.optimizeSingleQuery(query, force);
      results.push(result);
    }

    this.optimizationResults.push(...results);
    return results;
  }

  async analyzeQuery(query: string): Promise<QueryPerformance> {
    const executionTime = this.simulateQueryExecution(query);
    const recommendations = this.generateRecommendations(query, executionTime);
    
    const performance: QueryPerformance = {
      query,
      executionTime,
      rowsReturned: Math.floor(Math.random() * 10000),
      indexUsed: this.detectIndexUsage(query),
      recommendations,
    };

    this.queryHistory.push(performance);
    return performance;
  }

  async getIndexRecommendations(): Promise<any> {
    const slowQueries = await this.getSlowQueries();
    const indexRecommendations: any[] = [];

    slowQueries.forEach(query => {
      const recommendations = this.analyzeIndexNeeds(query);
      indexRecommendations.push(...recommendations);
    });

    return {
      timestamp: new Date().toISOString(),
      recommendations: indexRecommendations,
      totalRecommendations: indexRecommendations.length,
      estimatedImprovement: this.calculateIndexImprovement(indexRecommendations),
    };
  }

  private async getSlowQueries(): Promise<string[]> {
    const slowQueries = this.queryHistory
      .filter(q => q.executionTime > 500) // > 500ms
      .map(q => q.query);

    if (slowQueries.length === 0) {
      return this.generateMockSlowQueries();
    }

    return slowQueries;
  }

  private async optimizeSingleQuery(query: string, force: boolean): Promise<OptimizationResult> {
    const originalTime = this.simulateQueryExecution(query);
    const optimizedQuery = this.generateOptimizedQuery(query);
    const optimizedTime = this.simulateQueryExecution(optimizedQuery);
    const improvement = ((originalTime - optimizedTime) / originalTime) * 100;

    return {
      query,
      originalTime,
      optimizedTime,
      improvement: Math.round(improvement * 100) / 100,
      appliedOptimizations: this.getAppliedOptimizations(query, optimizedQuery),
      success: improvement > 0 || force,
    };
  }

  private simulateQueryExecution(query: string): number {
    // Simulate query execution time based on query complexity
    const complexity = this.calculateQueryComplexity(query);
    const baseTime = 50; // 50ms base time
    return baseTime + (complexity * Math.random() * 1000);
  }

  private calculateQueryComplexity(query: string): number {
    let complexity = 1;

    // Add complexity for different operations
    if (query.toLowerCase().includes('join')) complexity += 2;
    if (query.toLowerCase().includes('subquery')) complexity += 3;
    if (query.toLowerCase().includes('group by')) complexity += 1.5;
    if (query.toLowerCase().includes('order by')) complexity += 1;
    if (query.toLowerCase().includes('where')) complexity += 0.5;
    if (query.toLowerCase().includes('having')) complexity += 1;

    return complexity;
  }

  private generateRecommendations(query: string, executionTime: number): string[] {
    const recommendations: string[] = [];

    if (executionTime > 1000) {
      recommendations.push('Consider adding indexes for frequently filtered columns');
    }

    if (!query.toLowerCase().includes('limit') && query.toLowerCase().includes('select')) {
      recommendations.push('Consider adding LIMIT clause for large result sets');
    }

    if (query.toLowerCase().includes('select *')) {
      recommendations.push('Avoid SELECT *, specify only needed columns');
    }

    if (query.toLowerCase().includes('join') && !query.toLowerCase().includes('using')) {
      recommendations.push('Ensure proper indexing on JOIN columns');
    }

    if (query.toLowerCase().includes('order by') && !query.toLowerCase().includes('index')) {
      recommendations.push('Consider adding index for ORDER BY columns');
    }

    return recommendations;
  }

  private detectIndexUsage(query: string): string {
    // Simulate index detection
    if (query.toLowerCase().includes('where id')) return 'PRIMARY';
    if (query.toLowerCase().includes('where created_at')) return 'idx_created_at';
    if (query.toLowerCase().includes('where status')) return 'idx_status';
    return 'NONE';
  }

  private generateOptimizedQuery(query: string): string {
    let optimized = query;

    // Basic optimizations
    if (optimized.includes('SELECT *')) {
      optimized = optimized.replace('SELECT *', 'SELECT id, name, created_at');
    }

    if (!optimized.includes('LIMIT') && optimized.includes('SELECT')) {
      optimized += ' LIMIT 1000';
    }

    // Add index hints (simulation)
    if (optimized.includes('WHERE id') && !optimized.includes('USE INDEX')) {
      optimized = optimized.replace('FROM', 'FROM `table` USE INDEX (PRIMARY)');
    }

    return optimized;
  }

  private getAppliedOptimizations(original: string, optimized: string): string[] {
    const optimizations: string[] = [];

    if (original !== optimized) {
      if (original.includes('SELECT *') && !optimized.includes('SELECT *')) {
        optimizations.push('Column selection optimization');
      }
      if (!original.includes('LIMIT') && optimized.includes('LIMIT')) {
        optimizations.push('Result set limiting');
      }
      if (optimized.includes('USE INDEX')) {
        optimizations.push('Index hint addition');
      }
    }

    return optimizations;
  }

  private analyzeIndexNeeds(query: string): any[] {
    const recommendations: any[] = [];

    // Analyze WHERE clauses for index opportunities
    if (query.toLowerCase().includes('where')) {
      const whereMatch = query.match(/where\s+(.+?)(?:\s+order\s+by|\s+group\s+by|\s+limit|$)/i);
      if (whereMatch) {
        const whereClause = whereMatch[1];
        const columns = this.extractColumns(whereClause);
        
        columns.forEach(column => {
          recommendations.push({
            type: 'index',
            table: 'table',
            column,
            reason: 'Frequently used in WHERE clause',
            estimatedImprovement: 40 + Math.random() * 30, // 40-70% improvement
          });
        });
      }
    }

    return recommendations;
  }

  private extractColumns(clause: string): string[] {
    const columns: string[] = [];
    const patterns = [
      /(\w+)\s*=/g,
      /(\w+)\s*>/g,
      /(\w+)\s*</g,
      /(\w+)\s+like/g,
      /(\w+)\s+in/g,
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(clause)) !== null) {
        columns.push(match[1]);
      }
    });

    return [...new Set(columns)];
  }

  private calculateIndexImprovement(recommendations: any[]): number {
    if (recommendations.length === 0) return 0;
    
    const totalImprovement = recommendations.reduce((sum, rec) => sum + rec.estimatedImprovement, 0);
    return Math.round(totalImprovement / recommendations.length);
  }

  private generateMockQueryPerformance(limit: number): QueryPerformance[] {
    const mockQueries: QueryPerformance[] = [
      {
        query: 'SELECT * FROM forecasts WHERE created_at > ?',
        executionTime: 850,
        rowsReturned: 5000,
        indexUsed: 'idx_created_at',
        recommendations: ['Avoid SELECT *, specify only needed columns', 'Add LIMIT clause'],
      },
      {
        query: 'SELECT u.*, f.* FROM users u JOIN forecasts f ON u.id = f.user_id',
        executionTime: 1200,
        rowsReturned: 2500,
        indexUsed: 'PRIMARY',
        recommendations: ['Ensure proper indexing on JOIN columns', 'Consider adding index for user_id'],
      },
      {
        query: 'SELECT COUNT(*) FROM trading_signals WHERE status = ? GROUP BY created_at',
        executionTime: 450,
        rowsReturned: 100,
        indexUsed: 'idx_status',
        recommendations: ['Consider adding composite index for (status, created_at)'],
      },
      {
        query: 'SELECT * FROM performance_metrics ORDER BY timestamp DESC LIMIT 100',
        executionTime: 180,
        rowsReturned: 100,
        indexUsed: 'idx_timestamp',
        recommendations: ['Optimal query structure'],
      },
    ];

    return mockQueries.slice(0, limit);
  }

  private generateMockSlowQueries(): string[] {
    return [
      'SELECT * FROM forecasts WHERE created_at > ?',
      'SELECT u.*, f.* FROM users u JOIN forecasts f ON u.id = f.user_id',
      'SELECT COUNT(*) FROM trading_signals WHERE status = ? GROUP BY created_at',
      'SELECT * FROM large_table WHERE complex_condition = ?',
    ];
  }
}
