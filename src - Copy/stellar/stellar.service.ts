/**
 * Stellar Service
 * 
 * Main service for Stellar blockchain integration.
 * Handles wallet connections, transactions, and balance checking.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';
import { Wallet, WalletType, WalletStatus, WalletBalance } from './entities/wallet.entity';
import { FreighterWalletService } from './wallets/freighter.wallet';
import { AlbedoWalletService } from './wallets/albedo.wallet';

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  
  // In-memory wallet storage (replace with database in production)
  private wallets: Map<string, Wallet> = new Map();
  
  // Stellar SDK instances
  private server: StellarSdk.Server;
  private networkPassphrase: string;

  constructor(
    private configService: ConfigService,
    private freighterWallet: FreighterWalletService,
    private albedoWallet: AlbedoWalletService,
  ) {
    this.initializeStellarConnection();
  }

  /**
   * Initialize Stellar connection based on network
   */
  private initializeStellarConnection(): void {
    const network = this.configService.get<string>('stellar.defaultNetwork') || 'testnet';
    const networks = this.configService.get<any>('stellar.networks', {});
    
    const networkConfig = networks[network] || networks.testnet;
    
    this.networkPassphrase = networkConfig.networkPassphrase;
    
    // Create Horizon server instance
    this.server = new StellarSdk.Server(networkConfig.horizonUrl, {
      allowHttp: network === 'testnet',
    });
    
    this.logger.log(`Connected to Stellar ${network} network`);
  }

  /**
   * Connect wallet
   */
  async connectWallet(
    userId: string,
    walletType: WalletType,
    network: string,
    name?: string,
  ): Promise<Wallet> {
    this.logger.debug(`Connecting wallet type: ${walletType} for user: ${userId}`);

    let publicKey: string;
    let walletName: string;

    try {
      // Connect to appropriate wallet
      if (walletType === WalletType.FREIGHTER) {
        const result = await this.freighterWallet.connect(network);
        publicKey = result.publicKey;
        walletName = result.name || 'Freighter';
      } else if (walletType === WalletType.ALBEDO) {
        const result = await this.albedoWallet.connect(network);
        publicKey = result.publicKey;
        walletName = result.name || 'Albedo';
      } else {
        throw new Error(`Unsupported wallet type: ${walletType}`);
      }

      // Create or update wallet record
      const wallet = this.createOrUpdateWallet(userId, publicKey, walletType, network, name || walletName);
      
      this.logger.log(`Wallet connected successfully: ${publicKey}`);
      
      return wallet;
    } catch (error) {
      this.logger.error('Failed to connect wallet:', error.message);
      throw new Error(`Wallet connection failed: ${error.message}`);
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnectWallet(walletId: string): Promise<void> {
    const wallet = this.wallets.get(walletId);
    
    if (!wallet) {
      throw new NotFoundException(`Wallet not found: ${walletId}`);
    }

    this.logger.debug(`Disconnecting wallet: ${walletId}`);

    // Disconnect from wallet provider
    if (wallet.walletType === WalletType.FREIGHTER) {
      await this.freighterWallet.disconnect();
    } else if (wallet.walletType === WalletType.ALBEDO) {
      await this.albedoWallet.disconnect();
    }

    // Update wallet status
    wallet.status = WalletStatus.DISCONNECTED;
    wallet.updatedAt = new Date();
    this.wallets.set(walletId, wallet);

    this.logger.log(`Wallet disconnected: ${walletId}`);
  }

  /**
   * Get wallet balance
   */
  async getBalance(publicKey: string, assetCode?: string): Promise<WalletBalance[]> {
    this.logger.debug(`Getting balance for: ${publicKey}`);

    try {
      // Fetch account from Stellar network
      const account = await this.server.loadAccount(publicKey);
      
      const balances: WalletBalance[] = account.balances.map((balance) => ({
        assetType: balance.asset_type as any,
        assetCode: balance.asset_code,
        issuer: balance.issuer,
        balance: parseFloat(balance.balance),
        limit: balance.limit ? parseFloat(balance.limit) : undefined,
        buyingLiabilities: balance.buying_liabilities ? parseFloat(balance.buying_liabilities) : undefined,
        sellingLiabilities: balance.selling_liabilities ? parseFloat(balance.selling_liabilities) : undefined,
      }));

      // Filter by asset code if specified
      if (assetCode) {
        return balances.filter(b => b.assetCode === assetCode);
      }

      return balances;
    } catch (error) {
      this.logger.error('Failed to get balance:', error.message);
      
      if (error.response?.status === 404) {
        throw new NotFoundException('Account not found on Stellar network');
      }
      
      throw new Error(`Balance query failed: ${error.message}`);
    }
  }

  /**
   * Sign transaction
   */
  async signTransaction(
    walletType: WalletType,
    publicKey: string,
    transactionXdr: string,
  ): Promise<string> {
    this.logger.debug(`Signing transaction with ${walletType} for ${publicKey}`);

    try {
      if (walletType === WalletType.FREIGHTER) {
        return await this.freighterWallet.signTransaction(
          publicKey,
          transactionXdr,
          this.networkPassphrase,
        );
      } else if (walletType === WalletType.ALBEDO) {
        return await this.albedoWallet.signTransaction(
          publicKey,
          transactionXdr,
          this.networkPassphrase,
        );
      } else {
        throw new Error(`Unsupported wallet type for signing: ${walletType}`);
      }
    } catch (error) {
      this.logger.error('Failed to sign transaction:', error.message);
      throw new Error(`Transaction signing failed: ${error.message}`);
    }
  }

  /**
   * Submit transaction to Stellar network
   */
  async submitTransaction(signedTransactionXdr: string): Promise<{
    hash: string;
    success: boolean;
    ledger: number;
    createdAt: string;
  }> {
    this.logger.debug('Submitting transaction to Stellar network');

    try {
      const transaction = StellarSdk.TransactionBuilder.fromXDL(
        signedTransactionXdr,
        {
          networkPassphrase: this.networkPassphrase,
        },
      );

      const response = await this.server.submitTransaction(transaction);

      this.logger.log(`Transaction submitted successfully: ${response.hash}`);

      return {
        hash: response.hash,
        success: true,
        ledger: response.ledger,
        createdAt: response.createdAt,
      };
    } catch (error) {
      this.logger.error('Failed to submit transaction:', error.message);
      
      // Check if it's a timeout error
      if (error.response?.status === 504) {
        throw new Error('Transaction submission timed out. Please check transaction status.');
      }
      
      throw new Error(`Transaction submission failed: ${error.message}`);
    }
  }

  /**
   * Monitor transaction status
   */
  async monitorTransaction(transactionHash: string, timeoutMs: number = 30000): Promise<boolean> {
    this.logger.debug(`Monitoring transaction: ${transactionHash}`);

    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const tx = await this.server.transactions().transaction(transactionHash).call();
        
        if (tx.successful) {
          this.logger.log(`Transaction confirmed: ${transactionHash}`);
          return true;
        } else if (tx.ledger > 0) {
          this.logger.warn(`Transaction failed: ${transactionHash}`);
          return false;
        }
      } catch (error) {
        // Transaction not found yet, continue polling
        this.logger.debug('Transaction not yet in ledger, continuing to poll...');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    this.logger.warn(`Transaction monitoring timed out: ${transactionHash}`);
    throw new Error('Transaction monitoring timed out');
  }

  /**
   * Create or update wallet record
   */
  private createOrUpdateWallet(
    userId: string,
    publicKey: string,
    walletType: WalletType,
    network: string,
    name: string,
  ): Wallet {
    // Check if wallet already exists
    const existingWallet = Array.from(this.wallets.values()).find(
      w => w.publicKey === publicKey && w.userId === userId,
    );

    if (existingWallet) {
      existingWallet.status = WalletStatus.CONNECTED;
      existingWallet.lastActivityAt = new Date();
      existingWallet.updatedAt = new Date();
      this.wallets.set(existingWallet.id, existingWallet);
      return existingWallet;
    }

    // Create new wallet
    const wallet: Wallet = {
      id: `wallet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      publicKey,
      walletType,
      network,
      name,
      status: WalletStatus.CONNECTED,
      connectedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.wallets.set(wallet.id, wallet);
    return wallet;
  }

  /**
   * Get wallet by ID
   */
  getWallet(walletId: string): Wallet | null {
    return this.wallets.get(walletId) || null;
  }

  /**
   * Get all wallets for a user
   */
  getUserWallets(userId: string): Wallet[] {
    return Array.from(this.wallets.values()).filter(w => w.userId === userId);
  }
}
