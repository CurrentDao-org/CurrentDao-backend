import { ContractCallDto } from '../dto/contract-call.dto';
import { SorobanClientService } from '../soroban-client.service';
import { ContractType } from '../entities/contract.entity';
import { ContractAdapter, ContractCallResult, ContractMethodMetadata, ResolvedContractMetadata } from './contract.types';
export declare class EscrowContract implements ContractAdapter {
    private readonly sorobanClient;
    readonly contractType = ContractType.ESCROW;
    private readonly methods;
    constructor(sorobanClient: SorobanClientService);
    getMethodMetadata(): ContractMethodMetadata[];
    supportsMethod(method: string): boolean;
    invoke(metadata: ResolvedContractMetadata, request: ContractCallDto): Promise<ContractCallResult>;
}
