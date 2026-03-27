"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var WafService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WafService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let WafService = WafService_1 = class WafService {
    constructor() {
        this.logger = new common_1.Logger(WafService_1.name);
        this.ruleCache = [];
    }
    onModuleInit() {
        this.loadRules();
    }
    loadRules() {
        try {
            const configPath = path.resolve(process.cwd(), 'security/waf-rules.json');
            const data = fs.readFileSync(configPath, 'utf8');
            this.config = JSON.parse(data);
            this.ruleCache.length = 0;
            for (const rule of this.config.rules) {
                this.ruleCache.push({
                    name: rule.name,
                    regex: new RegExp(rule.pattern, 'i'),
                    block: rule.block,
                });
            }
            this.logger.log(`Successfully loaded ${this.ruleCache.length} WAF rules`);
        }
        catch (error) {
            this.logger.error('Failed to load WAF rules, falling back to empty ruleset', error.stack);
            this.config = { rules: [], globalExcludes: [] };
        }
    }
    isRequestSafe(url, body, query) {
        if (this.config.globalExcludes.some((exclude) => url.includes(exclude))) {
            return { safe: true };
        }
        const checkValue = (val) => {
            if (typeof val === 'string') {
                for (const rule of this.ruleCache) {
                    if (rule.regex.test(val)) {
                        return { safe: false, reason: `Blocked by WAF rule: ${rule.name}` };
                    }
                }
            }
            else if (typeof val === 'object' && val !== null) {
                for (const key in val) {
                    const result = checkValue(val[key]);
                    if (!result.safe)
                        return result;
                }
            }
            return { safe: true };
        };
        const queryResult = checkValue(query);
        if (!queryResult.safe)
            return queryResult;
        const bodyResult = checkValue(body);
        if (!bodyResult.safe)
            return bodyResult;
        return { safe: true };
    }
};
exports.WafService = WafService;
exports.WafService = WafService = WafService_1 = __decorate([
    (0, common_1.Injectable)()
], WafService);
//# sourceMappingURL=waf.service.js.map