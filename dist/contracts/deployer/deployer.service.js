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
var DeployerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeployerService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const contract_entity_1 = require("../entities/contract.entity");
const soroban_client_service_1 = require("../soroban-client.service");
let DeployerService = DeployerService_1 = class DeployerService {
    constructor(contractRepository, sorobanClient) {
        this.contractRepository = contractRepository;
        this.sorobanClient = sorobanClient;
        this.logger = new common_1.Logger(DeployerService_1.name);
    }
    async deployContract(request) {
        const network = request.network || contract_entity_1.ContractNetwork.TESTNET;
        if (!request.contractId && !request.prebuiltTransactionXdr) {
            throw new common_1.BadRequestException('Deployment requires either a contractId or a prebuiltTransactionXdr.');
        }
        const gas = request.prebuiltTransactionXdr
            ? await this.sorobanClient.estimatePreparedTransaction(request.prebuiltTransactionXdr, network)
            : undefined;
        const submission = request.prebuiltTransactionXdr
            ? await this.sorobanClient.submitPreparedTransaction(request.prebuiltTransactionXdr, network)
            : undefined;
        const contractId = request.contractId ||
            submission?.contractId ||
            submission?.result?.contractId;
        if (!contractId) {
            throw new common_1.BadRequestException('Unable to determine deployed contractId from deployment request.');
        }
        const version = request.version || new Date().toISOString();
        const activeContract = await this.contractRepository.findOne({
            where: {
                contractType: request.contractType,
                network,
                isActive: true,
            },
        });
        if (activeContract) {
            activeContract.isActive = false;
            activeContract.status = contract_entity_1.ContractStatus.INACTIVE;
            await this.contractRepository.save(activeContract);
        }
        const entity = this.contractRepository.create({
            contractType: request.contractType,
            network,
            contractId,
            alias: request.alias,
            version,
            abi: request.abi,
            metadata: request.metadata,
            deploymentMetadata: {
                ...request.deploymentMetadata,
                submission,
            },
            deploymentTxHash: request.deploymentTxHash || submission?.hash || submission?.id,
            previousContractId: activeContract?.contractId,
            deployedBy: request.signerSecretKey
                ? 'runtime-signer'
                : 'external-pipeline',
            metadataCacheKey: `${request.contractType}:${network}:${version}`,
            status: contract_entity_1.ContractStatus.ACTIVE,
            isActive: true,
        });
        await this.contractRepository.save(entity);
        this.logger.log(`Registered ${request.contractType} contract ${contractId} on ${network} version ${version}`);
        return {
            success: true,
            contractId,
            contractType: request.contractType,
            network,
            version,
            alias: request.alias,
            transactionHash: entity.deploymentTxHash,
            gas,
            metadata: entity.metadata,
        };
    }
    async upgradeContract(request) {
        const existing = await this.contractRepository.findOne({
            where: {
                contractId: request.previousContractId,
                network: request.network || contract_entity_1.ContractNetwork.TESTNET,
            },
        });
        if (!existing) {
            throw new common_1.BadRequestException(`Cannot upgrade missing contract ${request.previousContractId}.`);
        }
        const result = await this.deployContract(request);
        await this.contractRepository.update({ id: existing.id }, {
            isActive: request.activate === false,
            status: request.activate === false
                ? contract_entity_1.ContractStatus.INACTIVE
                : contract_entity_1.ContractStatus.DEPRECATED,
            upgradeTxHash: result.transactionHash,
        });
        await this.contractRepository.update({
            contractId: result.contractId,
            network: result.network,
        }, {
            previousContractId: existing.contractId,
        });
        return result;
    }
};
exports.DeployerService = DeployerService;
exports.DeployerService = DeployerService = DeployerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(contract_entity_1.ContractEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        soroban_client_service_1.SorobanClientService])
], DeployerService);
//# sourceMappingURL=deployer.service.js.map