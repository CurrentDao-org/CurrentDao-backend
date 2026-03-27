export declare enum ContractType {
    TOKEN = "token",
    ESCROW = "escrow",
    GOVERNANCE = "governance"
}
export declare enum ContractNetwork {
    TESTNET = "testnet",
    MAINNET = "mainnet"
}
export declare enum ContractStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    DEPLOYING = "deploying",
    FAILED = "failed",
    DEPRECATED = "deprecated"
}
export declare class ContractEntity {
    id: string;
    contractType: ContractType;
    network: ContractNetwork;
    contractId: string;
    alias?: string;
    version?: string;
    specHash?: string;
    metadataCacheKey?: string;
    deploymentTxHash?: string;
    upgradeTxHash?: string;
    previousContractId?: string;
    deployedBy?: string;
    status: ContractStatus;
    isActive: boolean;
    abi?: Record<string, any>;
    metadata?: Record<string, any>;
    deploymentMetadata?: Record<string, any>;
    lastProcessedLedger?: string;
    lastEventAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
