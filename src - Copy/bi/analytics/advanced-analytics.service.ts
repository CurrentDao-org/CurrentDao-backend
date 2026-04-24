import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface AnalyticsQuery {
  id: string;
  name: string;
  description: string;
  sql: string;
  parameters?: Array<{ name: string; type: string; defaultValue?: any }>;
  cacheDuration?: number; // seconds
  category: string;
}

export interface QueryResult {
  data: any[];
  metadata: {
    rowCount: number;
    executionTime: number;
    cached: boolean;
    columns: Array<{ name: string; type: string }>;
  };
}

export interface AnalyticsInsight {
  type: 'trend' | 'anomaly' | 'correlation' | 'forecast' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  recommendations?: string[];
  timestamp: Date;
}

export interface DataAggregation {
  groupBy: string[];
  aggregations: Array<{
    field: string;
    function: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'stddev' | 'variance';
    alias?: string;
  }>;
  filters?: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between';
    value: any;
  }>;
  orderBy?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  limit?: number;
}

@Injectable()
export class AdvancedAnalyticsService {
  private readonly logger = new Logger(AdvancedAnalyticsService.name);
  private readonly queryCache = new Map<string, { result: QueryResult; timestamp: Date }>();
  private readonly cacheExpiry = 300000; // 5 minutes

  constructor(private readonly dataSource: DataSource) {}

  async executeQuery(queryId: string, parameters?: any): Promise<QueryResult> {
    this.logger.log(`Executing analytics query: ${queryId}`);
    
    const query = this.getPredefinedQuery(queryId);
    if (!query) {
      throw new Error(`Query ${queryId} not found`);
    }

    const cacheKey = this.getCacheKey(queryId, parameters);
    const cached = this.queryCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp.getTime() < (query.cacheDuration || this.cacheExpiry) * 1000) {
      this.logger.log(`Returning cached result for query: ${queryId}`);
      return { ...cached.result, metadata: { ...cached.result.metadata, cached: true } };
    }

    const startTime = Date.now();
    
