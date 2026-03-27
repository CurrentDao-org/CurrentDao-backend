"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GatewayAuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayAuthService = void 0;
const common_1 = require("@nestjs/common");
let GatewayAuthService = GatewayAuthService_1 = class GatewayAuthService {
    constructor() {
        this.logger = new common_1.Logger(GatewayAuthService_1.name);
    }
    async validateRequest(token) {
        this.logger.debug(`Validating request token: ${token}`);
        if (!token) {
            throw new common_1.UnauthorizedException('Missing authentication token');
        }
        return true;
    }
    async generateApiKey(userId) {
        return `key_${Math.random().toString(36).substring(2, 15)}`;
    }
};
exports.GatewayAuthService = GatewayAuthService;
exports.GatewayAuthService = GatewayAuthService = GatewayAuthService_1 = __decorate([
    (0, common_1.Injectable)()
], GatewayAuthService);
//# sourceMappingURL=gateway-auth.service.js.map