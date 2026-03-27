import { Scope } from '@nestjs/common/enums/scope.enum';
export declare enum ScopeType {
    DEFAULT = "default",
    REQUEST = "request",
    TRANSIENT = "transient"
}
export declare const SCOPE_KEY = "scope";
export declare const CACHE_KEY = "cache";
export declare const CACHE_TTL_KEY = "cache_ttl";
export declare const SetScope: (scope: Scope | ScopeType) => any;
export declare const Singleton: () => ClassDecorator & MethodDecorator;
export declare const RequestScoped: () => ClassDecorator & MethodDecorator;
export declare const Transient: () => ClassDecorator & MethodDecorator;
export interface CacheableOptions {
    ttl?: number;
    prefix?: string;
    cacheNull?: boolean;
}
export declare const Cacheable: (options?: CacheableOptions) => MethodDecorator;
export interface InvalidateCacheOptions {
    prefix?: string;
    keys?: string[];
    all?: boolean;
}
export declare const InvalidateCache: (options?: InvalidateCacheOptions) => MethodDecorator;
export declare const Lazy: () => PropertyDecorator;
export interface FactoryOptions {
    scope?: Scope | ScopeType;
    inject?: any[];
}
export declare const Factory: (options?: FactoryOptions) => MethodDecorator;
export declare const Tag: (tag: string) => ClassDecorator;
export declare const Alias: (alias: string) => ClassDecorator;
export declare const getScope: (target: any) => Scope | undefined;
export declare const isSingleton: (target: any) => boolean;
export declare const isRequestScoped: (target: any) => boolean;
export declare const isTransient: (target: any) => boolean;
export declare const isCacheable: (target: any, key: string | symbol) => boolean;
export declare const getCacheTTL: (target: any, key: string | symbol) => number | undefined;
export declare const getTags: (target: any) => string[];
export declare const getAlias: (target: any) => string | undefined;
export interface ScopedDependency {
    token: any;
    scope: ScopeType;
    eager?: boolean;
}
export declare const getScopedDependencies: (dependencies: any[], scopes: Map<any, ScopeType>) => ScopedDependency[];
