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
var ShardRouterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShardRouterService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
let ShardRouterService = ShardRouterService_1 = class ShardRouterService {
    constructor() {
        this.logger = new common_1.Logger(ShardRouterService_1.name);
        this.nodes = [];
    }
    onModuleInit() {
        this.loadConfig();
    }
    loadConfig() {
        try {
            const configPath = path.resolve(process.cwd(), 'database/sharding-config.json');
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            this.nodes = data.nodes;
            this.logger.log(`Initialized Shard Router with ${this.nodes.length} nodes`);
        }
        catch (error) {
            this.logger.error('Failed to load sharding config, using default shard', error);
        }
    }
    getShardNode(key) {
        if (this.nodes.length === 0)
            return null;
        const hash = crypto.createHash('md5').update(key).digest('hex');
        const index = parseInt(hash.substring(0, 8), 16) % this.nodes.length;
        return this.nodes[index];
    }
    async executeCrossShardQuery(query) {
        const startTime = Date.now();
        this.logger.log('Starting cross-shard parallel execution...');
        const results = await Promise.all(this.nodes.map((node) => this.queryOnShard(node, query)));
        const aggregatedResult = results.flat();
        const duration = Date.now() - startTime;
        this.logger.log(`Cross-shard query completed in ${duration}ms across ${this.nodes.length} shards`);
        return aggregatedResult;
    }
    async queryOnShard(node, query) {
        this.logger.debug(`Executing query on ${node.database}...`);
        return [];
    }
};
exports.ShardRouterService = ShardRouterService;
exports.ShardRouterService = ShardRouterService = ShardRouterService_1 = __decorate([
    (0, common_1.Injectable)()
], ShardRouterService);
//# sourceMappingURL=shard-router.service.js.map