export type SorobanNetworkName = 'testnet' | 'mainnet';
export interface SorobanNetworkConfig {
    networkPassphrase: string;
    horizonUrl: string;
    sorobanRpcUrl: string;
    friendbotUrl?: string;
}
declare const _default: (() => {
    defaultNetwork: SorobanNetworkName;
    sourceSecretKey: string;
    sourcePublicKey: string;
    metadataCacheTtlMs: number;
    eventPollingIntervalMs: number;
    rpcTimeoutMs: number;
    submissionTimeoutMs: number;
    networks: {
        testnet: SorobanNetworkConfig;
        mainnet: SorobanNetworkConfig;
    };
    contracts: {
        token: {
            testnet: string;
            mainnet: string;
        };
        escrow: {
            testnet: string;
            mainnet: string;
        };
        governance: {
            testnet: string;
            mainnet: string;
        };
    };
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    defaultNetwork: SorobanNetworkName;
    sourceSecretKey: string;
    sourcePublicKey: string;
    metadataCacheTtlMs: number;
    eventPollingIntervalMs: number;
    rpcTimeoutMs: number;
    submissionTimeoutMs: number;
    networks: {
        testnet: SorobanNetworkConfig;
        mainnet: SorobanNetworkConfig;
    };
    contracts: {
        token: {
            testnet: string;
            mainnet: string;
        };
        escrow: {
            testnet: string;
            mainnet: string;
        };
        governance: {
            testnet: string;
            mainnet: string;
        };
    };
}>;
export default _default;
