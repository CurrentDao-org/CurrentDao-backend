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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ContractService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const rxjs_1 = require("rxjs");
const metrics_collector_service_1 = require("../apm/metrics/metrics-collector.service");
const custom_instrumentation_1 = require("../tracing/instrumentation/custom-instrumentation");
const stellar_config_1 = __importDefault(require("../config/stellar.config"));
const contract_entity_1 = require("./entities/contract.entity");
const token_contract_1 = require("./contracts/token.contract");
const escrow_contract_1 = require("./contracts/escrow.contract");
const governance_contract_1 = require("./contracts/governance.contract");
const deployer_service_1 = require("./deployer/deployer.service");
const soroban_client_service_1 = require("./soroban-client.service");
let ContractService = ContractService_1 = class ContractService {
    constructor(contractRepository, config, metricsCollector, instrumentation, sorobanClient, tokenContract, escrowContract, governanceContract, deployerService) {
        this.contractRepository = contractRepository;
        this.config = config;
        this.metricsCollector = metricsCollector;
        this.instrumentation = instrumentation;
        this.sorobanClient = sorobanClient;
        this.tokenContract = tokenContract;
        this.escrowContract = escrowContract;
        this.governanceContract = governanceContract;
        this.deployerService = deployerService;
        this.logger = new common_1.Logger(ContractService_1.name);
        this.metadataCache = new Map();
        this.eventIntervals = new Map();
        this.eventSubject = new rxjs_1.Subject();
        this.lastPollAt = new Map();
    }
    async onModuleInit() {
        for (const contractType of Object.values(contract_entity_1.ContractType)) {
            for (const network of Object.values(contract_entity_1.ContractNetwork)) {
                try {
                    await this.resolveContractMetadata(contractType, network);
                }
                catch (error) {
                    this.logger.debug(`Skipping metadata warmup for ${contractType}/${network}: ${error.message}`);
                }
            }
        }
    }
    onModuleDestroy() {
        for (const interval of this.eventIntervals.values()) {
            clearInterval(interval);
        }
        this.eventIntervals.clear();
        this.eventSubject.complete();
    }
    async invokeContract(request) {
        return this.instrumentation.instrument('contracts.service.invoke', async () => {
            const metadata = await this.resolveContractMetadata(request.contractType, this.resolveNetwork(request.network));
            const adapter = this.getAdapter(request.contractType);
            if (!adapter.supportsMethod(request.method)) {
                throw new common_1.BadRequestException(`Method ${request.method} is not supported by ${request.contractType} contract wrapper.`);
            }
            const result = await adapter.invoke(metadata, request);
            this.metricsCollector.trackBusinessMetric(`contracts.invoke.${request.contractType}.${request.method}`);
            return result;
        });
    }
    async estimateGas(request) {
        const metadata = await this.resolveContractMetadata(request.contractType, this.resolveNetwork(request.network));
        return this.sorobanClient.estimateGas({
            contractId: metadata.contractId,
            contractType: request.contractType,
            network: metadata.network,
            method: this.resolveMethod(metadata, request.contractType, request.method),
            args: request.args,
            signerSecretKey: request.signerSecretKey,
            sourcePublicKey: request.sourcePublicKey,
            timeoutInSeconds: request.timeoutInSeconds,
        });
    }
    async deployContract(request) {
        return this.deployerService.deployContract(request);
    }
    async upgradeContract(request) {
        return this.deployerService.upgradeContract(request);
    }
    async listenToEvents(request) {
        const network = this.resolveNetwork(request.network);
        const metadata = await this.resolveContractMetadata(request.contractType, network);
        const key = `${request.contractType}:${network}`;
        if (this.eventIntervals.has(key)) {
            return {
                key,
                stream: this.eventSubject.asObservable(),
            };
        }
        const interval = setInterval(async () => {
            try {
                const latestMetadata = await this.resolveContractMetadata(request.contractType, network, true);
                const startLedger = request.startLedger || latestMetadata.lastProcessedLedger || 0;
                const events = await this.sorobanClient.getContractEvents(latestMetadata.contractId, request.contractType, network, startLedger > 0 ? startLedger + 1 : undefined);
                if (events.length === 0) {
                    return;
                }
                const lastLedger = events.reduce((current, event) => Math.max(current, event.ledger || current), startLedger);
                this.lastPollAt.set(key, new Date().toISOString());
                await this.persistLedgerCursor(latestMetadata.contractId, network, lastLedger);
                for (const event of events) {
                    this.metricsCollector.trackBusinessMetric(`contracts.events.${request.contractType}`);
                    this.eventSubject.next(event);
                }
            }
            catch (error) {
                this.logger.warn(`Failed to poll ${request.contractType} events on ${network}: ${error.message}`);
            }
        }, this.config.eventPollingIntervalMs);
        interval.unref?.();
        this.eventIntervals.set(key, interval);
        return {
            key,
            stream: this.eventSubject.asObservable(),
        };
    }
    async stopEventListener(contractType, network) {
        const resolvedNetwork = this.resolveNetwork(network);
        const key = `${contractType}:${resolvedNetwork}`;
        const interval = this.eventIntervals.get(key);
        if (interval) {
            clearInterval(interval);
            this.eventIntervals.delete(key);
        }
    }
    getEventStream() {
        return this.eventSubject.asObservable();
    }
    async getHealthStatus() {
        const statuses = await Promise.allSettled(Object.values(contract_entity_1.ContractNetwork).map(async (network) => ({
            network,
            health: await this.sorobanClient.getRpcHealth(network),
        })));
        const unhealthy = statuses.filter((result) => result.status === 'rejected');
        return {
            status: unhealthy.length === 0 ? 'healthy' : 'degraded',
            defaultNetwork: this.config.defaultNetwork,
            activeListeners: this.eventIntervals.size,
            cachedContracts: this.metadataCache.size,
            lastEventPollAt: Object.fromEntries(this.lastPollAt.entries()),
            networks: statuses.map((result, index) => {
                const network = Object.values(contract_entity_1.ContractNetwork)[index];
                return result.status === 'fulfilled'
                    ? { network, status: 'healthy', details: result.value.health }
                    : { network, status: 'degraded', error: result.reason.message };
            }),
        };
    }
    async resolveContractMetadata(contractType, network, forceRefresh = false) {
        const cacheKey = `${contractType}:${network}`;
        const cached = this.metadataCache.get(cacheKey);
        if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
            return cached.metadata;
        }
        const adapter = this.getAdapter(contractType);
        const entity = await this.contractRepository.findOne({
            where: {
                contractType,
                network,
                isActive: true,
            },
            order: {
                updatedAt: 'DESC',
            },
        });
        const configuredContractId = this.config.contracts[contractType]?.[network];
        const contractId = entity?.contractId || configuredContractId;
        if (!contractId) {
            throw new common_1.ServiceUnavailableException(`No ${contractType} contract is configured for ${network}.`);
        }
        const metadata = {
            contractId,
            contractType,
            network,
            version: entity?.version,
            alias: entity?.alias,
            abi: entity?.abi || {
                methods: adapter.getMethodMetadata(),
            },
            metadata: {
                ...(entity?.metadata || {}),
                contractId,
                contractType,
                network,
            },
            lastProcessedLedger: entity?.lastProcessedLedger
                ? Number(entity.lastProcessedLedger)
                : undefined,
            methods: adapter.getMethodMetadata(),
        };
        this.metadataCache.set(cacheKey, {
            metadata,
            expiresAt: Date.now() + this.config.metadataCacheTtlMs,
        });
        return metadata;
    }
    getAdapter(contractType) {
        switch (contractType) {
            case contract_entity_1.ContractType.TOKEN:
                return this.tokenContract;
            case contract_entity_1.ContractType.ESCROW:
                return this.escrowContract;
            case contract_entity_1.ContractType.GOVERNANCE:
                return this.governanceContract;
            default:
                throw new common_1.BadRequestException(`Unsupported contract type: ${contractType}`);
        }
    }
    resolveNetwork(network) {
        if (network) {
            return network;
        }
        return this.config.defaultNetwork === 'mainnet'
            ? contract_entity_1.ContractNetwork.MAINNET
            : contract_entity_1.ContractNetwork.TESTNET;
    }
    resolveMethod(metadata, contractType, method) {
        const methodMetadata = metadata.methods.find((candidate) => candidate.method === method);
        if (!methodMetadata) {
            throw new common_1.BadRequestException(`Method ${method} is not available for ${contractType}.`);
        }
        return methodMetadata.chainMethod;
    }
    async persistLedgerCursor(contractId, network, ledger) {
        await this.contractRepository.update({
            contractId,
            network,
        }, {
            lastProcessedLedger: String(ledger),
            lastEventAt: new Date(),
        });
        this.metadataCache.delete(`token:${network}`);
        this.metadataCache.delete(`escrow:${network}`);
        this.metadataCache.delete(`governance:${network}`);
    }
};
exports.ContractService = ContractService;
exports.ContractService = ContractService = ContractService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(contract_entity_1.ContractEntity)),
    __param(1, (0, common_1.Inject)(stellar_config_1.default.KEY)),
    __metadata("design:paramtypes", [typeorm_2.Repository, void 0, metrics_collector_service_1.MetricsCollectorService,
        custom_instrumentation_1.CustomInstrumentation,
        soroban_client_service_1.SorobanClientService,
        token_contract_1.TokenContract,
        escrow_contract_1.EscrowContract,
        governance_contract_1.GovernanceContract,
        deployer_service_1.DeployerService])
], ContractService);
//# sourceMappingURL=contract.service.js.map