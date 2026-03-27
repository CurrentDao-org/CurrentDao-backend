"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TransformPipe_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskSensitiveFields = exports.removeSensitiveFields = exports.toFilteredArray = exports.toFilteredResponse = exports.createSensitiveDataFilter = exports.Sensitive = exports.TransformPipe = exports.DEFAULT_SENSITIVE_FIELDS = void 0;
const common_1 = require("@nestjs/common");
exports.DEFAULT_SENSITIVE_FIELDS = [
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
const DEFAULT_CONFIG = {
    exclude: exports.DEFAULT_SENSITIVE_FIELDS,
    recursive: true,
    maskInsteadOfRemove: false,
    maskChar: '*',
};
let TransformPipe = TransformPipe_1 = class TransformPipe {
    constructor(config) {
        this.logger = new common_1.Logger(TransformPipe_1.name);
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    transform(value, metadata) {
        if (metadata.type !== 'body' && metadata.type !== 'query') {
            return value;
        }
        if (!value || typeof value !== 'object') {
            return value;
        }
        return this.filterSensitiveData(value);
    }
    filterSensitiveData(data) {
        if (Array.isArray(data)) {
            return data.map(item => this.filterSensitiveData(item));
        }
        if (typeof data === 'object' && data !== null) {
            const filtered = {};
            for (const [key, value] of Object.entries(data)) {
                if (this.isSensitiveField(key)) {
                    if (this.config.maskInsteadOfRemove) {
                        filtered[key] = this.maskValue(value);
                    }
                }
                else if (this.config.recursive && typeof value === 'object' && value !== null) {
                    filtered[key] = this.filterSensitiveData(value);
                }
                else {
                    filtered[key] = value;
                }
            }
            return filtered;
        }
        return data;
    }
    isSensitiveField(key) {
        const lowerKey = key.toLowerCase();
        if (this.config.include && this.config.include.length > 0) {
            return this.config.include.some(field => field.toLowerCase() === lowerKey);
        }
        const excludeList = this.config.exclude || exports.DEFAULT_SENSITIVE_FIELDS;
        return excludeList.some(field => field.toLowerCase() === lowerKey);
    }
    maskValue(value) {
        const maskChar = this.config.maskChar || '*';
        if (typeof value === 'string' && value.length > 0) {
            return value[0] + maskChar.repeat(Math.min(value.length - 2, 8)) + value[value.length - 1];
        }
        return maskChar.repeat(8);
    }
};
exports.TransformPipe = TransformPipe;
exports.TransformPipe = TransformPipe = TransformPipe_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [Object])
], TransformPipe);
const Sensitive = (fieldName) => {
    return (target, key) => {
        const sensitiveFields = Reflect.getMetadata('sensitive_fields', target.constructor) || [];
        sensitiveFields.push(fieldName);
        Reflect.defineMetadata('sensitive_fields', sensitiveFields, target.constructor);
    };
};
exports.Sensitive = Sensitive;
const createSensitiveDataFilter = (sensitiveFields, maskInsteadOfRemove = false) => {
    const filter = new TransformPipe({
        exclude: sensitiveFields,
        maskInsteadOfRemove,
        recursive: true,
    });
    return (data) => {
        if (!data || typeof data !== 'object') {
            return data;
        }
        return filter.transform(data, { type: 'body' });
    };
};
exports.createSensitiveDataFilter = createSensitiveDataFilter;
const toFilteredResponse = (data, options) => {
    const pipe = new TransformPipe({
        exclude: options?.exclude,
        include: options?.include,
        maskInsteadOfRemove: options?.maskInsteadOfRemove ?? false,
        recursive: true,
    });
    return pipe.transform(data, { type: 'body' });
};
exports.toFilteredResponse = toFilteredResponse;
const toFilteredArray = (data, options) => {
    return data.map(item => (0, exports.toFilteredResponse)(item, options));
};
exports.toFilteredArray = toFilteredArray;
const removeSensitiveFields = (data, fieldsToRemove) => {
    return (0, exports.toFilteredResponse)(data, {
        exclude: fieldsToRemove || exports.DEFAULT_SENSITIVE_FIELDS,
        maskInsteadOfRemove: false,
    });
};
exports.removeSensitiveFields = removeSensitiveFields;
const maskSensitiveFields = (data, fieldsToMask) => {
    return (0, exports.toFilteredResponse)(data, {
        exclude: fieldsToMask || exports.DEFAULT_SENSITIVE_FIELDS,
        maskInsteadOfRemove: true,
    });
};
exports.maskSensitiveFields = maskSensitiveFields;
//# sourceMappingURL=transform.pipe.js.map