    try {
      const result = await this.dataSource.query(query.sql, parameters);
      const executionTime = Date.now() - startTime;
      
      const queryResult: QueryResult = {
        data: result,
        metadata: {
          rowCount: result.length,
          executionTime,
          cached: false,
          columns: this.extractColumns(result),
        },
      };

      // Cache the result
      this.queryCache.set(cacheKey, { result: queryResult, timestamp: new Date() });

      this.logger.log(`Query ${queryId} executed in ${executionTime}ms, returned ${result.length} rows`);
      return queryResult;
    } catch (error) {
      this.logger.error(`Query execution failed for ${queryId}:`, error);
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  async executeCustomQuery(sql: string, parameters?: any): Promise<QueryResult> {
    this.logger.log('Executing custom analytics query');
    
    const startTime = Date.now();
    
    try {
      const result = await this.dataSource.query(sql, parameters);
      const executionTime = Date.now() - startTime;
      
      return {
        data: result,
        metadata: {
          rowCount: result.length,
          executionTime,
          cached: false,
          columns: this.extractColumns(result),
        },
      };
    } catch (error) {
      this.logger.error('Custom query execution failed:', error);
      throw new Error(`Custom query execution failed: ${error.message}`);
    }
  }

  async aggregateData(tableName: string, aggregation: DataAggregation): Promise<QueryResult> {
    this.logger.log(`Aggregating data from table: ${tableName}`);
    
    let sql = `SELECT `;
    
    // Build SELECT clause with aggregations
    const selectParts = [];
    aggregation.groupBy.forEach(group => selectParts.push(group));
    aggregation.aggregations.forEach(agg => {
      const alias = agg.alias || `${agg.function}_${agg.field}`;
      selectParts.push(`${agg.function}(${agg.field}) as ${alias}`);
    });
    sql += selectParts.join(', ');
    
    sql += ` FROM ${tableName}`;
    
    // Add WHERE clause for filters
    if (aggregation.filters && aggregation.filters.length > 0) {
      sql += ' WHERE ';
      const filterConditions = aggregation.filters.map(filter => {
        switch (filter.operator) {
          case 'eq': return `${filter.field} = :${filter.field}`;
          case 'ne': return `${filter.field} != :${filter.field}`;
          case 'gt': return `${filter.field} > :${filter.field}`;
          case 'gte': return `${filter.field} >= :${filter.field}`;
          case 'lt': return `${filter.field} < :${filter.field}`;
          case 'lte': return `${filter.field} <= :${filter.field}`;
          case 'in': return `${filter.field} IN (:${filter.field})`;
          case 'between': return `${filter.field} BETWEEN :${filter.field}_start AND :${filter.field}_end`;
          default: return `${filter.field} = :${filter.field}`;
        }
      });
      sql += filterConditions.join(' AND ');
    }
    
    // Add GROUP BY clause
    if (aggregation.groupBy.length > 0) {
      sql += ` GROUP BY ${aggregation.groupBy.join(', ')}`;
    }
    
    // Add ORDER BY clause
    if (aggregation.orderBy && aggregation.orderBy.length > 0) {
      sql += ` ORDER BY ${aggregation.orderBy.map(order => `${order.field} ${order.direction}`).join(', ')}`;
    }
    
    // Add LIMIT clause
    if (aggregation.limit) {
      sql += ` LIMIT ${aggregation.limit}`;
    }
    
    // Build parameters object
    const params: any = {};
    if (aggregation.filters) {
      aggregation.filters.forEach(filter => {
        if (filter.operator === 'between') {
          params[`${filter.field}_start`] = filter.value[0];
          params[`${filter.field}_end`] = filter.value[1];
        } else {
          params[filter.field] = filter.value;
        }
      });
    }
    
    return this.executeCustomQuery(sql, params);
  }

  async generateInsights(dataSource: string, timeRange: { start: Date; end: Date }): Promise<AnalyticsInsight[]> {
    this.logger.log(`Generating insights for data source: ${dataSource}`);
    
    const insights: AnalyticsInsight[] = [];
    
    // Trend analysis
    const trendInsight = await this.analyzeTrends(dataSource, timeRange);
    if (trendInsight) insights.push(trendInsight);
    
    // Anomaly detection
    const anomalyInsights = await this.detectAnomalies(dataSource, timeRange);
    insights.push(...anomalyInsights);
    
    // Correlation analysis
    const correlationInsights = await this.analyzeCorrelations(dataSource, timeRange);
    insights.push(...correlationInsights);
    
    // Forecasting
    const forecastInsights = await this.generateForecasts(dataSource, timeRange);
    insights.push(...forecastInsights);
    
    // Recommendations
    const recommendations = await this.generateRecommendations(dataSource, timeRange);
    insights.push(...recommendations);
    
    return insights;
  }

  async getPerformanceMetrics(timeRange: { start: Date; end: Date }): Promise<{
    queryPerformance: Array<{
      queryId: string;
      avgExecutionTime: number;
      executionCount: number;
      cacheHitRate: number;
    }>;
    systemMetrics: {
      totalQueries: number;
      avgResponseTime: number;
      cacheHitRate: number;
      errorRate: number;
    };
  }> {
    // This would typically query system logs and metrics
    // For now, returning mock data
    return {
      queryPerformance: [
        {
          queryId: 'daily_revenue',
          avgExecutionTime: 1200,
          executionCount: 245,
          cacheHitRate: 0.85,
        },
        {
          queryId: 'user_growth',
          avgExecutionTime: 800,
          executionCount: 189,
          cacheHitRate: 0.92,
        },
      ],
      systemMetrics: {
        totalQueries: 1234,
        avgResponseTime: 1500,
        cacheHitRate: 0.87,
        errorRate: 0.02,
      },
    };
  }

  async optimizeQuery(sql: string): Promise<{
    originalSql: string;
    optimizedSql: string;
    improvements: string[];
    estimatedPerformanceGain: number;
  }> {
    this.logger.log('Optimizing SQL query');
    
    let optimizedSql = sql;
    const improvements: string[] = [];
    
    // Basic optimization rules
    if (sql.includes('SELECT *')) {
      optimizedSql = optimizedSql.replace(/SELECT \*/g, 'SELECT id, created_at, updated_at');
      improvements.push('Replaced SELECT * with specific columns');
    }
    
    if (!sql.includes('WHERE') && !sql.includes('LIMIT')) {
      optimizedSql += ' LIMIT 1000';
      improvements.push('Added LIMIT clause to prevent full table scans');
    }
    
    if (sql.includes('ORDER BY') && !sql.includes('LIMIT')) {
      optimizedSql += ' LIMIT 1000';
      improvements.push('Added LIMIT clause for ORDER BY queries');
    }
    
    // Estimate performance gain (simplified)
    const estimatedPerformanceGain = improvements.length * 15; // 15% per improvement
    
    return {
      originalSql: sql,
      optimizedSql,
      improvements,
      estimatedPerformanceGain,
    };
  }

  async validateQuery(sql: string): Promise<{
    isValid: boolean;
    syntaxErrors?: string[];
    performanceWarnings?: string[];
    securityIssues?: string[];
  }> {
    this.logger.log('Validating SQL query');
    
    const syntaxErrors: string[] = [];
    const performanceWarnings: string[] = [];
    const securityIssues: string[] = [];
    
    // Basic syntax validation
    try {
      // This would use a SQL parser in production
      if (!sql.trim().toUpperCase().startsWith('SELECT')) {
        syntaxErrors.push('Only SELECT queries are allowed');
      }
      
      if (sql.includes('DROP') || sql.includes('DELETE') || sql.includes('UPDATE') || sql.includes('INSERT')) {
        securityIssues.push('DML operations are not allowed in analytics queries');
      }
      
      if (sql.includes('--') || sql.includes('/*')) {
        securityIssues.push('SQL comments are not allowed');
      }
      
      if (sql.includes('SELECT *')) {
        performanceWarnings.push('SELECT * can impact performance');
      }
      
      if (!sql.includes('WHERE') && !sql.includes('LIMIT')) {
        performanceWarnings.push('Consider adding WHERE clause or LIMIT for better performance');
      }
      
    } catch (error) {
      syntaxErrors.push(`Syntax error: ${error.message}`);
    }
    
    return {
      isValid: syntaxErrors.length === 0 && securityIssues.length === 0,
      syntaxErrors: syntaxErrors.length > 0 ? syntaxErrors : undefined,
      performanceWarnings: performanceWarnings.length > 0 ? performanceWarnings : undefined,
      securityIssues: securityIssues.length > 0 ? securityIssues : undefined,
    };
  }

  private getPredefinedQuery(queryId: string): AnalyticsQuery | null {
    const queries: Record<string, AnalyticsQuery> = {
      daily_revenue: {
        id: 'daily_revenue',
        name: 'Daily Revenue',
        description: 'Daily revenue breakdown by currency and region',
        sql: `
          SELECT 
            DATE(created_at) as date,
            currency,
            region,
            SUM(amount) as revenue,
            COUNT(*) as transaction_count
          FROM transactions 
          WHERE created_at >= :startDate 
            AND created_at <= :endDate
            AND status = 'completed'
          GROUP BY DATE(created_at), currency, region
          ORDER BY date DESC
        `,
        parameters: [
          { name: 'startDate', type: 'date', defaultValue: () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          { name: 'endDate', type: 'date', defaultValue: () => new Date() },
        ],
        cacheDuration: 3600, // 1 hour
        category: 'financial',
      },
      user_growth: {
        id: 'user_growth',
        name: 'User Growth',
        description: 'User registration and activity trends',
        sql: `
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as new_users,
            SUM(CASE WHEN last_login >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY) THEN 1 ELSE 0 END) as active_users,
            SUM(CASE WHEN last_login >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY) THEN 1 ELSE 0 END) as monthly_active_users
          FROM users 
          WHERE created_at >= :startDate 
            AND created_at <= :endDate
          GROUP BY DATE(created_at)
          ORDER BY date DESC
        `,
        parameters: [
          { name: 'startDate', type: 'date', defaultValue: () => new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          { name: 'endDate', type: 'date', defaultValue: () => new Date() },
        ],
        cacheDuration: 7200, // 2 hours
        category: 'users',
      },
      transaction_volume: {
        id: 'transaction_volume',
        name: 'Transaction Volume',
        description: 'Transaction volume and success rates',
        sql: `
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as total_transactions,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_transactions,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_transactions,
            AVG(amount) as avg_transaction_amount,
            SUM(amount) as total_volume
          FROM transactions 
          WHERE created_at >= :startDate 
            AND created_at <= :endDate
          GROUP BY DATE(created_at)
          ORDER BY date DESC
        `,
        parameters: [
          { name: 'startDate', type: 'date', defaultValue: () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          { name: 'endDate', type: 'date', defaultValue: () => new Date() },
        ],
        cacheDuration: 1800, // 30 minutes
        category: 'transactions',
      },
    };
    
    return queries[queryId] || null;
  }

  private getCacheKey(queryId: string, parameters?: any): string {
    const paramsStr = parameters ? JSON.stringify(parameters) : '';
    return `${queryId}_${paramsStr}`;
  }

  private extractColumns(data: any[]): Array<{ name: string; type: string }> {
    if (data.length === 0) return [];
    
    const firstRow = data[0];
    return Object.keys(firstRow).map(key => ({
      name: key,
      type: typeof firstRow[key],
    }));
  }

  private async analyzeTrends(dataSource: string, timeRange: { start: Date; end: Date }): Promise<AnalyticsInsight | null> {
    // Simplified trend analysis
    try {
      const sql = `
        SELECT 
          DATE(created_at) as date,
          SUM(amount) as value
        FROM ${dataSource}
        WHERE created_at >= :start AND created_at <= :end
        GROUP BY DATE(created_at)
        ORDER BY date
      `;
      
      const result = await this.dataSource.query(sql, { start: timeRange.start, end: timeRange.end });
      
      if (result.length < 2) return null;
      
      const values = result.map(r => parseFloat(r.value));
      const trend = this.calculateTrend(values);
      
      return {
        type: 'trend',
        title: `${dataSource} Trend Analysis`,
        description: trend > 0 ? 'Upward trend detected' : 'Downward trend detected',
        confidence: Math.abs(trend) * 100,
        impact: Math.abs(trend) > 0.1 ? 'high' : Math.abs(trend) > 0.05 ? 'medium' : 'low',
        data: { trend, values: result },
        recommendations: trend > 0 ? ['Continue current strategy', 'Monitor for sustainability'] : ['Investigate decline causes', 'Consider corrective actions'],
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.warn('Trend analysis failed:', error);
      return null;
    }
  }

  private async detectAnomalies(dataSource: string, timeRange: { start: Date; end: Date }): Promise<AnalyticsInsight[]> {
    // Simplified anomaly detection
    const insights: AnalyticsInsight[] = [];
    
    try {
      const sql = `
        SELECT 
          DATE(created_at) as date,
          SUM(amount) as value
        FROM ${dataSource}
        WHERE created_at >= :start AND created_at <= :end
        GROUP BY DATE(created_at)
        ORDER BY date
      `;
      
      const result = await this.dataSource.query(sql, { start: timeRange.start, end: timeRange.end });
      const values = result.map(r => parseFloat(r.value));
      
      const anomalies = this.detectOutliers(values);
      
      anomalies.forEach(anomaly => {
        insights.push({
          type: 'anomaly',
          title: `Anomaly Detected in ${dataSource}`,
          description: `Unusual value detected: ${anomaly.value}`,
          confidence: anomaly.confidence,
          impact: anomaly.severity,
          data: anomaly,
          recommendations: ['Investigate unusual pattern', 'Check data quality'],
          timestamp: new Date(),
        });
      });
    } catch (error) {
      this.logger.warn('Anomaly detection failed:', error);
    }
    
    return insights;
  }

  private async analyzeCorrelations(dataSource: string, timeRange: { start: Date; end: Date }): Promise<AnalyticsInsight[]> {
    // Simplified correlation analysis
    const insights: AnalyticsInsight[] = [];
    
    // In a real implementation, this would analyze correlations between different metrics
    insights.push({
      type: 'correlation',
      title: 'Correlation Analysis',
      description: 'Strong correlation found between user activity and transaction volume',
      confidence: 0.85,
      impact: 'medium',
      data: { correlation: 0.87, metrics: ['user_activity', 'transaction_volume'] },
      recommendations: ['Leverage correlation in marketing strategies'],
      timestamp: new Date(),
    });
    
    return insights;
  }

  private async generateForecasts(dataSource: string, timeRange: { start: Date; end: Date }): Promise<AnalyticsInsight[]> {
    // Simplified forecasting
    const insights: AnalyticsInsight[] = [];
    
    try {
      const sql = `
        SELECT 
          DATE(created_at) as date,
          SUM(amount) as value
        FROM ${dataSource}
        WHERE created_at >= :start AND created_at <= :end
        GROUP BY DATE(created_at)
        ORDER BY date
      `;
      
      const result = await this.dataSource.query(sql, { start: timeRange.start, end: timeRange.end });
      const values = result.map(r => parseFloat(r.value));
      
      const forecast = this.simpleForecast(values);
      
      insights.push({
        type: 'forecast',
        title: `${dataSource} Forecast`,
        description: `Next period forecast: ${forecast.nextValue}`,
        confidence: forecast.confidence,
        impact: 'medium',
        data: forecast,
        recommendations: ['Plan resources based on forecast', 'Monitor forecast accuracy'],
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.warn('Forecasting failed:', error);
    }
    
    return insights;
  }

  private async generateRecommendations(dataSource: string, timeRange: { start: Date; end: Date }): Promise<AnalyticsInsight[]> {
    // Simplified recommendation generation
    const insights: AnalyticsInsight[] = [];
    
    insights.push({
      type: 'recommendation',
      title: 'Performance Optimization',
      description: 'Consider optimizing query performance for better dashboard responsiveness',
      confidence: 0.75,
      impact: 'medium',
      data: { recommendation: 'add_indexes', tables: [dataSource] },
      recommendations: ['Add database indexes', 'Implement query caching', 'Optimize slow queries'],
      timestamp: new Date(),
    });
    
    return insights;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const avgY = sumY / n;
    
    // Normalize slope by average value
    return avgY > 0 ? slope / avgY : 0;
  }

  private detectOutliers(values: number[]): Array<{ index: number; value: number; confidence: number; severity: string }> {
    const outliers = [];
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    values.forEach((value, index) => {
      const zScore = Math.abs((value - mean) / stdDev);
      if (zScore > 2) {
        outliers.push({
          index,
          value,
          confidence: Math.min(zScore / 3, 1),
          severity: zScore > 3 ? 'critical' : zScore > 2.5 ? 'high' : 'medium',
        });
      }
    });
    
    return outliers;
  }

  private simpleForecast(values: number[]): { nextValue: number; confidence: number; method: string } {
    if (values.length < 3) {
      return { nextValue: values[values.length - 1] || 0, confidence: 0.5, method: 'simple' };
    }
    
    // Simple moving average forecast
    const recentValues = values.slice(-3);
    const avgRecent = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    
    // Calculate trend
    const trend = this.calculateTrend(values);
    const nextValue = avgRecent * (1 + trend);
    
    const confidence = Math.min(0.9, 0.5 + (values.length / 100));
    
    return { nextValue, confidence, method: 'moving_average' };
  }
}
