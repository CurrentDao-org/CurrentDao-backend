import { Injectable, Logger } from '@nestjs/common';
import { CreateMarketDataDto } from '../dto/create-market-data.dto';

export interface QualityValidationResult {
  isValid: boolean;
  score: number;
  errors: string[];
  warnings: string[];
  metrics: QualityMetrics;
}

export interface QualityMetrics {
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  validity: number;
}

export interface QualityRule {
  name: string;
  description: string;
  weight: number;
  validator: (data: CreateMarketDataDto) => ValidationResult;
}

export interface ValidationResult {
  passed: boolean;
  score: number;
  message: string;
}

@Injectable()
export class DataQualityService {
  private readonly logger = new Logger(DataQualityService.name);
  private readonly qualityRules: QualityRule[] = [];
  private readonly historicalData = new Map<string, CreateMarketDataDto[]>();
  private readonly qualityThresholds = {
    excellent: 95,
    good: 85,
    acceptable: 70,
    poor: 50,
  };

  constructor() {
    this.initializeQualityRules();
  }

  private initializeQualityRules() {
    const rules: QualityRule[] = [
      {
        name: 'price-positivity',
        description: 'Price must be positive',
        weight: 0.2,
        validator: (data) => ({
          passed: data.price > 0,
          score: data.price > 0 ? 100 : 0,
          message: data.price > 0 ? 'Price is positive' : 'Price must be positive',
        }),
      },
      {
        name: 'price-reasonableness',
        description: 'Price should be within reasonable bounds',
        weight: 0.15,
        validator: (data) => {
          const reasonable = data.price > 0 && data.price < 1000000;
          return {
            passed: reasonable,
            score: reasonable ? 100 : 50,
            message: reasonable ? 'Price is reasonable' : 'Price seems unreasonable',
          };
        },
      },
      {
        name: 'volume-positivity',
        description: 'Volume must be positive if provided',
        weight: 0.1,
        validator: (data) => ({
          passed: !data.volume || data.volume > 0,
          score: !data.volume || data.volume > 0 ? 100 : 0,
          message: !data.volume || data.volume > 0 ? 'Volume is valid' : 'Volume must be positive',
        }),
      },
      {
        name: 'ohlc-consistency',
        description: 'OHLC data must be consistent',
        weight: 0.15,
        validator: (data) => {
          if (!data.high || !data.low) {
            return { passed: true, score: 100, message: 'OHLC not fully provided' };
          }
          
          const consistent = data.high >= data.low;
          const openValid = !data.open || (data.open >= data.low && data.open <= data.high);
          const closeValid = !data.close || (data.close >= data.low && data.close <= data.high);
          
          const fullyConsistent = consistent && openValid && closeValid;
          return {
            passed: consistent,
            score: fullyConsistent ? 100 : consistent ? 75 : 0,
            message: fullyConsistent ? 'OHLC data is consistent' : 'OHLC data has inconsistencies',
          };
        },
      },
      {
        name: 'bid-ask-spread',
        description: 'Bid-ask spread must be logical',
        weight: 0.1,
        validator: (data) => {
          if (!data.bid || !data.ask) {
            return { passed: true, score: 100, message: 'Bid-ask not fully provided' };
          }
          
          const logical = data.bid <= data.ask;
          const spreadReasonable = (data.ask - data.bid) <= data.price * 0.1;
          
          return {
            passed: logical,
            score: logical && spreadReasonable ? 100 : logical ? 75 : 0,
            message: logical && spreadReasonable ? 'Bid-ask spread is logical' : 'Bid-ask spread issues detected',
          };
        },
      },
      {
        name: 'symbol-format',
        description: 'Symbol must follow correct format',
        weight: 0.1,
        validator: (data) => {
          const validFormat = /^[A-Z0-9/]+$/.test(data.symbol);
          const validLength = data.symbol.length >= 1 && data.symbol.length <= 20;
          
          return {
            passed: validFormat && validLength,
            score: validFormat && validLength ? 100 : 0,
            message: validFormat && validLength ? 'Symbol format is valid' : 'Invalid symbol format',
          };
        },
      },
      {
        name: 'timestamp-validity',
        description: 'Timestamp must be valid and recent',
        weight: 0.1,
        validator: (data) => {
          const timestamp = data.sourceTimestamp ? new Date(data.sourceTimestamp) : new Date();
          const now = new Date();
          const ageInHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
          
          const valid = !isNaN(timestamp.getTime()) && ageInHours < 24;
          const recent = ageInHours < 1;
          
          return {
            passed: valid,
            score: recent ? 100 : valid ? 75 : 0,
            message: recent ? 'Timestamp is recent' : valid ? 'Timestamp is valid but not recent' : 'Invalid timestamp',
          };
        },
      },
      {
        name: 'data-completeness',
        description: 'Essential fields must be present',
        weight: 0.1,
        validator: (data) => {
          const essentialFields = ['symbol', 'price'];
          const optionalFields = ['volume', 'high', 'low', 'open', 'close', 'bid', 'ask'];
          
          const essentialComplete = essentialFields.every(field => data[field]);
          const optionalComplete = optionalFields.filter(field => data[field]).length;
          const optionalScore = (optionalComplete / optionalFields.length) * 100;
          
          return {
            passed: essentialComplete,
            score: essentialComplete ? 50 + (optionalScore * 0.5) : 0,
            message: essentialComplete ? `Data completeness: ${optionalComplete}/${optionalFields.length} optional fields` : 'Missing essential fields',
          };
        },
      },
    ];

    this.qualityRules.push(...rules);
  }

