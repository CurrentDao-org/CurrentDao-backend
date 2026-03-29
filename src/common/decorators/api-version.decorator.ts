/**
 * API Version Decorator
 *
 * Decorator to set API version on endpoints and mark deprecated versions.
 */

import { SetMetadata } from '@nestjs/common';
import {
  ApiVersionMetadata,
  DEFAULT_API_VERSION,
} from '../interfaces/response.interface';

/**
 * Metadata key for API version
 */
export const API_VERSION_KEY = 'api_version';

/**
 * Decorator options
 */
export interface ApiVersionOptions {
  /** API version (e.g., '1.0', '2.0') */
  version: string;
  /** Whether this endpoint is deprecated */
  deprecated?: boolean;
  /** Deprecation message */
  deprecationMessage?: string;
}

/**
 * Set API version on endpoint
 *
 * @example
 * ```typescript
 * @Controller('users')
 * @ApiVersion({ version: '1.0' })
 * export class UsersController {}
 *
 * @Get()
 * @ApiVersion({ version: '1.0' })
 * findAll() {}
 * ```
 */
export const ApiVersion = (options: ApiVersionOptions) => {
  const metadata: ApiVersionMetadata = {
    version: options.version || DEFAULT_API_VERSION,
    deprecated: options.deprecated || false,
    deprecationMessage: options.deprecationMessage,
  };
  return SetMetadata(API_VERSION_KEY, metadata);
};

/**
 * Mark endpoint as deprecated
 *
 * @example
 * @Get('old-endpoint')
 * @Deprecated({ deprecationMessage: 'Use /v2/users instead' })
 * oldEndpoint() {}
 */
export const Deprecated = (options?: { deprecationMessage?: string }) => {
  return SetMetadata(API_VERSION_KEY, {
    version: DEFAULT_API_VERSION,
    deprecated: true,
    deprecationMessage:
      options?.deprecationMessage || 'This endpoint is deprecated',
  } as ApiVersionMetadata);
};

/**
 * Get API version from request
 * Can be used in interceptors/filters to get version from request
 */
export const getApiVersion = (target: any): string => {
  return (
    Reflect.getMetadata(API_VERSION_KEY, target) ||
    Reflect.getMetadata(API_VERSION_KEY, target.constructor) ||
    DEFAULT_API_VERSION
  );
};

/**
 * Check if endpoint is deprecated
 */
export const isDeprecated = (target: any): boolean => {
  const metadata =
    Reflect.getMetadata(API_VERSION_KEY, target) ||
    Reflect.getMetadata(API_VERSION_KEY, target.constructor);
  return metadata?.deprecated || false;
};

/**
 * Get deprecation message
 */
export const getDeprecationMessage = (target: any): string | undefined => {
  const metadata =
    Reflect.getMetadata(API_VERSION_KEY, target) ||
    Reflect.getMetadata(API_VERSION_KEY, target.constructor);
  return metadata?.deprecationMessage;
};
