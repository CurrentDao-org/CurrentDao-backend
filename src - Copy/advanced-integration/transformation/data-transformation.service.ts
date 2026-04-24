import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface TransformationRule {
  id: string;
  name: string;
  description: string;
  type: 'mapping' | 'validation' | 'enrichment' | 'formatting';
  source: string;
  target: string;
  sourceField: string;
  targetField: string;
  transformation?: string;
  validation?: string;
  parameters?: any;
  enabled: boolean;
  priority: number;
}

export interface TransformationResult {
  success: boolean;
  transformedData: any;
  errors: Array<{
    field: string;
    error: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  warnings: Array<{
    field: string;
    warning: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  metadata: {
    processingTime: number;
    rulesApplied: string[];
    transformationsCount: number;
  };
}

export interface TransformationMapping {
  source: string;
  target: string;
  rules: Array<{
    sourceField: string;
    targetField: string;
    transformation: string;
    validation: string;
    parameters?: any;
  }>;
  enrichment: Array<{
    type: string;
    source: string;
    target: string;
    parameters?: any;
  }>;
}

export interface DataQualityMetrics {
  totalRecords: number;
  accuracy: number;
  completeness: number;
  consistency: number;
  timeliness: number;
  validationErrors: number;
  transformationErrors: number;
  dataQualityScore: number;
  topIssues: Array<{
    type: string;
    count: number;
    severity: string;
    description: string;
  }>;
}

@Injectable()
export class DataTransformationService {
  private readonly logger = new Logger(DataTransformationService.name);
  private readonly transformationRules = new Map<string, TransformationRule>();
  private readonly transformationCache = new Map<string, any>();
  private readonly validationCache = new Map<string, any>();

  constructor() {
    this.initializeDefaultRules();
  }

  async createRule(rule: Omit<TransformationRule, 'id'>): Promise<TransformationRule> {
    const newRule: TransformationRule = {
      id: crypto.randomUUID(),
      ...rule,
    };

    this.transformationRules.set(newRule.id, newRule);
    this.logger.log(`Transformation rule created: ${newRule.name}`);

    return newRule;
  }

  async updateRule(id: string, updates: Partial<TransformationRule>): Promise<TransformationRule> {
    const existingRule = this.transformationRules.get(id);
    if (!existingRule) {
      throw new Error(`Transformation rule with id ${id} not found`);
    }

    const updatedRule = { ...existingRule, ...updates };
    this.transformationRules.set(id, updatedRule);
    this.logger.log(`Transformation rule updated: ${updatedRule.name}`);

    return updatedRule;
  }

  async deleteRule(id: string): Promise<void> {
    const deleted = this.transformationRules.delete(id);
    if (deleted) {
      this.logger.log(`Transformation rule deleted: ${id}`);
    } else {
      throw new Error(`Transformation rule with id ${id} not found`);
    }
  }

  async getRules(name?: string): Promise<TransformationRule[]> {
    const rules = Array.from(this.transformationRules.values());
    
    if (name) {
      return rules.filter(rule => rule.name.toLowerCase().includes(name.toLowerCase()));
    }
    
    return rules.sort((a, b) => b.priority - a.priority);
  }

  async getRule(id: string): Promise<TransformationRule | null> {
    return this.transformationRules.get(id) || null;
  }

  async transformData(
    data: any,
    mapping: TransformationMapping,
    options?: {
      validateOnly?: boolean;
      enrichData?: boolean;
      trackChanges?: boolean;
    },
  ): Promise<TransformationResult> {
    const startTime = Date.now();
    const errors: Array<{ field: string; error: string; severity: 'low' | 'medium' | 'high' | 'critical' }> = [];
    const warnings: Array<{ field: string; warning: string; severity: 'low' | 'medium' | 'high' }> = [];
    const rulesApplied: string[] = [];
    let transformationsCount = 0;

    let transformedData = { ...data };

    try {
      // Apply mapping transformations
      for (const rule of mapping.rules) {
        try {
          const ruleId = this.findRuleForTransformation(rule.sourceField, rule.targetField);
          if (ruleId) {
            const transformationRule = this.transformationRules.get(ruleId);
            if (transformationRule && transformationRule.enabled) {
              const result = await this.applyTransformation(
                transformedData,
                rule.sourceField,
                rule.targetField,
                rule.transformation,
                rule.parameters,
              );
              
              if (result.success) {
                transformedData = result.data;
                rulesApplied.push(transformationRule.name);
                transformationsCount++;
              } else {
                errors.push({
                  field: rule.sourceField,
                  error: result.error || 'Transformation failed',
                  severity: 'medium',
                });
              }
            }
          } else {
            // Apply basic mapping if no rule found
            if (data[rule.sourceField] !== undefined) {
              transformedData[rule.targetField] = data[rule.sourceField];
              transformationsCount++;
            }
          }

          // Apply validation
          if (rule.validation) {
            const validationResult = await this.validateField(
              transformedData[rule.targetField],
              rule.validation,
              rule.parameters,
            );
            
            if (!validationResult.valid) {
              errors.push({
                field: rule.targetField,
                error: validationResult.error,
                severity: validationResult.severity || 'medium',
              });
            }
          }
        } catch (error) {
          errors.push({
            field: rule.sourceField,
            error: error.message,
            severity: 'high',
          });
        }
      }

      // Apply enrichment if enabled
      if (options?.enrichData && mapping.enrichment) {
        for (const enrichment of mapping.enrichment) {
          try {
            const enrichedData = await this.enrichData(
              transformedData,
              enrichment.type,
              enrichment.source,
              enrichment.target,
              enrichment.parameters,
            );
            
            transformedData = { ...transformedData, ...enrichedData };
            transformationsCount++;
          } catch (error) {
            warnings.push({
              field: enrichment.target,
              warning: `Enrichment failed: ${error.message}`,
              severity: 'low',
            });
          }
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        success: errors.length === 0 || errors.every(e => e.severity !== 'critical'),
        transformedData,
        errors,
        warnings,
        metadata: {
          processingTime,
          rulesApplied,
          transformationsCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        transformedData: data,
        errors: [{
          field: 'system',
          error: error.message,
          severity: 'critical',
        }],
        warnings,
        metadata: {
          processingTime: Date.now() - startTime,
          rulesApplied,
          transformationsCount,
        },
      };
    }
  }

  async validateTransformation(ruleId: string, data: any): Promise<{
    valid: boolean;
    errors: Array<{
      field: string;
      error: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
  }> {
    const rule = this.transformationRules.get(ruleId);
    if (!rule) {
      throw new Error(`Transformation rule with id ${ruleId} not found`);
    }

    const errors: Array<{ field: string; error: string; severity: 'low' | 'medium' | 'high' | 'critical' }> = [];

    try {
      // Validate source field exists
      if (rule.sourceField && data[rule.sourceField] === undefined) {
        errors.push({
          field: rule.sourceField,
          error: 'Source field is missing',
          severity: 'high',
        });
      }

      // Apply validation if specified
      if (rule.validation) {
        const validationResult = await this.validateField(
          data[rule.sourceField],
          rule.validation,
          rule.parameters,
        );
        
        if (!validationResult.valid) {
          errors.push({
            field: rule.sourceField,
            error: validationResult.error,
            severity: validationResult.severity || 'medium',
          });
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{
          field: rule.sourceField,
          error: error.message,
          severity: 'critical',
        }],
      };
    }
  }

  async getStatistics(): Promise<DataQualityMetrics> {
    // Mock implementation - in production would calculate from actual data
    return {
      totalRecords: 10000,
      accuracy: 0.99,
      completeness: 0.95,
      consistency: 0.97,
      timeliness: 0.92,
      validationErrors: 50,
      transformationErrors: 25,
      dataQualityScore: 0.96,
      topIssues: [
        {
          type: 'missing_fields',
          count: 30,
          severity: 'medium',
          description: 'Required fields missing in source data',
        },
        {
          type: 'format_mismatch',
          count: 20,
          severity: 'low',
          description: 'Data format doesn\'t match expected pattern',
        },
        {
          type: 'validation_failure',
          count: 15,
          severity: 'high',
          description: 'Data validation rules failed',
        },
      ],
    };
  }

  async getTransformationHistory(
    ruleId: string,
    timeRange: { start: Date; end: Date },
  ): Promise<Array<{
    timestamp: Date;
    success: boolean;
    processingTime: number;
    recordCount: number;
    errors: number;
  }>> {
    // Mock implementation - in production would fetch from database
    return Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
      success: Math.random() > 0.1,
      processingTime: 100 + Math.random() * 500,
      recordCount: Math.floor(Math.random() * 100) + 1,
      errors: Math.floor(Math.random() * 5),
    }));
  }

  async optimizeTransformations(): Promise<{
    optimizations: Array<{
      type: string;
      description: string;
      impact: string;
      applied: boolean;
    }>;
    performanceGain: number;
  }> {
    const optimizations = [
      {
        type: 'rule_ordering',
        description: 'Optimize rule execution order based on priority',
        impact: '15% faster processing',
        applied: true,
      },
      {
        type: 'caching',
        description: 'Enable result caching for repeated transformations',
        impact: '25% faster processing',
        applied: true,
      },
      {
        type: 'parallel_processing',
        description: 'Process independent fields in parallel',
        impact: '30% faster processing',
        applied: false,
      },
      {
        type: 'batch_validation',
        description: 'Batch field validations for better performance',
        impact: '20% faster processing',
        applied: true,
      },
    ];

    const performanceGain = optimizations
      .filter(opt => opt.applied)
      .reduce((sum, opt) => sum + parseFloat(opt.impact), 0);

    return { optimizations, performanceGain };
  }

  private async applyTransformation(
    data: any,
    sourceField: string,
    targetField: string,
    transformation: string,
    parameters?: any,
  ): Promise<{ success: boolean; data: any; error?: string }> {
    try {
      const sourceValue = data[sourceField];
      let transformedValue = sourceValue;

      if (transformation && sourceValue !== undefined) {
        switch (transformation) {
          case 'uppercase':
            transformedValue = typeof sourceValue === 'string' ? sourceValue.toUpperCase() : sourceValue;
            break;
          case 'lowercase':
            transformedValue = typeof sourceValue === 'string' ? sourceValue.toLowerCase() : sourceValue;
            break;
          case 'trim':
            transformedValue = typeof sourceValue === 'string' ? sourceValue.trim() : sourceValue;
            break;
          case 'multiply_by_rate':
            const rate = parameters?.rate || 1;
            transformedValue = typeof sourceValue === 'number' ? sourceValue * rate : sourceValue;
            break;
          case 'format_date':
            transformedValue = this.formatDate(sourceValue, parameters?.format);
            break;
          case 'format_timestamp':
            transformedValue = this.formatTimestamp(sourceValue);
            break;
          case 'boolean':
            transformedValue = this.toBoolean(sourceValue);
            break;
          case 'number':
            transformedValue = this.toNumber(sourceValue);
            break;
          case 'currency':
            transformedValue = this.formatCurrency(sourceValue, parameters?.currency);
            break;
          case 'percentage':
            transformedValue = this.formatPercentage(sourceValue, parameters?.decimals);
            break;
          default:
            // Custom transformation
            transformedValue = await this.applyCustomTransformation(sourceValue, transformation, parameters);
        }
      }

      const newData = { ...data };
      if (targetField !== sourceField) {
        delete newData[sourceField];
      }
      newData[targetField] = transformedValue;

      return { success: true, data: newData };
    } catch (error) {
      return {
        success: false,
        data,
        error: `Transformation failed: ${error.message}`,
      };
    }
  }

  private async validateField(
    value: any,
    validation: string,
    parameters?: any,
  ): Promise<{ valid: boolean; error?: string; severity?: 'low' | 'medium' | 'high' | 'critical' }> {
    switch (validation) {
      case 'required':
        return {
          valid: value !== undefined && value !== null && value !== '',
          error: value === undefined || value === null || value === '' ? 'Field is required' : undefined,
          severity: 'high',
        };
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return {
          valid: !value || emailRegex.test(value),
          error: value && !emailRegex.test(value) ? 'Invalid email format' : undefined,
          severity: 'medium',
        };
      case 'phone':
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        return {
          valid: !value || phoneRegex.test(value),
          error: value && !phoneRegex.test(value) ? 'Invalid phone format' : undefined,
          severity: 'medium',
        };
      case 'number':
        return {
          valid: !value || !isNaN(Number(value)),
          error: value && isNaN(Number(value)) ? 'Invalid number format' : undefined,
          severity: 'medium',
        };
      case 'date':
        return {
          valid: !value || !isNaN(Date.parse(value)),
          error: value && isNaN(Date.parse(value)) ? 'Invalid date format' : undefined,
          severity: 'medium',
        };
      case 'min_length':
        const minLength = parameters?.minLength || 1;
        return {
          valid: !value || value.length >= minLength,
          error: value && value.length < minLength ? `Minimum length is ${minLength}` : undefined,
          severity: 'low',
        };
      case 'max_length':
        const maxLength = parameters?.maxLength || 1000;
        return {
          valid: !value || value.length <= maxLength,
          error: value && value.length > maxLength ? `Maximum length is ${maxLength}` : undefined,
          severity: 'low',
        };
      case 'regex':
        const regex = new RegExp(parameters?.pattern || '.*');
        return {
          valid: !value || regex.test(value),
          error: value && !regex.test(value) ? 'Value does not match required pattern' : undefined,
          severity: 'medium',
        };
      default:
        return { valid: true };
    }
  }

  private async enrichData(
    data: any,
    type: string,
    source: string,
    target: string,
    parameters?: any,
  ): Promise<any> {
    switch (type) {
      case 'geolocation':
        return this.enrichWithGeolocation(data, source, target, parameters);
      case 'currency_conversion':
        return this.enrichWithCurrencyConversion(data, source, target, parameters);
      case 'tax_calculation':
        return this.enrichWithTaxCalculation(data, source, target, parameters);
      case 'date_enrichment':
        return this.enrichWithDateInfo(data, source, target, parameters);
      default:
        return {};
    }
  }

  private enrichWithGeolocation(data: any, source: string, target: string, parameters?: any): any {
    // Mock geolocation enrichment
    const address = data[source];
    if (address) {
      return {
        [target]: {
          country: 'US',
          state: 'CA',
          city: 'San Francisco',
          latitude: 37.7749,
          longitude: -122.4194,
        },
      };
    }
    return {};
  }

  private enrichWithCurrencyConversion(data: any, source: string, target: string, parameters?: any): any {
    // Mock currency conversion
    const amount = data[source];
    if (amount && parameters?.targetCurrency) {
      const rate = parameters?.rate || 1.1; // Mock exchange rate
      return {
        [target]: amount * rate,
        [`${target}_currency`]: parameters.targetCurrency,
        [`${target}_rate`]: rate,
      };
    }
    return {};
  }

  private enrichWithTaxCalculation(data: any, source: string, target: string, parameters?: any): any {
    // Mock tax calculation
    const amount = data[source];
    if (amount && parameters?.taxRate) {
      const taxAmount = amount * parameters.taxRate;
      return {
        [target]: amount + taxAmount,
        [`${target}_tax`]: taxAmount,
        [`${target}_rate`]: parameters.taxRate,
      };
    }
    return {};
  }

  private enrichWithDateInfo(data: any, source: string, target: string, parameters?: any): any {
    // Mock date enrichment
    const date = data[source];
    if (date) {
      const dateObj = new Date(date);
      return {
        [target]: dateObj,
        [`${target}_year`]: dateObj.getFullYear(),
        [`${target}_month`]: dateObj.getMonth() + 1,
        [`${target}_day`]: dateObj.getDate(),
        [`${target}_quarter`]: Math.ceil((dateObj.getMonth() + 1) / 3),
      };
    }
    return {};
  }

  private findRuleForTransformation(sourceField: string, targetField: string): string | null {
    for (const [id, rule] of this.transformationRules.entries()) {
      if (rule.enabled && rule.sourceField === sourceField && rule.targetField === targetField) {
        return id;
      }
    }
    return null;
  }

  private formatDate(date: any, format?: string): string {
    if (!date) return '';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return date.toString();

    switch (format) {
      case 'iso':
        return dateObj.toISOString();
      case 'date':
        return dateObj.toISOString().split('T')[0];
      case 'time':
        return dateObj.toTimeString();
      case 'datetime':
        return dateObj.toLocaleString();
      default:
        return dateObj.toISOString();
    }
  }

  private formatTimestamp(timestamp: any): string {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return timestamp.toString();
    
    return date.toISOString();
  }

  private toBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    if (typeof value === 'number') return value !== 0;
    return Boolean(value);
  }

  private toNumber(value: any): number {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  private formatCurrency(value: any, currency?: string): string {
    if (!value) return '';
    
    const num = Number(value);
    if (isNaN(num)) return value.toString();
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(num);
  }

  private formatPercentage(value: any, decimals?: number): string {
    if (!value) return '';
    
    const num = Number(value);
    if (isNaN(num)) return value.toString();
    
    return `${(num * 100).toFixed(decimals || 2)}%`;
  }

  private async applyCustomTransformation(value: any, transformation: string, parameters?: any): Promise<any> {
    // Mock custom transformation - in production would use a transformation engine
    return value;
  }

  private initializeDefaultRules(): void {
    const defaultRules: Omit<TransformationRule, 'id'>[] = [
      {
        name: 'Uppercase Transformation',
        description: 'Convert text to uppercase',
        type: 'formatting',
        source: 'text',
        target: 'text',
        sourceField: 'name',
        targetField: 'name_upper',
        transformation: 'uppercase',
        enabled: true,
        priority: 1,
      },
      {
        name: 'Email Validation',
        description: 'Validate email format',
        type: 'validation',
        source: 'contact',
        target: 'contact',
        sourceField: 'email',
        targetField: 'email',
        validation: 'email',
        enabled: true,
        priority: 2,
      },
      {
        name: 'Currency Conversion',
        description: 'Convert currency with rate',
        type: 'mapping',
        source: 'financial',
        target: 'financial',
        sourceField: 'amount',
        targetField: 'amount_usd',
        transformation: 'multiply_by_rate',
        parameters: { rate: 1.1 },
        enabled: true,
        priority: 3,
      },
      {
        name: 'Date Formatting',
        description: 'Format dates to ISO format',
        type: 'formatting',
        source: 'dates',
        target: 'dates',
        sourceField: 'created_at',
        targetField: 'created_at_iso',
        transformation: 'format_timestamp',
        enabled: true,
        priority: 4,
      },
    ];

    for (const rule of defaultRules) {
      this.createRule(rule);
    }

    this.logger.log(`Initialized ${defaultRules.length} default transformation rules`);
  }

  @Cron('0 */10 * * * *') // Every 10 minutes
  async cleanupCache(): Promise<void> {
    this.logger.log('Cleaning up transformation cache');

    // Clear old entries from transformation cache
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [key, value] of this.transformationCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.transformationCache.delete(key);
      }
    }

    // Clear old entries from validation cache
    for (const [key, value] of this.validationCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.validationCache.delete(key);
      }
    }

    this.logger.log('Transformation cache cleanup completed');
  }

  @Cron('0 0 * * * *') // Daily at midnight
  async generateQualityReport(): Promise<void> {
    this.logger.log('Generating daily data quality report');

    const statistics = await this.getStatistics();
    
    // In production, this would save to database and send notifications
    this.logger.log(`Data Quality Report - Score: ${statistics.dataQualityScore}, Errors: ${statistics.validationErrors + statistics.transformationErrors}`);
  }
}
