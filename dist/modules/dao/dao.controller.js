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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DaoController = void 0;
const common_1 = require("@nestjs/common");
const dao_service_1 = require("./dao.service");
const create_proposal_dto_1 = require("./dto/create-proposal.dto");
const swagger_1 = require("@nestjs/swagger");
let DaoController = class DaoController {
    constructor(daoService) {
        this.daoService = daoService;
    }
    async findAll() {
        return this.daoService.findAll();
    }
    async findOne(id) {
        return this.daoService.findOne(id);
    }
    async create(createProposalDto) {
        return this.daoService.create(createProposalDto);
    }
    async vote(id, voteDto) {
        return this.daoService.vote(id, voteDto.userId, voteDto.support);
    }
    async finalize(id) {
        return this.daoService.finalize(id);
    }
    async getActiveProposals() {
        return this.daoService.getActiveProposals();
    }
};
exports.DaoController = DaoController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all proposals' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DaoController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get proposal by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DaoController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create new proposal' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_proposal_dto_1.CreateProposalDto]),
    __metadata("design:returntype", Promise)
], DaoController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/vote'),
    (0, swagger_1.ApiOperation)({ summary: 'Vote on proposal' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DaoController.prototype, "vote", null);
__decorate([
    (0, common_1.Post)(':id/finalize'),
    (0, swagger_1.ApiOperation)({ summary: 'Finalize proposal' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DaoController.prototype, "finalize", null);
__decorate([
    (0, common_1.Get)('active'),
    (0, swagger_1.ApiOperation)({ summary: 'Get active proposals' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DaoController.prototype, "getActiveProposals", null);
exports.DaoController = DaoController = __decorate([
    (0, common_1.Controller)('dao'),
    (0, swagger_1.ApiTags)('dao'),
    __metadata("design:paramtypes", [dao_service_1.DaoService])
], DaoController);
//# sourceMappingURL=dao.controller.js.map