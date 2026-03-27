"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeprecationMessage = exports.isDeprecated = exports.getApiVersion = exports.Deprecated = exports.ApiVersion = exports.API_VERSION_KEY = void 0;
const common_1 = require("@nestjs/common");
const response_interface_1 = require("../interfaces/response.interface");
exports.API_VERSION_KEY = 'api_version';
const ApiVersion = (options) => {
    const metadata = {
        version: options.version || response_interface_1.DEFAULT_API_VERSION,
        deprecated: options.deprecated || false,
        deprecationMessage: options.deprecationMessage,
    };
    return (0, common_1.SetMetadata)(exports.API_VERSION_KEY, metadata);
};
exports.ApiVersion = ApiVersion;
const Deprecated = (options) => {
    return (0, common_1.SetMetadata)(exports.API_VERSION_KEY, {
        version: response_interface_1.DEFAULT_API_VERSION,
        deprecated: true,
        deprecationMessage: options?.deprecationMessage || 'This endpoint is deprecated',
    });
};
exports.Deprecated = Deprecated;
const getApiVersion = (target) => {
    return (Reflect.getMetadata(exports.API_VERSION_KEY, target) ||
        Reflect.getMetadata(exports.API_VERSION_KEY, target.constructor) ||
        response_interface_1.DEFAULT_API_VERSION);
};
exports.getApiVersion = getApiVersion;
const isDeprecated = (target) => {
    const metadata = Reflect.getMetadata(exports.API_VERSION_KEY, target) ||
        Reflect.getMetadata(exports.API_VERSION_KEY, target.constructor);
    return metadata?.deprecated || false;
};
exports.isDeprecated = isDeprecated;
const getDeprecationMessage = (target) => {
    const metadata = Reflect.getMetadata(exports.API_VERSION_KEY, target) ||
        Reflect.getMetadata(exports.API_VERSION_KEY, target.constructor);
    return metadata?.deprecationMessage;
};
exports.getDeprecationMessage = getDeprecationMessage;
//# sourceMappingURL=api-version.decorator.js.map