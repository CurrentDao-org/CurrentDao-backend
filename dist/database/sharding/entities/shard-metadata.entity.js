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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShardMetadataEntity = void 0;
const typeorm_1 = require("typeorm");
let ShardMetadataEntity = class ShardMetadataEntity {
};
exports.ShardMetadataEntity = ShardMetadataEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ShardMetadataEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'shard_id', unique: true }),
    __metadata("design:type", Number)
], ShardMetadataEntity.prototype, "shardId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'current_load' }),
    __metadata("design:type", Number)
], ShardMetadataEntity.prototype, "currentLoad", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_records' }),
    __metadata("design:type", Number)
], ShardMetadataEntity.prototype, "totalRecords", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'HEALTHY' }),
    __metadata("design:type", String)
], ShardMetadataEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_rebalanced', nullable: true }),
    __metadata("design:type", Date)
], ShardMetadataEntity.prototype, "lastRebalanced", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ShardMetadataEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ShardMetadataEntity.prototype, "updatedAt", void 0);
exports.ShardMetadataEntity = ShardMetadataEntity = __decorate([
    (0, typeorm_1.Entity)('shard_metadata')
], ShardMetadataEntity);
//# sourceMappingURL=shard-metadata.entity.js.map