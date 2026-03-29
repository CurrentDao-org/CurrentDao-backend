/**
 * Scope Decorator
 *
 * Decorators for defining provider scope and lifecycle in NestJS DI.
 * Supports singleton, request-scoped, and transient providers.
 */

import { SetMetadata, Scope as NestScope, Injectable } from '@nestjs/common';
import { Scope } from '@nestjs/common/enums/scope.enum';

/**
 * Scope type enum
 */
export enum ScopeType {
  /** Single instance for entire application */
  DEFAULT = 'default',
  /** New instance per request */
  REQUEST = 'request',
  /** New instance per injection */
  TRANSIENT = 'transient',
}

/**
 * Metadata keys
 */
export const SCOPE_KEY = 'scope';
export const CACHE_KEY = 'cache';
export const CACHE_TTL_KEY = 'cache_ttl';

/**
 * Set provider scope
 *
 * @example
 * ```typescript
 * @Injectable({ scope: Scope.DEFAULT })
 * export class MyService {}
 *
 * @Injectable({ scope: Scope.REQUEST })
 * export class RequestScopedService {}
 * ```
 */
export const SetScope = (scope: Scope | ScopeType) => {
  return SetMetadata(SCOPE_KEY, scope);
};

/**
 * Mark service as singleton (default)
 *
 * @example
 * @Singleton()
 * export class MySingletonService {}
 */
export const Singleton = (): ClassDecorator & MethodDecorator => {
  return (
    target: any,
    key?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    SetScope(Scope.DEFAULT)(target, key, descriptor);
    Injectable()(target);
    return descriptor || target;
  };
};

/**
 * Mark service as request-scoped
 *
 * @example
 * @RequestScoped()
 * export class RequestService {}
 */
export const RequestScoped = (): ClassDecorator & MethodDecorator => {
  return (
    target: any,
    key?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    SetScope(Scope.REQUEST)(target, key, descriptor);
    Injectable({ scope: Scope.REQUEST })(target);
    return descriptor || target;
  };
};

/**
 * Mark service as transient
 *
 * @example
 * @Transient()
 * export class TransientService {}
 */
export const Transient = (): ClassDecorator & MethodDecorator => {
  return (
    target: any,
    key?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    SetScope(Scope.TRANSIENT)(target, key, descriptor);
    Injectable({ scope: Scope.TRANSIENT })(target);
    return descriptor || target;
  };
};

/**
 * Mark service as cacheable
 *
 * @example
 * @Cacheable({ ttl: 60000 })
 * async getData() {}
 */
export interface CacheableOptions {
  /** Time to live in milliseconds */
  ttl?: number;
  /** Cache key prefix */
  prefix?: string;
  /** Whether to cache null values */
  cacheNull?: boolean;
}

export const Cacheable = (options?: CacheableOptions): MethodDecorator => {
  return (
    target: any,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    SetMetadata(CACHE_KEY, true)(target, key, descriptor);
    if (options?.ttl) {
      SetMetadata(CACHE_TTL_KEY, options.ttl)(target, key, descriptor);
    }
    return descriptor;
  };
};

/**
 * Invalidate cache decorator
 *
 * @example
 * @InvalidateCache({ prefix: 'users' })
 * async updateUser() {}
 */
export interface InvalidateCacheOptions {
  /** Cache key prefix to invalidate */
  prefix?: string;
  /** Specific keys to invalidate */
  keys?: string[];
  /** Invalidate all */
  all?: boolean;
}

export const InvalidateCache = (
  options?: InvalidateCacheOptions,
): MethodDecorator => {
  return (
    target: any,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    SetMetadata('invalidate_cache', options || true)(target, key, descriptor);
    return descriptor;
  };
};

/**
 * Lazy load decorator - for lazy loading heavy dependencies
 *
 * @example
 * @Lazy()
 * private heavyService: HeavyService;
 */
export const Lazy = (): PropertyDecorator => {
  return (target: any, propertyKey: string | symbol) => {
    SetMetadata('lazy', true)(target, propertyKey);
  };
};

/**
 * Factory decorator - for custom provider factories
 *
 * @example
 * @Factory({ scope: Scope.DEFAULT })
 * createMyService() {
 *   return new MyService();
 * }
 */
export interface FactoryOptions {
  /** Scope for the factory */
  scope?: Scope | ScopeType;
  /** Whether to inject dependencies */
  inject?: any[];
}

export const Factory = (options?: FactoryOptions): MethodDecorator => {
  return (
    target: any,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    if (options?.scope) {
      SetScope(options.scope)(target, key, descriptor);
    }
    SetMetadata('factory', true)(target, key, descriptor);
    return descriptor;
  };
};

/**
 * Tag decorator for grouping providers
 *
 * @example
 * @Tag('database')
 * export class DatabaseService {}
 *
 * @Tag('cache')
 * export class CacheService {}
 */
export const Tag = (tag: string): ClassDecorator => {
  return (target: any) => {
    SetMetadata('tags', [...(Reflect.getMetadata('tags', target) || []), tag])(
      target,
    );
    return target;
  };
};

/**
 * Alias decorator for creating provider aliases
 *
 * @example
 * @Alias('EntityManager')
 * export class CustomEntityManager {}
 */
export const Alias = (alias: string): ClassDecorator => {
  return (target: any) => {
    SetMetadata('alias', alias)(target);
    return target;
  };
};

/**
 * Get scope from target
 */
export const getScope = (target: any): Scope | undefined => {
  return Reflect.getMetadata(SCOPE_KEY, target);
};

/**
 * Check if service is singleton
 */
export const isSingleton = (target: any): boolean => {
  const scope = getScope(target);
  return !scope || scope === Scope.DEFAULT;
};

/**
 * Check if service is request-scoped
 */
export const isRequestScoped = (target: any): boolean => {
  const scope = getScope(target);
  return scope === Scope.REQUEST;
};

/**
 * Check if service is transient
 */
export const isTransient = (target: any): boolean => {
  const scope = getScope(target);
  return scope === Scope.TRANSIENT;
};

/**
 * Check if method is cacheable
 */
export const isCacheable = (target: any, key: string | symbol): boolean => {
  return Reflect.getMetadata(CACHE_KEY, target, key) === true;
};

/**
 * Get cache TTL for method
 */
export const getCacheTTL = (
  target: any,
  key: string | symbol,
): number | undefined => {
  return Reflect.getMetadata(CACHE_TTL_KEY, target, key);
};

/**
 * Get tags from target
 */
export const getTags = (target: any): string[] => {
  return Reflect.getMetadata('tags', target) || [];
};

/**
 * Get alias from target
 */
export const getAlias = (target: any): string | undefined => {
  return Reflect.getMetadata('alias', target);
};

/**
 * Helper to get all scoped dependencies
 */
export interface ScopedDependency {
  /** Dependency token */
  token: any;
  /** Scope type */
  scope: ScopeType;
  /** Whether it's eager loaded */
  eager?: boolean;
}

/**
 * Get scoped dependencies for a module
 */
export const getScopedDependencies = (
  dependencies: any[],
  scopes: Map<any, ScopeType>,
): ScopedDependency[] => {
  return dependencies.map((dep) => ({
    token: dep,
    scope: scopes.get(dep) || ScopeType.DEFAULT,
  }));
};
