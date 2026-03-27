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
var SorobanClientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SorobanClientService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const stellar_sdk_1 = require("@stellar/stellar-sdk");
const stellar_config_1 = __importDefault(require("../config/stellar.config"));
const custom_instrumentation_1 = require("../tracing/instrumentation/custom-instrumentation");
let SorobanClientService = SorobanClientService_1 = class SorobanClientService {
    constructor(httpService, config, instrumentation) {
        this.httpService = httpService;
        this.config = config;
        this.instrumentation = instrumentation;
        this.logger = new common_1.Logger(SorobanClientService_1.name);
        this.rpcServers = new Map();
    }
    async invokeContract(request) {
        return this.instrumentation.instrument('contracts.soroban.invoke', async () => {
            const startedAt = Date.now();
            const { transaction, simulation } = await this.prepareInvocation(request);
            const gas = this.mapSimulationToGasEstimation(simulation);
            if (request.simulateOnly || !request.signAndSend) {
                return {
                    success: true,
                    contractId: request.contractId,
                    contractType: request.contractType,
                    network: request.network,
                    method: request.method,
                    simulated: true,
                    cached: false,
                    durationMs: Date.now() - startedAt,
                    result: this.normalizeSimulationResult(simulation),
                    gas,
                    raw: simulation,
                };
            }
            const signerSecretKey = request.signerSecretKey || this.config.sourceSecretKey;
            if (!signerSecretKey) {
                throw new common_1.BadRequestException('A signer secret key is required for signed Soroban invocations.');
            }
            const assembled = stellar_sdk_1.rpc
                .assembleTransaction(transaction, simulation)
                .build();
            assembled.sign(stellar_sdk_1.Keypair.fromSecret(signerSecretKey));
            const submission = await this.submitPreparedTransaction(assembled.toXDR(), request.network);
            const transactionHash = submission.hash || submission.id;
            const confirmation = transactionHash
                ? await this.pollTransaction(request.network, transactionHash)
                : undefined;
            return {
                success: true,
                contractId: request.contractId,
                contractType: request.contractType,
                network: request.network,
                method: request.method,
                simulated: false,
                cached: false,
                durationMs: Date.now() - startedAt,
                result: confirmation?.resultXdr ||
                    this.normalizeSimulationResult(simulation),
                gas,
                transactionHash,
                ledger: confirmation?.ledger,
                raw: confirmation || submission,
            };
        });
    }
    async estimateGas(request) {
        const { simulation } = await this.prepareInvocation({
            ...request,
            signAndSend: false,
            simulateOnly: true,
        });
        return this.mapSimulationToGasEstimation(simulation);
    }
    async estimatePreparedTransaction(transactionXdr, network) {
        const simulation = await this.rpcRequest(network, 'simulateTransaction', {
            transaction: transactionXdr,
        });
        return this.mapSimulationToGasEstimation(simulation);
    }
    async getContractEvents(contractId, contractType, network, startLedger) {
        const response = await this.rpcRequest(network, 'getEvents', {
            startLedger,
            filters: [
                {
                    type: 'contract',
                    contractIds: [contractId],
                },
            ],
            pagination: {
                limit: 100,
            },
        });
        const events = response.events || response.records || [];
        return events.map((event, index) => ({
            id: `${event.ledger || event.ledgerSequence || 0}:${event.txHash || event.tx_hash || index}`,
            contractId,
            contractType,
            network,
            ledger: Number(event.ledger || event.ledgerSequence || 0),
            transactionHash: event.txHash || event.tx_hash,
            topic: (event.topic || event.topics || []).map((item) => String(item)),
            payload: event.value || event.data || event,
            timestamp: event.timestamp || new Date().toISOString(),
            raw: event,
        }));
    }
    async submitPreparedTransaction(transactionXdr, network) {
        return this.rpcRequest(network, 'sendTransaction', {
            transaction: transactionXdr,
        });
    }
    async getRpcHealth(network) {
        try {
            return await this.rpcRequest(network, 'getHealth', {});
        }
        catch (error) {
            this.logger.warn(`Soroban RPC health check failed for ${network}: ${error.message}`);
            throw new common_1.ServiceUnavailableException(`Soroban RPC health check failed for ${network}`);
        }
    }
    async prepareInvocation(request) {
        const account = await this.getRpcServer(request.network).getAccount(this.resolveSourcePublicKey(request.sourcePublicKey, request.signerSecretKey));
        const contract = new stellar_sdk_1.Contract(request.contractId);
        const timeout = request.timeoutInSeconds || 30;
        const transaction = new stellar_sdk_1.TransactionBuilder(account, {
            fee: '100',
            networkPassphrase: this.getNetworkConfig(request.network)
                .networkPassphrase,
        })
            .addOperation(contract.call(request.method, ...(request.args || []).map((arg) => this.toScVal(arg))))
            .setTimeout(timeout)
            .build();
        const simulation = await this.getRpcServer(request.network).simulateTransaction(transaction);
        if (simulation.error) {
            throw new common_1.ServiceUnavailableException(simulation.error);
        }
        return { transaction, simulation };
    }
    getRpcServer(network) {
        if (!this.rpcServers.has(network)) {
            const sorobanRpcUrl = this.getNetworkConfig(network).sorobanRpcUrl;
            this.rpcServers.set(network, new stellar_sdk_1.rpc.Server(sorobanRpcUrl, {
                allowHttp: sorobanRpcUrl.startsWith('http://'),
            }));
        }
        return this.rpcServers.get(network);
    }
    getNetworkConfig(network) {
        return this.config.networks[network];
    }
    resolveSourcePublicKey(sourcePublicKey, signerSecretKey) {
        if (sourcePublicKey) {
            return sourcePublicKey;
        }
        if (signerSecretKey) {
            return stellar_sdk_1.Keypair.fromSecret(signerSecretKey).publicKey();
        }
        if (this.config.sourceSecretKey) {
            return stellar_sdk_1.Keypair.fromSecret(this.config.sourceSecretKey).publicKey();
        }
        if (this.config.sourcePublicKey) {
            return this.config.sourcePublicKey;
        }
        throw new common_1.BadRequestException('STELLAR_SOURCE_PUBLIC_KEY or STELLAR_SOURCE_SECRET_KEY must be configured.');
    }
    toScVal(value) {
        if (value === undefined) {
            return (0, stellar_sdk_1.nativeToScVal)(null);
        }
        if (typeof value === 'bigint') {
            return (0, stellar_sdk_1.nativeToScVal)(value.toString());
        }
        return (0, stellar_sdk_1.nativeToScVal)(value);
    }
    normalizeSimulationResult(simulation) {
        try {
            if (simulation.result?.retval) {
                return (0, stellar_sdk_1.scValToNative)(simulation.result.retval);
            }
            if (simulation.results?.[0]?.xdr) {
                return simulation.results[0].xdr;
            }
        }
        catch (error) {
            this.logger.debug(`Falling back to raw simulation result: ${error.message}`);
        }
        return simulation.result || simulation.results || simulation;
    }
    mapSimulationToGasEstimation(simulation) {
        const cost = simulation.cost || simulation.transactionData?.resources || {};
        const minResourceFee = simulation.minResourceFee || simulation.min_resource_fee;
        return {
            cpuInstructions: Number(cost.cpuInsns || cost.cpuInstructions || 0),
            readBytes: Number(cost.memBytes || cost.readBytes || 0),
            writeBytes: Number(cost.writeBytes || 0),
            minResourceFee: minResourceFee ? String(minResourceFee) : undefined,
            recommendedFee: minResourceFee
                ? String(Math.ceil(Number(minResourceFee) * 1.1))
                : undefined,
        };
    }
    async rpcRequest(network, method, params) {
        const endpoint = this.getNetworkConfig(network).sorobanRpcUrl;
        const response = await this.httpService.axiosRef.post(endpoint, {
            jsonrpc: '2.0',
            id: `${method}-${Date.now()}`,
            method,
            params,
        }, {
            timeout: this.config.rpcTimeoutMs,
        });
        if (response.data?.error) {
            throw new common_1.ServiceUnavailableException(response.data.error.message || `Soroban RPC method ${method} failed.`);
        }
        return response.data?.result || response.data;
    }
    async pollTransaction(network, transactionHash) {
        const deadline = Date.now() + this.config.submissionTimeoutMs;
        while (Date.now() < deadline) {
            const transaction = await this.rpcRequest(network, 'getTransaction', {
                hash: transactionHash,
            });
            if (transaction.status &&
                transaction.status !== 'NOT_FOUND' &&
                transaction.status !== 'PENDING') {
                return transaction;
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        return undefined;
    }
};
exports.SorobanClientService = SorobanClientService;
exports.SorobanClientService = SorobanClientService = SorobanClientService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(stellar_config_1.default.KEY)),
    __metadata("design:paramtypes", [axios_1.HttpService, void 0, custom_instrumentation_1.CustomInstrumentation])
], SorobanClientService);
//# sourceMappingURL=soroban-client.service.js.map