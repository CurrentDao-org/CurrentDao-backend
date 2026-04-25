import { Injectable } from '@nestjs/common';

export interface AccuracyMetrics {
  period: string;
  type: string;
  accuracy: number;
  meanAbsoluteError: number;
  meanSquaredError: number;
  rootMeanSquaredError: number;
  meanAbsolutePercentageError: number;
  samples: number;
  improvement: number;
  generatedAt: string;
}

export interface ForecastAccuracy {
  forecastId: string;
  forecastTimestamp: string;
  actualTimestamp: string;
  forecastValue: number;
  actualValue: number;
  error: number;
  percentageError: number;
  type: string;
  region?: string;
  source?: string;
}

@Injectable()
export class AccuracyTrackingService {
  private readonly accuracyHistory: Map<string, AccuracyMetrics[]> = new Map();
  private readonly forecastRecords: ForecastAccuracy[] = [];

  constructor() {
    // Initialize with some historical data
    this.initializeHistoricalAccuracy();
  }

  async getAccuracyMetrics(periodDays: number, type?: string): Promise<AccuracyMetrics[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);
    
    const metrics: AccuracyMetrics[] = [];
    
    const types = type ? [type] : ['demand', 'supply', 'solar', 'wind', 'hydro', 'nuclear', 'fossil'];
    
    for (const forecastType of types) {
      const typeMetrics = this.calculateAccuracyMetrics(forecastType, cutoffDate);
      if (typeMetrics) {
        metrics.push(typeMetrics);
      }
    }
    
