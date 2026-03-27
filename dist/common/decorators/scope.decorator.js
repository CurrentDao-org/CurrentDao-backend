"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getScopedDependencies = exports.getAlias = exports.getTags = exports.getCacheTTL = exports.isCacheable = exports.isTransient = exports.isRequestScoped = exports.isSingleton = exports.getScope = exports.Alias = exports.Tag = exports.Factory = exports.Lazy = exports.InvalidateCache = exports.Cacheable = exports.Transient = exports.RequestScoped = exports.Singleton = exports.SetScope = exports.CACHE_TTL_KEY = exports.CACHE_KEY = exports.SCOPE_KEY = exports.ScopeType = void 0;
const common_1 = require("@nestjs/common");
const scope_enum_1 = require("@nestjs/common/enums/scope.enum");
var ScopeType;
(function (ScopeType) {
    ScopeType["DEFAULT"] = "default";
    ScopeType["REQUEST"] = "request";
    ScopeType["TRANSIENT"] = "transient";
})(ScopeType || (exports.ScopeType = ScopeType = {}));
exports.SCOPE_KEY = 'scope';
exports.CACHE_KEY = 'cache';
exports.CACHE_TTL_KEY = 'cache_ttl';
const SetScope = (scope) => {
    return (0, common_1.SetMetadata)(exports.SCOPE_KEY, scope);
};
exports.SetScope = SetScope;
const Singleton = () => {
    return (target, key, descriptor) => {
        (0, exports.SetScope)(scope_enum_1.Scope.DEFAULT)(target, key, descriptor);
        (0, common_1.Injectable)()(target);
        return descriptor || target;
    };
};
exports.Singleton = Singleton;
const RequestScoped = () => {
    return (target, key, descriptor) => {
        (0, exports.SetScope)(scope_enum_1.Scope.REQUEST)(target, key, descriptor);
        (0, common_1.Injectable)({ scope: scope_enum_1.Scope.REQUEST })(target);
        return descriptor || target;
    };
};
exports.RequestScoped = RequestScoped;
const Transient = () => {
    return (target, key, descriptor) => {
        (0, exports.SetScope)(scope_enum_1.Scope.TRANSIENT)(target, key, descriptor);
        (0, common_1.Injectable)({ scope: scope_enum_1.Scope.TRANSIENT })(target);
        return descriptor || target;
    };
};
exports.Transient = Transient;
const Cacheable = (options) => {
    return (target, key, descriptor) => {
        (0, common_1.SetMetadata)(exports.CACHE_KEY, true)(target, key, descriptor);
        if (options?.ttl) {
            (0, common_1.SetMetadata)(exports.CACHE_TTL_KEY, options.ttl)(target, key, descriptor);
        }
        return descriptor;
    };
};
exports.Cacheable = Cacheable;
const InvalidateCache = (options) => {
    return (target, key, descriptor) => {
        (0, common_1.SetMetadata)('invalidate_cache', options || true)(target, key, descriptor);
        return descriptor;
    };
};
exports.InvalidateCache = InvalidateCache;
const Lazy = () => {
    return (target, propertyKey) => {
        (0, common_1.SetMetadata)('lazy', true)(target, propertyKey);
    };
};
exports.Lazy = Lazy;
const Factory = (options) => {
    return (target, key, descriptor) => {
        if (options?.scope) {
            (0, exports.SetScope)(options.scope)(target, key, descriptor);
        }
        (0, common_1.SetMetadata)('factory', true)(target, key, descriptor);
        return descriptor;
    };
};
exports.Factory = Factory;
const Tag = (tag) => {
    return (target) => {
        (0, common_1.SetMetadata)('tags', [...(Reflect.getMetadata('tags', target) || []), tag])(target);
        return target;
    };
};
exports.Tag = Tag;
const Alias = (alias) => {
    return (target) => {
        (0, common_1.SetMetadata)('alias', alias)(target);
        return target;
    };
};
exports.Alias = Alias;
const getScope = (target) => {
    return Reflect.getMetadata(exports.SCOPE_KEY, target);
};
exports.getScope = getScope;
const isSingleton = (target) => {
    const scope = (0, exports.getScope)(target);
    return !scope || scope === scope_enum_1.Scope.DEFAULT;
};
exports.isSingleton = isSingleton;
const isRequestScoped = (target) => {
    const scope = (0, exports.getScope)(target);
    return scope === scope_enum_1.Scope.REQUEST;
};
exports.isRequestScoped = isRequestScoped;
const isTransient = (target) => {
    const scope = (0, exports.getScope)(target);
    return scope === scope_enum_1.Scope.TRANSIENT;
};
exports.isTransient = isTransient;
const isCacheable = (target, key) => {
    return Reflect.getMetadata(exports.CACHE_KEY, target, key) === true;
};
exports.isCacheable = isCacheable;
const getCacheTTL = (target, key) => {
    return Reflect.getMetadata(exports.CACHE_TTL_KEY, target, key);
};
exports.getCacheTTL = getCacheTTL;
const getTags = (target) => {
    return Reflect.getMetadata('tags', target) || [];
};
exports.getTags = getTags;
const getAlias = (target) => {
    return Reflect.getMetadata('alias', target);
};
exports.getAlias = getAlias;
const getScopedDependencies = (dependencies, scopes) => {
    return dependencies.map(dep => ({
        token: dep,
        scope: scopes.get(dep) || ScopeType.DEFAULT,
    }));
};
exports.getScopedDependencies = getScopedDependencies;
//# sourceMappingURL=scope.decorator.js.map