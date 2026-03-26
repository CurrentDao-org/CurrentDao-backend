/**
 * Transform Pipe
 * 
 * Transform and filter sensitive data from request/response.
 * Used for data sanitization and filtering.
 */

import {
  PipeTransform,
  Pipe,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FilterOptions } from '../interfaces/response.interface';

/**
 * Default sensitive fields to filter
 */
export const DEFAULT_SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'secret',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'apiSecret',
  'privateKey',
  'secretKey',
  'creditCard',
  'ssn',
  'socialSecurityNumber',
  'dateOfBirth',
  'birthDate',
];

/**
 * Configuration for the transform pipe
 */
export interface TransformPipeConfig {
  /** Fields to exclude from response */
  exclude?: string[];
  /** Fields to include (overrides exclude) */
  include?: string[];
  /** Whether to recursively filter nested objects */
  recursive?: boolean;
  /** Custom transform function */
  transform?: (key: string, value: unknown) => unknown;
  /** Whether to mask instead of remove */
  maskInsteadOfRemove?: boolean;
  /** Mask character */
  maskChar?: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TransformPipeConfig = {
  exclude: DEFAULT_SENSITIVE_FIELDS,
  recursive: true,
  maskInsteadOfRemove: false,
  maskChar: '*',
};

/**
 * Transform Pipe for filtering sensitive data
 */
@Injectable()
export class TransformPipe implements PipeTransform {
  private readonly logger = new Logger(TransformPipe.name);
  private readonly config: TransformPipeConfig;

  constructor(config?: TransformPipeConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Transform method
   */
  transform(value: any, metadata: ArgumentMetadata): any {
    // Only transform body and query parameters
    if (metadata.type !== 'body' && metadata.type !== 'query') {
      return value;
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    return this.filterSensitiveData(value);
  }

  /**
   * Filter sensitive data from object
   */
  private filterSensitiveData(data: any): any {
    if (Array.isArray(data)) {
      return data.map(item => this.filterSensitiveData(item));
    }

    if (typeof data === 'object' && data !== null) {
      const filtered: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        if (this.isSensitiveField(key)) {
          // Apply mask or removal
          if (this.config.maskInsteadOfRemove) {
            filtered[key] = this.maskValue(value);
          }
          // Skip sensitive fields (don't include them)
        } else if (this.config.recursive && typeof value === 'object' && value !== null) {
          filtered[key] = this.filterSensitiveData(value);
        } else {
          filtered[key] = value;
        }
      }

      return filtered;
    }

    return data;
  }

  /**
   * Check if field is sensitive
   */
  private isSensitiveField(key: string): boolean {
    const lowerKey = key.toLowerCase();
    
    // Check if include list is provided
    if (this.config.include && this.config.include.length > 0) {
      return this.config.include.some(field => 
        field.toLowerCase() === lowerKey
      );
    }

    // Check exclude list
    const excludeList = this.config.exclude || DEFAULT_SENSITIVE_FIELDS;
    return excludeList.some(field => 
      field.toLowerCase() === lowerKey
    );
  }

  /**
   * Mask sensitive value
   */
  private maskValue(value: unknown): string {
    const maskChar = this.config.maskChar || '*';
    if (typeof value === 'string' && value.length > 0) {
      // Keep first and last character, mask middle
      return value[0] + maskChar.repeat(Math.min(value.length - 2, 8)) + value[value.length - 1];
    }
    return maskChar.repeat(8);
  }
}

/**
 * Decorator to mark fields as sensitive for filtering
 */
export const Sensitive = (fieldName: string) => {
  return (target: any, key: string) => {
    const sensitiveFields = Reflect.getMetadata('sensitive_fields', target.constructor) || [];
    sensitiveFields.push(fieldName);
    Reflect.defineMetadata('sensitive_fields', sensitiveFields, target.constructor);
  };
};

/**
 * Function to create a filter for sensitive data
 */
export const createSensitiveDataFilter = (
  sensitiveFields: string[],
  maskInsteadOfRemove: boolean = false,
) => {
  const filter = new TransformPipe({
    exclude: sensitiveFields,
    maskInsteadOfRemove,
    recursive: true,
  });
  
  return (data: any) => {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    return filter.transform(data, { type: 'body' } as ArgumentMetadata);
  };
};

/**
 * Transform plain object to filtered response
 */
export const toFilteredResponse = <T extends Record<string, any>>(
  data: T,
  options?: {
    exclude?: string[];
    include?: string[];
    maskInsteadOfRemove?: boolean;
  },
): T => {
  const pipe = new TransformPipe({
    exclude: options?.exclude,
    include: options?.include,
    maskInsteadOfRemove: options?.maskInsteadOfRemove ?? false,
    recursive: true,
  });

  return pipe.transform(data, { type: 'body' } as ArgumentMetadata) as T;
};

/**
 * Transform array of objects to filtered responses
 */
export const toFilteredArray = <T extends Record<string, any>>(
  data: T[],
  options?: {
    exclude?: string[];
    include?: string[];
    maskInsteadOfRemove?: boolean;
  },
): T[] => {
  return data.map(item => toFilteredResponse(item, options));
};

/**
 * Remove sensitive fields from object (alias for backward compatibility)
 */
export const removeSensitiveFields = <T extends Record<string, any>>(
  data: T,
  fieldsToRemove?: string[],
): T => {
  return toFilteredResponse(data, {
    exclude: fieldsToRemove || DEFAULT_SENSITIVE_FIELDS,
    maskInsteadOfRemove: false,
  });
};

/**
 * Mask sensitive fields in object
 */
export const maskSensitiveFields = <T extends Record<string, any>>(
  data: T,
  fieldsToMask?: string[],
): T => {
  return toFilteredResponse(data, {
    exclude: fieldsToMask || DEFAULT_SENSITIVE_FIELDS,
    maskInsteadOfRemove: true,
  });
};
