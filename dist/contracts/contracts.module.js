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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractsModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const typeorm_1 = require("@nestjs/typeorm");
const stellar_config_1 = __importDefault(require("../config/stellar.config"));
const contract_entity_1 = require("./entities/contract.entity");
const contract_service_1 = require("./contract.service");
const soroban_client_service_1 = require("./soroban-client.service");
const token_contract_1 = require("./contracts/token.contract");
const escrow_contract_1 = require("./contracts/escrow.contract");
const governance_contract_1 = require("./contracts/governance.contract");
const deployer_service_1 = require("./deployer/deployer.service");
let ContractsModule = class ContractsModule {
};
exports.ContractsModule = ContractsModule;
exports.ContractsModule = ContractsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule,
            config_1.ConfigModule.forFeature(stellar_config_1.default),
            typeorm_1.TypeOrmModule.forFeature([contract_entity_1.ContractEntity]),
        ],
        providers: [
            soroban_client_service_1.SorobanClientService,
            token_contract_1.TokenContract,
            escrow_contract_1.EscrowContract,
            governance_contract_1.GovernanceContract,
            deployer_service_1.DeployerService,
            contract_service_1.ContractService,
        ],
        exports: [contract_service_1.ContractService, deployer_service_1.DeployerService, soroban_client_service_1.SorobanClientService],
    })
], ContractsModule);
//# sourceMappingURL=contracts.module.js.map