    return metrics;
  }

  async getHistoricalForecasts(from: string, to: string, type?: string): Promise<ForecastAccuracy[]> {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    
    return this.forecastRecords.filter(record => {
      const recordDate = new Date(record.forecastTimestamp);
      const matchesDate = recordDate >= fromDate && recordDate <= toDate;
      const matchesType = !type || record.type === type;
      return matchesDate && matchesType;
    });
  }

  recordForecastAccuracy(forecast: any, actual: any, type: string, region?: string, source?: string): void {
    const accuracy: ForecastAccuracy = {
      forecastId: this.generateForecastId(),
      forecastTimestamp: forecast.timestamp,
      actualTimestamp: actual.timestamp,
      forecastValue: forecast.value,
      actualValue: actual.value,
      error: Math.abs(forecast.value - actual.value),
      percentageError: Math.abs((forecast.value - actual.value) / actual.value) * 100,
      type,
      region,
      source,
    };
    
    this.forecastRecords.push(accuracy);
    
    // Keep only last 10000 records to prevent memory issues
    if (this.forecastRecords.length > 10000) {
      this.forecastRecords.splice(0, 1000);
    }
  }

  calculateRealTimeAccuracy(forecasts: any[], actuals: any[]): number {
    if (forecasts.length === 0 || actuals.length === 0) {
      return 0;
    }
    
    let totalError = 0;
    let totalActual = 0;
    let validComparisons = 0;
    
    for (const forecast of forecasts) {
      const actual = actuals.find(a => a.timestamp === forecast.timestamp);
      if (actual) {
        const error = Math.abs(forecast.value - actual.value);
        totalError += error;
        totalActual += Math.abs(actual.value);
        validComparisons++;
      }
    }
    
    if (validComparisons === 0) {
      return 0;
    }
    
    const mape = (totalError / totalActual) * 100;
    return Math.max(0, 100 - mape); // Convert to accuracy percentage
  }

  detectAccuracyDegradation(type: string, threshold = 5): boolean {
    const recentMetrics = this.getRecentAccuracyMetrics(type, 7); // Last 7 days
    const olderMetrics = this.getRecentAccuracyMetrics(type, 30); // Last 30 days
    
    if (recentMetrics.length === 0 || olderMetrics.length === 0) {
      return false;
    }
    
    const recentAvg = recentMetrics.reduce((sum, m) => sum + m.accuracy, 0) / recentMetrics.length;
    const olderAvg = olderMetrics.reduce((sum, m) => sum + m.accuracy, 0) / olderMetrics.length;
    
    return (olderAvg - recentAvg) > threshold;
  }

  async generateAccuracyReport(type?: string): Promise<any> {
    const report = {
      generatedAt: new Date().toISOString(),
      period: '30 days',
      summary: await this.generateSummaryReport(type),
      trends: await this.generateTrendAnalysis(type),
      recommendations: await this.generateAccuracyRecommendations(type),
      detailedMetrics: await this.getAccuracyMetrics(30, type),
    };
    
    return report;
  }

  private calculateAccuracyMetrics(type: string, cutoffDate: Date): AccuracyMetrics | null {
    const recentRecords = this.forecastRecords.filter(record => 
      record.type === type && new Date(record.forecastTimestamp) >= cutoffDate
    );
    
    if (recentRecords.length === 0) {
      return null;
    }
    
    const errors = recentRecords.map(r => r.error);
    const percentageErrors = recentRecords.map(r => r.percentageError);
    
    const mae = errors.reduce((sum, error) => sum + error, 0) / errors.length;
    const mse = errors.reduce((sum, error) => sum + error * error, 0) / errors.length;
    const rmse = Math.sqrt(mse);
    const mape = percentageErrors.reduce((sum, error) => sum + error, 0) / percentageErrors.length;
    const accuracy = Math.max(0, 100 - mape);
    
    // Calculate improvement compared to previous period
    const improvement = this.calculateImprovement(type, accuracy);
    
    return {
      period: `${Math.round((Date.now() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24))} days`,
      type,
      accuracy: Math.round(accuracy * 100) / 100,
      meanAbsoluteError: Math.round(mae * 100) / 100,
      meanSquaredError: Math.round(mse * 100) / 100,
      rootMeanSquaredError: Math.round(rmse * 100) / 100,
      meanAbsolutePercentageError: Math.round(mape * 100) / 100,
      samples: recentRecords.length,
      improvement: Math.round(improvement * 100) / 100,
      generatedAt: new Date().toISOString(),
    };
  }

  private calculateImprovement(type: string, currentAccuracy: number): number {
    const olderRecords = this.forecastRecords.filter(record => 
      record.type === type && 
      new Date(record.forecastTimestamp) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    
    if (olderRecords.length === 0) {
      return 0;
    }
    
    const olderErrors = olderRecords.map(r => r.percentageError);
    const olderMape = olderErrors.reduce((sum, error) => sum + error, 0) / olderErrors.length;
    const olderAccuracy = Math.max(0, 100 - olderMape);
    
    return currentAccuracy - olderAccuracy;
  }

  private getRecentAccuracyMetrics(type: string, days: number): AccuracyMetrics[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const metrics = this.accuracyHistory.get(type) || [];
    return metrics.filter(m => new Date(m.generatedAt) >= cutoffDate);
  }

  private async generateSummaryReport(type?: string): Promise<any> {
    const allMetrics = await this.getAccuracyMetrics(30, type);
    
    if (allMetrics.length === 0) {
      return { message: 'No accuracy data available' };
    }
    
    const avgAccuracy = allMetrics.reduce((sum, m) => sum + m.accuracy, 0) / allMetrics.length;
    const avgMape = allMetrics.reduce((sum, m) => sum + m.meanAbsolutePercentageError, 0) / allMetrics.length;
    const totalSamples = allMetrics.reduce((sum, m) => sum + m.samples, 0);
    
    return {
      overallAccuracy: Math.round(avgAccuracy * 100) / 100,
      averageError: Math.round(avgMape * 100) / 100,
      totalSamples,
      bestPerforming: allMetrics.reduce((best, current) => 
        current.accuracy > best.accuracy ? current : best
      ),
      worstPerforming: allMetrics.reduce((worst, current) => 
        current.accuracy < worst.accuracy ? current : worst
      ),
    };
  }

  private async generateTrendAnalysis(type?: string): Promise<any> {
    const weeklyMetrics = await this.getAccuracyMetrics(7, type);
    const monthlyMetrics = await this.getAccuracyMetrics(30, type);
    
    if (weeklyMetrics.length === 0 || monthlyMetrics.length === 0) {
      return { message: 'Insufficient data for trend analysis' };
    }
    
    const weeklyAvg = weeklyMetrics.reduce((sum, m) => sum + m.accuracy, 0) / weeklyMetrics.length;
    const monthlyAvg = monthlyMetrics.reduce((sum, m) => sum + m.accuracy, 0) / monthlyMetrics.length;
    
    const trend = weeklyAvg > monthlyAvg ? 'improving' : weeklyAvg < monthlyAvg ? 'declining' : 'stable';
    const change = ((weeklyAvg - monthlyAvg) / monthlyAvg) * 100;
    
    return {
      trend,
      changePercentage: Math.round(change * 100) / 100,
      weeklyAccuracy: Math.round(weeklyAvg * 100) / 100,
      monthlyAccuracy: Math.round(monthlyAvg * 100) / 100,
    };
  }

  private async generateAccuracyRecommendations(type?: string): Promise<string[]> {
    const recommendations: string[] = [];
    const metrics = await this.getAccuracyMetrics(30, type);
    
    for (const metric of metrics) {
      if (metric.accuracy < 85) {
        recommendations.push(`${metric.type} forecast accuracy is below target (${metric.accuracy}%). Consider model retraining.`);
      }
      
      if (metric.meanAbsolutePercentageError > 15) {
        recommendations.push(`${metric.type} forecast error is high (${metric.meanAbsolutePercentageError}%). Review data quality.`);
      }
      
      if (metric.improvement < -5) {
        recommendations.push(`${metric.type} forecast accuracy is declining. Investigate model performance.`);
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All forecast models are performing within acceptable ranges.');
    }
    
    return recommendations;
  }

  private initializeHistoricalAccuracy(): void {
    // Generate some historical accuracy data for demonstration
    const types = ['demand', 'supply', 'solar', 'wind', 'hydro'];
    
    for (const type of types) {
      const historicalMetrics: AccuracyMetrics[] = [];
      
      for (let i = 30; i >= 1; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        historicalMetrics.push({
          period: '30 days',
          type,
          accuracy: 85 + Math.random() * 10, // 85-95% accuracy
          meanAbsoluteError: 50 + Math.random() * 100,
          meanSquaredError: 2500 + Math.random() * 5000,
          rootMeanSquaredError: 50 + Math.random() * 70,
          meanAbsolutePercentageError: 5 + Math.random() * 10,
          samples: Math.floor(Math.random() * 1000) + 500,
          improvement: (Math.random() - 0.5) * 5,
          generatedAt: date.toISOString(),
        });
      }
      
      this.accuracyHistory.set(type, historicalMetrics);
    }
  }

  private generateForecastId(): string {
    return `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