  async validateData(data: CreateMarketDataDto): Promise<QualityValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const metrics: QualityMetrics = {
      completeness: 0,
      accuracy: 0,
      consistency: 0,
      timeliness: 0,
      validity: 0,
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const rule of this.qualityRules) {
      try {
        const result = rule.validator(data);
        const weightedScore = result.score * rule.weight;
        
        totalScore += weightedScore;
        totalWeight += rule.weight;

        if (!result.passed) {
          errors.push(`${rule.name}: ${result.message}`);
        } else if (result.score < 100) {
          warnings.push(`${rule.name}: ${result.message}`);
        }

        // Update metrics
        this.updateMetrics(rule.name, result.score, metrics);
      } catch (error) {
        this.logger.error(`Error in quality rule ${rule.name}:`, error);
        errors.push(`${rule.name}: Validation error`);
      }
    }

    // Additional historical consistency checks
    const historicalScore = await this.checkHistoricalConsistency(data);
    totalScore += historicalScore * 0.1;
    totalWeight += 0.1;

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    // Add historical warnings if needed
    if (historicalScore < 80) {
      warnings.push('Data shows significant deviation from historical patterns');
    }

    return {
      isValid: errors.length === 0 && finalScore >= this.qualityThresholds.acceptable,
      score: Math.round(finalScore),
      errors,
      warnings,
      metrics,
    };
  }

  private updateMetrics(ruleName: string, score: number, metrics: QualityMetrics) {
    switch (ruleName) {
      case 'data-completeness':
        metrics.completeness = score;
        break;
      case 'price-positivity':
      case 'price-reasonableness':
        metrics.accuracy = Math.max(metrics.accuracy, score);
        break;
      case 'ohlc-consistency':
      case 'bid-ask-spread':
        metrics.consistency = Math.max(metrics.consistency, score);
        break;
      case 'timestamp-validity':
        metrics.timeliness = score;
        break;
      case 'symbol-format':
        metrics.validity = score;
        break;
    }
  }

  private async checkHistoricalConsistency(data: CreateMarketDataDto): Promise<number> {
    const historical = this.historicalData.get(data.symbol);
    if (!historical || historical.length < 10) {
      return 100; // No historical data to compare
    }

    const recentData = historical.slice(-10);
    const avgPrice = recentData.reduce((sum, item) => sum + item.price, 0) / recentData.length;
    const priceDeviation = Math.abs(data.price - avgPrice) / avgPrice;
    
    // Score based on price deviation (lower deviation = higher score)
    if (priceDeviation < 0.01) return 100;
    if (priceDeviation < 0.05) return 90;
    if (priceDeviation < 0.1) return 80;
    if (priceDeviation < 0.2) return 60;
    if (priceDeviation < 0.5) return 40;
    return 20;
  }

  async generateQualityReports(): Promise<any> {
    const reports = {
      summary: {
        totalValidations: 0,
        averageScore: 0,
        passRate: 0,
        qualityDistribution: {
          excellent: 0,
          good: 0,
          acceptable: 0,
          poor: 0,
        },
      },
      rulePerformance: {},
      symbolQuality: {},
      trends: {
        scores: [],
        timestamps: [],
      },
    };

    // This would typically query a database for historical validation results
    // For now, return a placeholder structure
    return reports;
  }

  async addHistoricalData(data: CreateMarketDataDto): Promise<void> {
    const symbolData = this.historicalData.get(data.symbol) || [];
    symbolData.push(data);
    
    // Keep only last 100 records per symbol
    if (symbolData.length > 100) {
      symbolData.shift();
    }
    
    this.historicalData.set(data.symbol, symbolData);
  }

  async getHistoricalData(symbol: string): Promise<CreateMarketDataDto[]> {
    return this.historicalData.get(symbol) || [];
  }

  addQualityRule(rule: QualityRule): void {
    this.qualityRules.push(rule);
    this.logger.log(`Added quality rule: ${rule.name}`);
  }

  removeQualityRule(ruleName: string): void {
    const index = this.qualityRules.findIndex(rule => rule.name === ruleName);
    if (index !== -1) {
      this.qualityRules.splice(index, 1);
      this.logger.log(`Removed quality rule: ${ruleName}`);
    }
  }

  getQualityRules(): QualityRule[] {
    return [...this.qualityRules];
  }

  setQualityThreshold(threshold: keyof typeof this.qualityThresholds, value: number): void {
    if (threshold in this.qualityThresholds) {
      this.qualityThresholds[threshold] = value;
      this.logger.log(`Updated quality threshold ${threshold} to ${value}`);
    }
  }

  getQualityThresholds(): typeof this.qualityThresholds {
    return { ...this.qualityThresholds };
  }

  async batchValidate(dataArray: CreateMarketDataDto[]): Promise<QualityValidationResult[]> {
    const results = await Promise.allSettled(
      dataArray.map(data => this.validateData(data))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<QualityValidationResult> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }

  async cleanData(data: CreateMarketDataDto): Promise<CreateMarketDataDto> {
    const cleaned = { ...data };

    // Clean price data
    if (cleaned.price <= 0) {
      cleaned.price = Math.abs(cleaned.price);
    }

    // Clean volume data
    if (cleaned.volume && cleaned.volume <= 0) {
      delete cleaned.volume;
    }

    // Clean OHLC data
    if (cleaned.high && cleaned.low && cleaned.high < cleaned.low) {
      [cleaned.high, cleaned.low] = [cleaned.low, cleaned.high];
    }

    // Clean bid-ask data
    if (cleaned.bid && cleaned.ask && cleaned.bid > cleaned.ask) {
      [cleaned.bid, cleaned.ask] = [cleaned.ask, cleaned.bid];
    }

    // Clean symbol format
    if (cleaned.symbol) {
      cleaned.symbol = cleaned.symbol.toUpperCase();
    }

    return cleaned;
  }

  async detectAnomalies(data: CreateMarketDataDto): Promise<string[]> {
    const anomalies: string[] = [];
    const historical = this.historicalData.get(data.symbol);

    if (!historical || historical.length < 20) {
      return anomalies;
    }

    const recentData = historical.slice(-20);
    const avgPrice = recentData.reduce((sum, item) => sum + item.price, 0) / recentData.length;
    const priceStdDev = this.calculateStandardDeviation(recentData.map(item => item.price));
    
    // Check for price anomalies (more than 3 standard deviations)
    const priceZScore = Math.abs(data.price - avgPrice) / priceStdDev;
    if (priceZScore > 3) {
      anomalies.push(`Price anomaly detected: Z-score ${priceZScore.toFixed(2)}`);
    }

    // Check for volume anomalies
    if (data.volume) {
      const avgVolume = recentData.reduce((sum, item) => sum + (item.volume || 0), 0) / recentData.length;
      const volumeRatio = data.volume / avgVolume;
      if (volumeRatio > 10 || volumeRatio < 0.1) {
        anomalies.push(`Volume anomaly detected: ${volumeRatio.toFixed(2)}x average`);
      }
    }

    return anomalies;
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }
}
