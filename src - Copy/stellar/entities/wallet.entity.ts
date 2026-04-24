/**
 * Wallet Entity
 * 
 * Represents a connected Stellar wallet.
 */

export enum WalletType {
  FREIGHTER = 'FREIGHTER',
  ALBEDO = 'ALBEDO',
  RABET = 'RABET',
  KEYPAIR = 'KEYPAIR',
}

export enum WalletStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  PENDING = 'PENDING',
  ERROR = 'ERROR',
}

export class Wallet {
  /** Unique wallet identifier */
  id: string;

  /** User ID who owns this wallet */
  userId: string;

  /** Stellar public key/address */
  publicKey: string;

  /** Type of wallet connection */
  walletType: WalletType;

  /** Current wallet status */
  status: WalletStatus;

  /** Network (testnet/mainnet) */
  network: string;

  /** Optional wallet name/label */
  name?: string;

  /** Cached balance information */
  balances?: WalletBalance[];

  /** Timestamp when wallet was connected */
  connectedAt: Date;

  /** Last activity timestamp */
  lastActivityAt?: Date;

  /** Timestamp when created */
  createdAt: Date;

  /** Timestamp when last updated */
  updatedAt: Date;
}

export interface WalletBalance {
  assetType: 'native' | 'credit_alphanum4' | 'credit_alphanum12';
  assetCode?: string;
  issuer?: string;
  balance: number;
  limit?: number;
  buyingLiabilities?: number;
  sellingLiabilities?: number;
}
