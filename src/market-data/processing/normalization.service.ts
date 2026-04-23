import { Injectable, Logger } from '@nestjs/common';
import { CreateMarketDataDto } from '../dto/create-market-data.dto';

export interface NormalizationRule {
  field: string;
  type: 'number' | 'string' | 'date' | 'boolean';
  required: boolean;
  min?: number;
  max?: number;
  precision?: number;
  format?: string;
}

export interface NormalizationResult {
  data: CreateMarketDataDto;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class NormalizationService {
  private readonly logger = new Logger(NormalizationService.name);
  private readonly normalizationRules: Map<string, NormalizationRule[]> = new Map();

  constructor() {
    this.initializeNormalizationRules();
  }

  private initializeNormalizationRules() {
    const defaultRules: NormalizationRule[] = [
      { field: 'symbol', type: 'string', required: true, format: '^[A-Z0-9/]+$', min: 1, max: 20 },
      { field: 'price', type: 'number', required: true, min: 0, precision: 8 },
      { field: 'volume', type: 'number', required: false, min: 0, precision: 2 },
      { field: 'high', type: 'number', required: false, min: 0, precision: 8 },
      { field: 'low', type: 'number', required: false, min: 0, precision: 8 },
      { field: 'open', type: 'number', required: false, min: 0, precision: 8 },
      { field: 'close', type: 'number', required: false, min: 0, precision: 8 },
      { field: 'bid', type: 'number', required: false, min: 0, precision: 8 },
      { field: 'ask', type: 'number', required: false, min: 0, precision: 8 },
      { field: 'spread', type: 'number', required: false, min: 0, precision: 8 },
      { field: 'source', type: 'string', required: false, min: 1, max: 50 },
      { field: 'market', type: 'string', required: false, min: 1, max: 20 },
      { field: 'currency', type: 'string', required: false, min: 1, max: 10 },
      { field: 'sourceTimestamp', type: 'date', required: false },
    ];

    this.normalizationRules.set('default', defaultRules);
  }

  async normalizeData(data: CreateMarketDataDto): Promise<CreateMarketDataDto> {
    const result = await this.applyNormalization(data);
    
    if (!result.isValid) {
      throw new Error(`Normalization failed: ${result.errors.join(', ')}`);
    }

    if (result.warnings.length > 0) {
      this.logger.warn(`Normalization warnings: ${result.warnings.join(', ')}`);
    }

    return result.data;
  }

  private async applyNormalization(data: CreateMarketDataDto): Promise<NormalizationResult> {
    const rules = this.normalizationRules.get('default') || [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const normalizedData = { ...data };

    for (const rule of rules) {
      const value = (normalizedData as any)[rule.field];
      
      try {
        const normalizedValue = await this.normalizeField(value, rule);
        (normalizedData as any)[rule.field] = normalizedValue;
      } catch (error) {
        if (rule.required) {
          errors.push(`Field ${rule.field}: ${error.message}`);
        } else {
          warnings.push(`Field ${rule.field}: ${error.message}`);
        }
      }
    }

    // Apply business logic validation
    this.validateBusinessLogic(normalizedData, errors, warnings);

    // Calculate derived fields
    this.calculateDerivedFields(normalizedData);

    return {
      data: normalizedData,
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private async normalizeField(value: any, rule: NormalizationRule): Promise<any> {
    if (value === undefined || value === null) {
      if (rule.required) {
        throw new Error('Required field is missing');
      }
      return value;
    }

    switch (rule.type) {
      case 'string':
        return this.normalizeString(value, rule);
      case 'number':
        return this.normalizeNumber(value, rule);
      case 'date':
        return this.normalizeDate(value, rule);
      case 'boolean':
        return this.normalizeBoolean(value, rule);
      default:
        throw new Error(`Unsupported field type: ${rule.type}`);
    }
  }

  private normalizeString(value: any, rule: NormalizationRule): string {
    let normalized = String(value).trim();

    if (rule.format) {
      const regex = new RegExp(rule.format);
      if (!regex.test(normalized)) {
        throw new Error(`String format validation failed for ${normalized}`);
      }
    }

    if (rule.min && normalized.length < rule.min) {
      throw new Error(`String too short (min ${rule.min} characters)`);
    }

    if (rule.max && normalized.length > rule.max) {
      normalized = normalized.substring(0, rule.max);
    }

    // Normalize symbols to uppercase
    if (rule.field === 'symbol') {
      normalized = normalized.toUpperCase();
    }

    return normalized;
  }

  private normalizeNumber(value: any, rule: NormalizationRule): number {
    let normalized = Number(value);

    if (isNaN(normalized)) {
      throw new Error(`Invalid number: ${value}`);
    }

    if (rule.min !== undefined && normalized < rule.min) {
      throw new Error(`Number below minimum (${rule.min})`);
    }

    if (rule.max !== undefined && normalized > rule.max) {
      throw new Error(`Number above maximum (${rule.max})`);
    }

    if (rule.precision !== undefined) {
      const factor = Math.pow(10, rule.precision);
      normalized = Math.round(normalized * factor) / factor;
    }

    return normalized;
  }

  private normalizeDate(value: any, rule: NormalizationRule): Date {
    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format: ${value}`);
      }
      return date;
    }

    if (typeof value === 'number') {
      return new Date(value);
    }

    throw new Error(`Invalid date value: ${value}`);
  }

  private normalizeBoolean(value: any, rule: NormalizationRule): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') {
        return true;
      }
      if (lower === 'false' || lower === '0' || lower === 'no') {
        return false;
      }
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    throw new Error(`Invalid boolean value: ${value}`);
  }

  private validateBusinessLogic(data: CreateMarketDataDto, errors: string[], warnings: string[]) {
    // Validate OHLC relationships
    if (data.open && data.high && data.low) {
      if (data.high < data.low) {
        errors.push('High price cannot be lower than low price');
      }
      if (data.open > data.high || data.open < data.low) {
        warnings.push('Open price outside high-low range');
      }
    }

    // Validate close price
    if (data.close && data.high && data.low) {
      if (data.close > data.high || data.close < data.low) {
        warnings.push('Close price outside high-low range');
      }
    }

    // Validate bid-ask spread
    if (data.bid && data.ask) {
      if (data.bid > data.ask) {
        errors.push('Bid price cannot be higher than ask price');
      }
      const spread = data.ask - data.bid;
      if (spread > data.price * 0.1) {
        warnings.push('Bid-ask spread unusually large');
      }
    }

    // Validate price reasonableness
    if (data.price) {
      if (data.price <= 0) {
        errors.push('Price must be positive');
      }
      if (data.price > 1000000) {
        warnings.push('Price seems unusually high');
      }
    }

    // Validate volume
    if (data.volume) {
      if (data.volume <= 0) {
        warnings.push('Volume should be positive');
      }
      if (data.volume > 1000000000) {
        warnings.push('Volume seems unusually high');
      }
    }

    // Validate symbol format
    if (data.symbol) {
      if (!/^[A-Z0-9/]+$/.test(data.symbol)) {
        errors.push('Invalid symbol format');
      }
      if (data.symbol.length < 1 || data.symbol.length > 20) {
        errors.push('Symbol length must be between 1 and 20 characters');
      }
    }
  }

  private calculateDerivedFields(data: CreateMarketDataDto) {
    // Calculate spread if bid and ask are available
    if (data.bid && data.ask && !data.spread) {
      data.spread = data.ask - data.bid;
    }

    // Set default source timestamp if not provided
    if (!data.sourceTimestamp) {
      data.sourceTimestamp = new Date().toISOString();
    }

    // Normalize symbol format
    if (data.symbol) {
      data.symbol = data.symbol.toUpperCase();
    }

    // Set default market if not provided
    if (!data.market && data.symbol) {
      if (data.symbol.includes('/')) {
        data.market = 'spot';
      } else {
        data.market = 'unknown';
      }
    }

    // Extract currency from symbol if not provided
    if (!data.currency && data.symbol && data.symbol.includes('/')) {
      const parts = data.symbol.split('/');
      data.currency = parts[1];
    }
  }

  async normalizeBatch(dataArray: CreateMarketDataDto[]): Promise<CreateMarketDataDto[]> {
    const results = await Promise.allSettled(
      dataArray.map(data => this.normalizeData(data))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<CreateMarketDataDto> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }

  addNormalizationRule(source: string, rules: NormalizationRule[]): void {
    this.normalizationRules.set(source, rules);
  }

  removeNormalizationRule(source: string): void {
    this.normalizationRules.delete(source);
  }

  getNormalizationRules(source?: string): NormalizationRule[] {
    return this.normalizationRules.get(source || 'default') || [];
  }

  async validateSymbolConsistency(symbols: string[]): Promise<boolean> {
    const normalizedSymbols = symbols.map(symbol => {
      try {
        return this.normalizeStringField(symbol, { 
          field: 'symbol', 
          type: 'string', 
          required: true, 
          format: '^[A-Z0-9/]+$', 
          min: 1, 
          max: 20 
        });
      } catch {
        return null;
      }
    }).filter(Boolean);

    return normalizedSymbols.length === symbols.length;
  }

  private normalizeStringField(value: any, rule: NormalizationRule): string {
    let normalized = String(value).trim();

    if (rule.format) {
      const regex = new RegExp(rule.format);
      if (!regex.test(normalized)) {
        throw new Error(`String format validation failed for ${normalized}`);
      }
    }

    if (rule.min && normalized.length < rule.min) {
      throw new Error(`String too short (min ${rule.min} characters)`);
    }

    if (rule.max && normalized.length > rule.max) {
      normalized = normalized.substring(0, rule.max);
    }

    return normalized.toUpperCase();
  }
}
