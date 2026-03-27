"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
const stellar_sdk_1 = require("@stellar/stellar-sdk");
exports.default = (0, config_1.registerAs)('stellar', () => {
    const configuredNetwork = (process.env.STELLAR_NETWORK || 'testnet').toLowerCase();
    const defaultNetwork = configuredNetwork === 'public' || configuredNetwork === 'mainnet'
        ? 'mainnet'
        : 'testnet';
    const testnet = {
        networkPassphrase: process.env.STELLAR_TESTNET_PASSPHRASE || stellar_sdk_1.Networks.TESTNET,
        horizonUrl: process.env.STELLAR_TESTNET_HORIZON_URL ||
            'https://horizon-testnet.stellar.org',
        sorobanRpcUrl: process.env.STELLAR_TESTNET_RPC_URL ||
            'https://soroban-testnet.stellar.org',
        friendbotUrl: process.env.STELLAR_TESTNET_FRIENDBOT_URL ||
            'https://friendbot.stellar.org',
    };
    const mainnet = {
        networkPassphrase: process.env.STELLAR_MAINNET_PASSPHRASE || stellar_sdk_1.Networks.PUBLIC,
        horizonUrl: process.env.STELLAR_MAINNET_HORIZON_URL || 'https://horizon.stellar.org',
        sorobanRpcUrl: process.env.STELLAR_MAINNET_RPC_URL || 'https://rpc.mainnet.stellar.org',
    };
    return {
        defaultNetwork,
        sourceSecretKey: process.env.STELLAR_SOURCE_SECRET_KEY,
        sourcePublicKey: process.env.STELLAR_SOURCE_PUBLIC_KEY,
        metadataCacheTtlMs: parseInt(process.env.STELLAR_METADATA_CACHE_TTL_MS || '300000', 10),
        eventPollingIntervalMs: parseInt(process.env.STELLAR_EVENT_POLLING_INTERVAL_MS || '5000', 10),
        rpcTimeoutMs: parseInt(process.env.STELLAR_RPC_TIMEOUT_MS || '15000', 10),
        submissionTimeoutMs: parseInt(process.env.STELLAR_SUBMISSION_TIMEOUT_MS || '30000', 10),
        networks: {
            testnet,
            mainnet,
        },
        contracts: {
            token: {
                testnet: process.env.STELLAR_WATT_TOKEN_CONTRACT_ID_TESTNET,
                mainnet: process.env.STELLAR_WATT_TOKEN_CONTRACT_ID_MAINNET,
            },
            escrow: {
                testnet: process.env.STELLAR_ESCROW_CONTRACT_ID_TESTNET,
                mainnet: process.env.STELLAR_ESCROW_CONTRACT_ID_MAINNET,
            },
            governance: {
                testnet: process.env.STELLAR_GOVERNANCE_CONTRACT_ID_TESTNET,
                mainnet: process.env.STELLAR_GOVERNANCE_CONTRACT_ID_MAINNET,
            },
        },
    };
});
//# sourceMappingURL=stellar.config.js.map