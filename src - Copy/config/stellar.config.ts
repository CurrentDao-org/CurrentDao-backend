import { registerAs } from '@nestjs/config';
import { Networks } from '@stellar/stellar-sdk';

export type SorobanNetworkName = 'testnet' | 'mainnet';

export interface SorobanNetworkConfig {
  networkPassphrase: string;
  horizonUrl: string;
  sorobanRpcUrl: string;
  friendbotUrl?: string;
}

export default registerAs('stellar', () => {
  const configuredNetwork = (
    process.env.STELLAR_NETWORK || 'testnet'
  ).toLowerCase();
  const defaultNetwork: SorobanNetworkName =
    configuredNetwork === 'public' || configuredNetwork === 'mainnet'
      ? 'mainnet'
      : 'testnet';

  const testnet: SorobanNetworkConfig = {
    networkPassphrase:
      process.env.STELLAR_TESTNET_PASSPHRASE || Networks.TESTNET,
    horizonUrl:
      process.env.STELLAR_TESTNET_HORIZON_URL ||
      'https://horizon-testnet.stellar.org',
    sorobanRpcUrl:
      process.env.STELLAR_TESTNET_RPC_URL ||
      'https://soroban-testnet.stellar.org',
    friendbotUrl:
      process.env.STELLAR_TESTNET_FRIENDBOT_URL ||
      'https://friendbot.stellar.org',
  };

  const mainnet: SorobanNetworkConfig = {
    networkPassphrase:
      process.env.STELLAR_MAINNET_PASSPHRASE || Networks.PUBLIC,
    horizonUrl:
      process.env.STELLAR_MAINNET_HORIZON_URL || 'https://horizon.stellar.org',
    sorobanRpcUrl:
      process.env.STELLAR_MAINNET_RPC_URL || 'https://rpc.mainnet.stellar.org',
  };

  return {
    defaultNetwork,
    sourceSecretKey: process.env.STELLAR_SOURCE_SECRET_KEY,
    sourcePublicKey: process.env.STELLAR_SOURCE_PUBLIC_KEY,
    metadataCacheTtlMs: parseInt(
      process.env.STELLAR_METADATA_CACHE_TTL_MS || '300000',
      10,
    ),
    eventPollingIntervalMs: parseInt(
      process.env.STELLAR_EVENT_POLLING_INTERVAL_MS || '5000',
      10,
    ),
    rpcTimeoutMs: parseInt(process.env.STELLAR_RPC_TIMEOUT_MS || '15000', 10),
    submissionTimeoutMs: parseInt(
      process.env.STELLAR_SUBMISSION_TIMEOUT_MS || '30000',
      10,
    ),
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
