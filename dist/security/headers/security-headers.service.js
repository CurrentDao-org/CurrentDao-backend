"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var SecurityHeadersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityHeadersService = void 0;
const common_1 = require("@nestjs/common");
const helmet_1 = __importDefault(require("helmet"));
let SecurityHeadersService = SecurityHeadersService_1 = class SecurityHeadersService {
    constructor() {
        this.logger = new common_1.Logger(SecurityHeadersService_1.name);
    }
    getHelmetMiddleware() {
        this.logger.log('Configuring security headers via Helmet...');
        return (0, helmet_1.default)({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
                    styleSrc: [
                        "'self'",
                        "'unsafe-inline'",
                        'https://fonts.googleapis.com',
                    ],
                    imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                    upgradeInsecureRequests: [],
                },
            },
            crossOriginEmbedderPolicy: true,
            crossOriginOpenerPolicy: true,
            crossOriginResourcePolicy: { policy: 'same-origin' },
            dnsPrefetchControl: { allow: false },
            frameguard: { action: 'deny' },
            hidePoweredBy: true,
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true,
            },
            ieNoOpen: true,
            noSniff: true,
            referrerPolicy: { policy: 'no-referrer' },
            xssFilter: true,
        });
    }
};
exports.SecurityHeadersService = SecurityHeadersService;
exports.SecurityHeadersService = SecurityHeadersService = SecurityHeadersService_1 = __decorate([
    (0, common_1.Injectable)()
], SecurityHeadersService);
//# sourceMappingURL=security-headers.service.js.map