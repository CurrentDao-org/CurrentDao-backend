"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RequestTransformerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestTransformerService = void 0;
const common_1 = require("@nestjs/common");
let RequestTransformerService = RequestTransformerService_1 = class RequestTransformerService {
    constructor() {
        this.logger = new common_1.Logger(RequestTransformerService_1.name);
    }
    transformRequest(body, rule) {
        this.logger.debug(`Transforming request body with rule: ${rule}`);
        switch (rule) {
            case 'transformEnergyRequest':
                return this.energyRequestTransformation(body);
            default:
                return body;
        }
    }
    transformResponse(body, rule) {
        this.logger.debug(`Transforming response body with rule: ${rule}`);
        switch (rule) {
            case 'transformEnergyResponse':
                return this.energyResponseTransformation(body);
            default:
                return body;
        }
    }
    energyRequestTransformation(body) {
        return {
            ...body,
            timestamp: new Date().toISOString(),
            source: 'gateway',
        };
    }
    energyResponseTransformation(body) {
        if (body.data) {
            return {
                results: body.data,
                count: body.data.length,
                processedAt: new Date().toISOString(),
            };
        }
        return body;
    }
};
exports.RequestTransformerService = RequestTransformerService;
exports.RequestTransformerService = RequestTransformerService = RequestTransformerService_1 = __decorate([
    (0, common_1.Injectable)()
], RequestTransformerService);
//# sourceMappingURL=request-transformer.service.js.map