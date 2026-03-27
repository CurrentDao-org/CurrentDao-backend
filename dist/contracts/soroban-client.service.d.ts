import { HttpService } from '@nestjs/axios';
import type { ConfigType } from '@nestjs/config';
import stellarConfig from '../config/stellar.config';
import { CustomInstrumentation } from '../tracing/instrumentation/custom-instrumentation';
import { ContractNetwork, ContractType } from './entities/contract.entity';
import { ContractCallResult, ContractEventRecord, GasEstimation, InvokeContractRequest } from './contracts/contract.types';
export declare class SorobanClientService {
    private readonly httpService;
    private readonly config;
    private readonly instrumentation;
    private readonly logger;
    private readonly rpcServers;
    constructor(httpService: HttpService, config: ConfigType<typeof stellarConfig>, instrumentation: CustomInstrumentation);
    invokeContract(request: InvokeContractRequest): Promise<ContractCallResult>;
    estimateGas(request: InvokeContractRequest): Promise<GasEstimation>;
    estimatePreparedTransaction(transactionXdr: string, network: ContractNetwork): Promise<GasEstimation>;
    getContractEvents(contractId: string, contractType: ContractType, network: ContractNetwork, startLedger?: number): Promise<ContractEventRecord[]>;
    submitPreparedTransaction(transactionXdr: string, network: ContractNetwork): Promise<Record<string, any>>;
    getRpcHealth(network: ContractNetwork): Promise<Record<string, any>>;
    private prepareInvocation;
    private getRpcServer;
    private getNetworkConfig;
    private resolveSourcePublicKey;
    private toScVal;
    private normalizeSimulationResult;
    private mapSimulationToGasEstimation;
    private rpcRequest;
    private pollTransaction;
}
