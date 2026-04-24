import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { KPI } from '../entities/kpi.entity';
import { KPIValue } from '../entities/kpi-value.entity';
import { AdvancedAnalyticsService } from '../analytics/advanced-analytics.service';

export interface KPICreationRequest {
  name: string;
  description: string;
  category: string;
  definition: any;
  targets?: any;
  formatting?: any;
  alerts?: any;
  metadata?: any;
}

export interface KPIData {
  id: string;
  name: string;
  description: string;
  category: string;
  currentValue: number;
  target?: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  status: 'good' | 'warning' | 'critical' | 'unknown';
  lastCalculated: Date;
  nextCalculation: Date;
  formatting: any;
  alerts: any;
}

export interface KPIAlert {
  id: string;
  kpiId: string;
  kpiName: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  acknowledged: boolean;
}

@Injectable()
export class KPITrackingService {
  private readonly logger = new Logger(KPITrackingService.name);
  private readonly alertCache = new Map<string, Date>(); // KPI ID -> last alert time

  constructor(
    @InjectRepository(KPI)
    private readonly kpiRepository: Repository<KPI>,
    @InjectRepository(KPIValue)
    private readonly kpiValueRepository: Repository<KPIValue>,
    private readonly analyticsService: AdvancedAnalyticsService,
    private readonly dataSource: DataSource,
  ) {}

  async createKPI(request: KPICreationRequest, userId: string): Promise<KPI> {
    this.logger.log(`Creating KPI: ${request.name}`);

    const kpi = this.kpiRepository.create({
      id: crypto.randomUUID(),
      userId,
      ...request,
      isActive: true,
      isPublic: request.metadata?.sensitivity === 'public',
      nextCalculation: this.calculateNextCalculation(request.definition.timeWindow),
    });

    await this.kpiRepository.save(kpi);

    // Calculate initial value
    await this.calculateKPIValue(kpi.id);

    return kpi;
  }

  async getKPIs(userId: string, category?: string): Promise<KPIData[]> {
    this.logger.log(`Fetching KPIs for user: ${userId}`);

    const queryBuilder = this.kpiRepository
      .createQueryBuilder('kpi')
      .leftJoinAndSelect('kpi.alerts', 'alerts')
      .where('kpi.isActive = :isActive', { isActive: true })
      .andWhere('(kpi.userId = :userId OR kpi.isPublic = :isPublic)', { userId, isPublic: true });

    if (category) {
      queryBuilder.andWhere('kpi.category = :category', { category });
    }

    const kpis = await queryBuilder.getMany();

    const kpiData: KPIData[] = [];

    for (const kpi of kpis) {
      const data = await this.getKPIData(kpi);
      kpiData.push(data);
    }

    return kpiData;
  }

  async getKPIDetails(kpiId: string, userId: string): Promise<KPIData> {
    const kpi = await this.kpiRepository.findOne({
      where: { id: kpiId, isActive: true },
    });

    if (!kpi) {
      throw new Error(`KPI ${kpiId} not found`);
    }

    // Check permissions
    if (kpi.userId !== userId && !kpi.isPublic) {
      throw new Error(`Access denied for KPI ${kpiId}`);
    }

    return this.getKPIData(kpi);
  }

  async updateKPI(kpiId: string, userId: string, updates: Partial<KPI>): Promise<KPI> {
    const kpi = await this.kpiRepository.findOne({
      where: { id: kpiId, userId },
    });

    if (!kpi) {
      throw new Error(`KPI ${kpiId} not found`);
    }

    Object.assign(kpi, updates);
    await this.kpiRepository.save(kpi);

    return kpi;
  }

  async deleteKPI(kpiId: string, userId: string): Promise<void> {
    const kpi = await this.kpiRepository.findOne({
      where: { id: kpiId, userId },
    });

    if (!kpi) {
      throw new Error(`KPI ${kpiId} not found`);
    }

    kpi.isActive = false;
    await this.kpiRepository.save(kpi);

    this.logger.log(`KPI ${kpiId} deleted`);
  }

