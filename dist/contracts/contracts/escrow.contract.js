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
exports.EscrowContract = void 0;
const common_1 = require("@nestjs/common");
const contract_call_dto_1 = require("../dto/contract-call.dto");
const soroban_client_service_1 = require("../soroban-client.service");
const contract_entity_1 = require("../entities/contract.entity");
let EscrowContract = class EscrowContract {
    constructor(sorobanClient) {
        this.sorobanClient = sorobanClient;
        this.contractType = contract_entity_1.ContractType.ESCROW;
        this.methods = [
            {
                method: 'createEscrow',
                chainMethod: 'create_escrow',
                readOnly: false,
                eventTopics: ['escrow_created'],
            },
            {
                method: 'fundEscrow',
                chainMethod: 'fund_escrow',
                readOnly: false,
                eventTopics: ['escrow_funded'],
            },
            {
                method: 'releaseEscrow',
                chainMethod: 'release_escrow',
                readOnly: false,
                eventTopics: ['escrow_released'],
            },
            {
                method: 'cancelEscrow',
                chainMethod: 'cancel_escrow',
                readOnly: false,
                eventTopics: ['escrow_cancelled'],
            },
            {
                method: 'getEscrow',
                chainMethod: 'get_escrow',
                readOnly: true,
                cacheTtlMs: 3000,
            },
            {
                method: 'getStatus',
                chainMethod: 'get_status',
                readOnly: true,
                cacheTtlMs: 3000,
            },
        ];
    }
    getMethodMetadata() {
        return this.methods;
    }
    supportsMethod(method) {
        return this.methods.some((candidate) => candidate.method === method);
    }
    async invoke(metadata, request) {
        const method = this.methods.find((candidate) => candidate.method === request.method);
        return this.sorobanClient.invokeContract({
            contractId: metadata.contractId,
            contractType: this.contractType,
            network: metadata.network,
            method: method?.chainMethod || request.method,
            args: request.args,
            signAndSend: request.mode === contract_call_dto_1.ContractInvocationMode.SIGNED || !method?.readOnly,
            simulateOnly: request.simulateOnly,
            signerSecretKey: request.signerSecretKey,
            sourcePublicKey: request.sourcePublicKey,
            timeoutInSeconds: request.timeoutInSeconds,
        });
    }
};
exports.EscrowContract = EscrowContract;
exports.EscrowContract = EscrowContract = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [soroban_client_service_1.SorobanClientService])
], EscrowContract);
//# sourceMappingURL=escrow.contract.js.map