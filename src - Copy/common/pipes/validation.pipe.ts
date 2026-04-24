/**
 * Validation Pipe
 * 
 * Comprehensive input validation using class-validator and class-transformer.
 * Provides DTO validation, SQL injection prevention, and XSS protection.
 */

import {
  PipeTransform,
  Pipe,
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  ValidationError,
} from '@nestjs/common';
import { validate, ValidationError as ClassValidatorValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { sanitizeXSS } from '../utils/sanitizer.util';

/**
 * Configuration for the validation pipe
 */
export interface ValidationPipeConfig {
  /** Whether to transform plain objects to DTO instances */
  transform?: boolean;
  /** Whether to whitelist only validated properties */
  whitelist?: boolean;
  /** Whether to forbid non-whitelisted properties */
  forbidNonWhitelisted?: boolean;
  /** Whether to enable XSS sanitization */
  enableXSSSanitization?: boolean;
  /** Whether to enable SQL injection detection */
  enableSQLInjectionDetection?: boolean;
  /** Custom validation groups */
  groups?: string[];
  /** Skip missing properties */
  skipMissingProperties?: boolean;
  /** Stop at first validation error */
  stopAtFirstError?: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ValidationPipeConfig = {
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  enableXSSSanitization: true,
  enableSQLInjectionDetection: true,
  skipMissingProperties: false,
  stopAtFirstError: false,
};

/**
 * SQL injection patterns to detect
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
  /(--|\#|\/\*|\*\/)/,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
  /(\b(OR|AND)\b\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/i,
  /(;\s*(SELECT|INSERT|UPDATE|DELETE|DROP))/i,
  /(\bEXEC\b|\bEXECUTE\b)/i,
  /(\bxp_\w+)/i,
  /(\bsp_\w+)/i,
];

/**
 * Validation Pipe for comprehensive input validation
 */
@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  private readonly config: ValidationPipeConfig;

  constructor(config?: ValidationPipeConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Transform and validate input
   */
  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    if (!value || typeof value !== 'object') {
      return value;
    }

    // Only validate body, query, and path parameters
    if (metadata.type !== 'body' && metadata.type !== 'query' && metadata.type !== 'param') {
      return value;
    }

    // If no metatype (DTO class), return as-is or validate as plain object
    if (!metadata.metatype) {
      return this.validatePlainObject(value);
    }

    // Transform plain object to DTO instance
    const dto = plainToInstance(metadata.metatype, value, {
      excludeExtraneousValues: this.config.whitelist,
    });

    // Validate DTO
    await this.validateDTO(dto, metadata);

    // Apply XSS sanitization if enabled
    if (this.config.enableXSSSanitization) {
      this.sanitizeValue(dto);
    }

    return dto;
  }

  /**
   * Validate DTO instance
   */
  private async validateDTO(dto: any, metadata: ArgumentMetadata): Promise<void> {
    const errors = await validate(dto, {
      groups: this.config.groups,
      skipMissingProperties: this.config.skipMissingProperties,
      stopAtFirstError: this.config.stopAtFirstError,
      whitelist: this.config.whitelist,
      forbidNonWhitelisted: this.config.forbidNonWhitelisted,
    });

    if (errors.length > 0) {
      throw new BadRequestException(this.formatValidationErrors(errors));
    }

    // Check for SQL injection if enabled
    if (this.config.enableSQLInjectionDetection && metadata.type === 'body') {
      this.detectSQLInjection(dto);
    }
  }

  /**
   * Validate plain object (when no DTO class is provided)
   */
  private validatePlainObject(value: any): any {
    // Apply XSS sanitization
    if (this.config.enableXSSSanitization) {
      return this.sanitizeValue(value);
    }

    // Check for SQL injection
    if (this.config.enableSQLInjectionDetection) {
      this.detectSQLInjection(value);
    }

    return value;
  }

  /**
   * Format validation errors into user-friendly messages
   */
  private formatValidationErrors(errors: ClassValidatorValidationError[]): any {
    const formattedErrors: any = {};

    errors.forEach((error) => {
      const property = error.property;
      const constraints = error.constraints || {};
      
      formattedErrors[property] = Object.values(constraints);
    });

    return {
      statusCode: 400,
      message: 'Validation failed',
      errors: formattedErrors,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Detect SQL injection attempts
   */
  private detectSQLInjection(value: any, path: string = ''): void {
    if (!value || typeof value !== 'object') {
      if (typeof value === 'string') {
        this.checkStringForSQLInjection(value, path);
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        this.detectSQLInjection(item, `${path}[${index}]`);
      });
      return;
    }

    for (const [key, val] of Object.entries(value)) {
      this.detectSQLInjection(val, path ? `${path}.${key}` : key);
    }
  }

  /**
   * Check string for SQL injection patterns
   */
  private checkStringForSQLInjection(value: string, path: string): void {
    if (!value || typeof value !== 'string') {
      return;
    }

    for (const pattern of SQL_INJECTION_PATTERNS) {
      if (pattern.test(value)) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'Potential SQL injection detected',
          field: path,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Sanitize value for XSS
   */
  private sanitizeValue(value: any): any {
    if (!value || typeof value !== 'object') {
      if (typeof value === 'string') {
        return sanitizeXSS(value);
      }
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(item => this.sanitizeValue(item));
    }

    const sanitized: any = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = this.sanitizeValue(val);
    }

    return sanitized;
  }
}
