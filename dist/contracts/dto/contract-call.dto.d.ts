import { ContractNetwork, ContractType } from '../entities/contract.entity';
export declare enum ContractInvocationMode {
    READ_ONLY = "read_only",
    SIGNED = "signed"
}
export declare class ContractCallDto {
    contractType: ContractType;
    method: string;
    args?: unknown[];
    mode?: ContractInvocationMode;
    network?: ContractNetwork;
    simulateOnly?: boolean;
    signerSecretKey?: string;
    sourcePublicKey?: string;
    correlationId?: string;
    idempotencyKey?: string;
    useCache?: boolean;
    timeoutInSeconds?: number;
}
export declare class ContractEventListenerDto {
    contractType: ContractType;
    network?: ContractNetwork;
    startLedger?: number;
}
export declare class ContractDeploymentDto {
    contractType: ContractType;
    network?: ContractNetwork;
    alias?: string;
    version?: string;
    contractId?: string;
    prebuiltTransactionXdr?: string;
    deploymentTxHash?: string;
    signerSecretKey?: string;
    abi?: Record<string, any>;
    metadata?: Record<string, any>;
    deploymentMetadata?: Record<string, any>;
}
export declare class ContractUpgradeDto extends ContractDeploymentDto {
    previousContractId: string;
    activate?: boolean;
}
