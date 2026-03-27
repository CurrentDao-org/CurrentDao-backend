"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShardingModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const shard_metadata_entity_1 = require("./entities/shard-metadata.entity");
const shard_router_service_1 = require("./shard-router.service");
const partitioning_service_1 = require("./partitioning.service");
const rebalancing_service_1 = require("./rebalancing.service");
const shard_health_service_1 = require("./monitoring/shard-health.service");
let ShardingModule = class ShardingModule {
};
exports.ShardingModule = ShardingModule;
exports.ShardingModule = ShardingModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([shard_metadata_entity_1.ShardMetadataEntity])],
        providers: [
            shard_router_service_1.ShardRouterService,
            partitioning_service_1.PartitioningService,
            rebalancing_service_1.RebalancingService,
            shard_health_service_1.ShardHealthService,
        ],
        exports: [
            shard_router_service_1.ShardRouterService,
            partitioning_service_1.PartitioningService,
            rebalancing_service_1.RebalancingService,
            shard_health_service_1.ShardHealthService,
        ],
    })
], ShardingModule);
//# sourceMappingURL=sharding.module.js.map