  async calculateKPIValue(kpiId: string): Promise<number> {
    this.logger.log(`Calculating KPI value: ${kpiId}`);

    const kpi = await this.kpiRepository.findOne({
      where: { id: kpiId, isActive: true },
    });

    if (!kpi) {
      throw new Error(`KPI ${kpiId} not found`);
    }

    const startTime = Date.now();

    try {
      let value: number;

      switch (kpi.definition.aggregation) {
        case 'sum':
          value = await this.calculateSum(kpi);
          break;
        case 'avg':
          value = await this.calculateAverage(kpi);
          break;
        case 'count':
          value = await this.calculateCount(kpi);
          break;
        case 'min':
          value = await this.calculateMin(kpi);
          break;
        case 'max':
          value = await this.calculateMax(kpi);
          break;
        case 'custom':
          value = await this.calculateCustom(kpi);
          break;
        default:
          throw new Error(`Unsupported aggregation: ${kpi.definition.aggregation}`);
      }

      // Save KPI value
      const kpiValue = this.kpiValueRepository.create({
        id: crypto.randomUUID(),
        kpiId,
        value,
        timestamp: new Date(),
        metadata: {
          source: kpi.definition.dataSource,
          calculationTime: Date.now() - startTime,
        },
      });

      await this.kpiValueRepository.save(kpiValue);

      // Update KPI with latest calculation info
      kpi.lastCalculated = new Date();
      kpi.nextCalculation = this.calculateNextCalculation(kpi.definition.timeWindow);
      kpi.targets.current = value;
      await this.kpiRepository.save(kpi);

      // Check for alerts
      await this.checkKPIAlerts(kpi, value);

      this.logger.log(`KPI ${kpiId} calculated: ${value}`);
      return value;

    } catch (error) {
      this.logger.error(`KPI calculation failed for ${kpiId}:`, error);
      throw new Error(`KPI calculation failed: ${error.message}`);
    }
  }

  async getKPIHistory(kpiId: string, timeRange: { start: Date; end: Date }): Promise<{
    data: Array<{ timestamp: Date; value: number; dimensions?: any }>;
    statistics: {
      min: number;
      max: number;
      avg: number;
      trend: number;
    };
  }> {
    const values = await this.kpiValueRepository.find({
      where: {
        kpiId,
        timestamp: Between(timeRange.start, timeRange.end),
      },
      order: { timestamp: 'ASC' },
    });

    if (values.length === 0) {
      return {
        data: [],
        statistics: { min: 0, max: 0, avg: 0, trend: 0 },
      };
    }

    const data = values.map(v => ({
      timestamp: v.timestamp,
      value: v.value,
      dimensions: v.dimensions,
    }));

    const valueArray = data.map(d => d.value);
    const statistics = {
      min: Math.min(...valueArray),
      max: Math.max(...valueArray),
      avg: valueArray.reduce((sum, val) => sum + val, 0) / valueArray.length,
      trend: this.calculateTrend(valueArray),
    };

    return { data, statistics };
  }

  async getKPIAlerts(userId: string, acknowledged?: boolean): Promise<KPIAlert[]> {
    this.logger.log(`Fetching KPI alerts for user: ${userId}`);

    // In a real implementation, this would query an alerts table
    // For now, returning mock data
    const alerts: KPIAlert[] = [
      {
        id: crypto.randomUUID(),
        kpiId: 'kpi-1',
        kpiName: 'Daily Revenue',
        type: 'threshold',
        severity: 'high',
        message: 'Daily revenue is below target by 15%',
        value: 85000,
        threshold: 100000,
        timestamp: new Date(),
        acknowledged: false,
      },
    ];

    return alerts;
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    this.logger.log(`Acknowledging alert: ${alertId}`);
    
    // In a real implementation, this would update the alert in the database
    // For now, just log the action
  }

