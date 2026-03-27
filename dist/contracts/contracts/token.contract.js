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
exports.TokenContract = void 0;
const common_1 = require("@nestjs/common");
const contract_call_dto_1 = require("../dto/contract-call.dto");
const soroban_client_service_1 = require("../soroban-client.service");
const contract_entity_1 = require("../entities/contract.entity");
let TokenContract = class TokenContract {
    constructor(sorobanClient) {
        this.sorobanClient = sorobanClient;
        this.contractType = contract_entity_1.ContractType.TOKEN;
        this.methods = [
            {
                method: 'balance',
                chainMethod: 'balance',
                readOnly: true,
                cacheTtlMs: 10000,
                eventTopics: ['transfer'],
            },
            {
                method: 'allowance',
                chainMethod: 'allowance',
                readOnly: true,
                cacheTtlMs: 10000,
            },
            {
                method: 'decimals',
                chainMethod: 'decimals',
                readOnly: true,
                cacheTtlMs: 60000,
            },
            {
                method: 'symbol',
                chainMethod: 'symbol',
                readOnly: true,
                cacheTtlMs: 60000,
            },
            {
                method: 'transfer',
                chainMethod: 'transfer',
                readOnly: false,
                eventTopics: ['transfer'],
            },
            {
                method: 'approve',
                chainMethod: 'approve',
                readOnly: false,
                eventTopics: ['approval'],
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
exports.TokenContract = TokenContract;
exports.TokenContract = TokenContract = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [soroban_client_service_1.SorobanClientService])
], TokenContract);
//# sourceMappingURL=token.contract.js.map