  async getKPICategories(userId: string): Promise<Array<{
    category: string;
    kpiCount: number;
    avgPerformance: number;
  }>> {
    const categories = await this.kpiRepository
      .createQueryBuilder('kpi')
      .select('kpi.category', 'category')
      .addSelect('COUNT(kpi.id)', 'kpiCount')
      .where('kpi.isActive = :isActive', { isActive: true })
      .andWhere('(kpi.userId = :userId OR kpi.isPublic = :isPublic)', { userId, isPublic: true })
      .groupBy('kpi.category')
      .getRawMany();

    return categories.map(cat => ({
      category: cat.category,
      kpiCount: parseInt(cat.kpiCount),
      avgPerformance: 0.85, // Simplified - would calculate actual performance
    }));
  }

  async getKPIDashboard(userId: string): Promise<{
    summary: {
      totalKPIs: number;
      criticalKPIs: number;
      warningKPIs: number;
      goodKPIs: number;
    };
    kpis: KPIData[];
    recentAlerts: KPIAlert[];
    performance: {
      overall: number;
      byCategory: Array<{ category: string; performance: number }>;
    };
  }> {
    const kpis = await this.getKPIs(userId);
    const alerts = await this.getKPIAlerts(userId, false);

    const summary = {
      totalKPIs: kpis.length,
      criticalKPIs: kpis.filter(k => k.status === 'critical').length,
      warningKPIs: kpis.filter(k => k.status === 'warning').length,
      goodKPIs: kpis.filter(k => k.status === 'good').length,
    };

    const performance = {
      overall: kpis.length > 0 ? kpis.reduce((sum, kpi) => {
        let score = 0.5; // baseline
        if (kpi.status === 'good') score = 1;
        else if (kpi.status === 'warning') score = 0.7;
        else if (kpi.status === 'critical') score = 0.3;
        return sum + score;
      }, 0) / kpis.length : 0,
      byCategory: this.calculatePerformanceByCategory(kpis),
    };

    return {
      summary,
      kpis,
      recentAlerts: alerts.slice(0, 5),
      performance,
    };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledKPICalculations(): Promise<void> {
    this.logger.log('Processing scheduled KPI calculations');

    const scheduledKPIs = await this.kpiRepository
      .createQueryBuilder('kpi')
      .where('kpi.isActive = :isActive', { isActive: true })
      .andWhere('kpi.nextCalculation <= :now', { now: new Date() })
      .getMany();

    for (const kpi of scheduledKPIs) {
      try {
        await this.calculateKPIValue(kpi.id);
      } catch (error) {
        this.logger.error(`Failed to calculate KPI ${kpi.id}:`, error);
      }
    }
  }

  private async getKPIData(kpi: KPI): Promise<KPIData> {
    // Get current value
    const currentValue = await this.kpiValueRepository.findOne({
      where: { kpiId: kpi.id },
      order: { timestamp: 'DESC' },
    });

    // Get previous value for comparison
    const previousValue = await this.kpiValueRepository.findOne({
      where: { kpiId: kpi.id },
      order: { timestamp: 'DESC' },
      skip: 1,
    });

    const current = currentValue?.value || 0;
    const previous = previousValue?.value || 0;
    const change = current - previous;
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0;

    // Determine status based on thresholds
    const status = this.determineKPIStatus(kpi, current);

    return {
      id: kpi.id,
      name: kpi.name,
      description: kpi.description,
      category: kpi.category,
      currentValue: current,
      target: kpi.targets?.target,
      previousValue: previous,
      change,
      changePercent,
      status,
      lastCalculated: kpi.lastCalculated,
      nextCalculation: kpi.nextCalculation,
      formatting: kpi.formatting,
      alerts: kpi.alerts,
    };
  }

  private determineKPIStatus(kpi: KPI, value: number): 'good' | 'warning' | 'critical' | 'unknown' {
    if (!kpi.targets?.thresholds || kpi.targets.thresholds.length === 0) {
      return 'unknown';
    }

    for (const threshold of kpi.targets.thresholds) {
      const meetsCondition = this.evaluateThreshold(value, threshold);
      if (meetsCondition) {
        switch (threshold.type) {
          case 'critical': return 'critical';
          case 'warning': return 'warning';
          case 'success': return 'good';
        }
      }
    }

    return 'good';
  }

  private evaluateThreshold(value: number, threshold: any): boolean {
    switch (threshold.operator) {
      case 'gt': return value > threshold.value;
      case 'gte': return value >= threshold.value;
      case 'lt': return value < threshold.value;
      case 'lte': return value <= threshold.value;
      case 'eq': return value === threshold.value;
      default: return false;
    }
  }

  private async checkKPIAlerts(kpi: KPI, value: number): Promise<void> {
    if (!kpi.alerts?.enabled || !kpi.alerts.conditions) {
      return;
    }

    for (const condition of kpi.alerts.conditions) {
      const meetsCondition = this.evaluateThreshold(value, condition);
      
      if (meetsCondition) {
        const lastAlertTime = this.alertCache.get(kpi.id);
        const cooldownMs = condition.cooldown * 60 * 1000; // Convert minutes to milliseconds
        
        if (!lastAlertTime || Date.now() - lastAlertTime.getTime() > cooldownMs) {
          await this.triggerKPIAlert(kpi, value, condition);
          this.alertCache.set(kpi.id, new Date());
        }
      }
    }
  }

  private async triggerKPIAlert(kpi: KPI, value: number, condition: any): Promise<void> {
    this.logger.log(`Triggering alert for KPI ${kpi.name}: ${value} (threshold: ${condition.value})`);

    // In a real implementation, this would:
    // 1. Create an alert record in the database
    // 2. Send notifications via configured channels (email, SMS, webhook, push)
    // 3. Update alert history

    const alert: KPIAlert = {
      id: crypto.randomUUID(),
      kpiId: kpi.id,
      kpiName: kpi.name,
      type: 'threshold',
      severity: condition.severity,
      message: this.generateAlertMessage(kpi, value, condition),
      value,
      threshold: condition.value,
      timestamp: new Date(),
      acknowledged: false,
    };

    // Send notifications based on channels
    for (const channel of kpi.alerts.channels) {
      await this.sendAlertNotification(alert, channel, kpi.alerts.recipients);
    }
  }

  private generateAlertMessage(kpi: KPI, value: number, condition: any): string {
    const operator = condition.operator === 'gt' || condition.operator === 'gte' ? 'above' : 'below';
    return `KPI "${kpi.name}" is ${operator} threshold: ${value} (threshold: ${condition.value})`;
  }

  private async sendAlertNotification(alert: KPIAlert, channel: string, recipients: any[]): Promise<void> {
    this.logger.log(`Sending ${channel} notification for alert ${alert.id}`);

    // In a real implementation, this would integrate with:
    // - Email service for 'email' channel
    // - SMS service for 'sms' channel
    // - Webhook service for 'webhook' channel
    // - Push notification service for 'push' channel

    for (const recipient of recipients) {
      switch (channel) {
        case 'email':
          await this.sendEmailAlert(alert, recipient);
          break;
        case 'sms':
          await this.sendSMSAlert(alert, recipient);
          break;
        case 'webhook':
          await this.sendWebhookAlert(alert, recipient);
          break;
        case 'push':
          await this.sendPushAlert(alert, recipient);
          break;
      }
    }
  }

  private async sendEmailAlert(alert: KPIAlert, recipient: any): Promise<void> {
    // Simplified email sending
    this.logger.log(`Email alert sent to ${recipient.value}: ${alert.message}`);
  }

  private async sendSMSAlert(alert: KPIAlert, recipient: any): Promise<void> {
    // Simplified SMS sending
    this.logger.log(`SMS alert sent to ${recipient.value}: ${alert.message}`);
  }

  private async sendWebhookAlert(alert: KPIAlert, recipient: any): Promise<void> {
    // Simplified webhook sending
    this.logger.log(`Webhook alert sent to ${recipient.value}: ${alert.message}`);
  }

  private async sendPushAlert(alert: KPIAlert, recipient: any): Promise<void> {
    // Simplified push notification sending
    this.logger.log(`Push alert sent to ${recipient.value}: ${alert.message}`);
  }

  private calculateNextCalculation(timeWindow: string): Date {
    const now = new Date();
    const nextCalculation = new Date(now);

    switch (timeWindow) {
      case 'realtime':
        nextCalculation.setMinutes(nextCalculation.getMinutes() + 1);
        break;
      case 'hourly':
        nextCalculation.setHours(nextCalculation.getHours() + 1);
        break;
      case 'daily':
        nextCalculation.setDate(nextCalculation.getDate() + 1);
        break;
      case 'weekly':
        nextCalculation.setDate(nextCalculation.getDate() + 7);
        break;
      case 'monthly':
        nextCalculation.setMonth(nextCalculation.getMonth() + 1);
        break;
      default:
        nextCalculation.setHours(nextCalculation.getHours() + 1);
    }

    return nextCalculation;
  }

  private async calculateSum(kpi: KPI): Promise<number> {
    const sql = this.buildAggregationQuery(kpi, 'SUM');
    const result = await this.dataSource.query(sql, this.buildQueryParameters(kpi));
    return parseFloat(result[0]?.value || 0);
  }

  private async calculateAverage(kpi: KPI): Promise<number> {
    const sql = this.buildAggregationQuery(kpi, 'AVG');
    const result = await this.dataSource.query(sql, this.buildQueryParameters(kpi));
    return parseFloat(result[0]?.value || 0);
  }

  private async calculateCount(kpi: KPI): Promise<number> {
    const sql = this.buildAggregationQuery(kpi, 'COUNT');
    const result = await this.dataSource.query(sql, this.buildQueryParameters(kpi));
    return parseFloat(result[0]?.value || 0);
  }

  private async calculateMin(kpi: KPI): Promise<number> {
    const sql = this.buildAggregationQuery(kpi, 'MIN');
    const result = await this.dataSource.query(sql, this.buildQueryParameters(kpi));
    return parseFloat(result[0]?.value || 0);
  }

  private async calculateMax(kpi: KPI): Promise<number> {
    const sql = this.buildAggregationQuery(kpi, 'MAX');
    const result = await this.dataSource.query(sql, this.buildQueryParameters(kpi));
    return parseFloat(result[0]?.value || 0);
  }

  private async calculateCustom(kpi: KPI): Promise<number> {
    // Execute custom calculation query
    const result = await this.dataSource.query(kpi.definition.calculation, this.buildQueryParameters(kpi));
    return parseFloat(result[0]?.value || 0);
  }

  private buildAggregationQuery(kpi: KPI, aggregation: string): string {
    let sql = `SELECT ${aggregation}(${kpi.definition.metric}) as value FROM ${kpi.definition.dataSource}`;
    
    if (kpi.definition.filters && kpi.definition.filters.length > 0) {
      sql += ' WHERE ';
      const filterConditions = kpi.definition.filters.map(filter => {
        return `${filter.field} ${filter.operator} :${filter.field}`;
      });
      sql += filterConditions.join(' AND ');
    }
    
    return sql;
  }

  private buildQueryParameters(kpi: KPI): any {
    const params: any = {};
    
    if (kpi.definition.filters) {
      kpi.definition.filters.forEach(filter => {
        params[filter.field] = filter.value;
      });
    }
    
    return params;
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
    
    return avgY > 0 ? slope / avgY : 0;
  }

  private calculatePerformanceByCategory(kpis: KPIData[]): Array<{ category: string; performance: number }> {
    const categoryMap = new Map<string, KPIData[]>();
    
    kpis.forEach(kpi => {
      if (!categoryMap.has(kpi.category)) {
        categoryMap.set(kpi.category, []);
      }
      categoryMap.get(kpi.category).push(kpi);
    });
    
    return Array.from(categoryMap.entries()).map(([category, categoryKPIs]) => {
      const performance = categoryKPIs.reduce((sum, kpi) => {
        let score = 0.5;
        if (kpi.status === 'good') score = 1;
        else if (kpi.status === 'warning') score = 0.7;
        else if (kpi.status === 'critical') score = 0.3;
        return sum + score;
      }, 0) / categoryKPIs.length;
      
      return { category, performance };
    });
  }
}
