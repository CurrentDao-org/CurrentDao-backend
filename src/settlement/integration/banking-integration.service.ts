import { Injectable, Logger } from '@nestjs/common';
import { Transaction, Party, BankingIntegrationDto } from '../dto/settlement.dto';

export interface TransferRequest {
  transactionId: string;
  fromParty: Party;
  toParty: Party;
  amount: number;
  currency: string;
  transferMethod: 'ACH' | 'WIRE' | 'SEPA' | 'SWIFT';
  priority: 'STANDARD' | 'EXPRESS' | 'URGENT';
}

export interface TransferResult {
  transferId: string;
  transactionId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  amount: number;
  currency: string;
  fromAccount: string;
  toAccount: string;
  transferMethod: string;
  initiatedAt: Date;
  completedAt?: Date;
  trackingNumber?: string;
  fees: number;
  error?: string;
}

export interface BankAccount {
  accountId: string;
  partyId: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  swiftCode?: string;
  currency: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  dailyLimit: number;
  monthlyLimit: number;
  currentDailyVolume: number;
  currentMonthlyVolume: number;
  lastUsed: Date;
}

export interface BankingProvider {
  name: string;
  supportedMethods: string[];
  supportedCurrencies: string[];
  processingTime: Record<string, number>; // in hours
  fees: Record<string, number>;
  reliability: number; // 0-1
}

@Injectable()
export class BankingIntegrationService {
  private readonly logger = new Logger(BankingIntegrationService.name);
  private readonly bankAccounts = new Map<string, BankAccount>();
  private readonly transfers = new Map<string, TransferResult>();
  private bankingProviders: BankingProvider[] = [];

  constructor() {
    this.initializeBankingProviders();
    this.initializeSampleAccounts();
  }

  async executeTransfer(transaction: Transaction, parties: Party[]): Promise<TransferResult> {
    const fromParty = parties.find(p => p.id === transaction.fromPartyId);
    const toParty = parties.find(p => p.id === transaction.toPartyId);

    if (!fromParty || !toParty) {
      throw new Error('Invalid parties for transaction');
    }

    this.logger.log(`Executing transfer: ${transaction.amount} ${transaction.currency} from ${fromParty.id} to ${toParty.id}`);

    try {
      // Validate bank accounts
      const fromAccount = await this.validateBankAccount(fromParty.id, transaction.currency);
      const toAccount = await this.validateBankAccount(toParty.id, transaction.currency);

      // Check limits
      await this.checkTransferLimits(fromAccount, transaction.amount);

      // Determine optimal transfer method
      const transferMethod = await this.determineTransferMethod(transaction, fromAccount, toAccount);

      // Create transfer request
      const transferRequest: TransferRequest = {
        transactionId: transaction.id,
        fromParty,
        toParty,
        amount: transaction.amount,
        currency: transaction.currency,
        transferMethod: transferMethod.method,
        priority: 'STANDARD',
      };

      // Execute transfer
      const result = await this.processTransfer(transferRequest, fromAccount, toAccount);

      // Update account volumes
      await this.updateAccountVolumes(fromAccount, transaction.amount);

      this.logger.log(`Transfer ${result.transferId} initiated successfully`);
      return result;

    } catch (error) {
      this.logger.error(`Transfer execution failed: ${error.message}`);
      throw error;
    }
  }

  async getTransferStatus(transferId: string): Promise<TransferResult> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      throw new Error(`Transfer ${transferId} not found`);
    }

    // Simulate status updates for pending transfers
    if (transfer.status === 'PENDING') {
      const timeSinceInitiated = Date.now() - transfer.initiatedAt.getTime();
      const provider = this.getBankingProvider(transfer.transferMethod);
      
      if (timeSinceInitiated > provider.processingTime[transfer.currency] * 60 * 60 * 1000) {
        transfer.status = 'COMPLETED';
        transfer.completedAt = new Date();
        this.transfers.set(transferId, transfer);
      }
    }

    return transfer;
  }

  async cancelTransfer(transferId: string): Promise<boolean> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      throw new Error(`Transfer ${transferId} not found`);
    }

    if (transfer.status !== 'PENDING') {
      throw new Error(`Cannot cancel transfer in ${transfer.status} status`);
    }

    transfer.status = 'CANCELLED';
    this.transfers.set(transferId, transfer);

    this.logger.log(`Transfer ${transferId} cancelled`);
    return true;
  }

  async getBankAccount(partyId: string, currency: string): Promise<BankAccount> {
    const accountKey = `${partyId}_${currency}`;
    const account = this.bankAccounts.get(accountKey);
    
    if (!account) {
      throw new Error(`Bank account not found for party ${partyId} in currency ${currency}`);
    }

    return account;
  }

  async addBankAccount(bankingDto: BankingIntegrationDto, partyId: string): Promise<BankAccount> {
    this.logger.log(`Adding bank account for party ${partyId}`);

    const account: BankAccount = {
      accountId: this.generateAccountId(),
      partyId,
      bankName: bankingDto.bankName,
      accountNumber: bankingDto.accountNumber,
      routingNumber: bankingDto.routingNumber,
      swiftCode: bankingDto.swiftCode,
      currency: bankingDto.currency,
      status: 'ACTIVE',
      dailyLimit: 1000000,
      monthlyLimit: 10000000,
      currentDailyVolume: 0,
      currentMonthlyVolume: 0,
      lastUsed: new Date(),
    };

    const accountKey = `${partyId}_${bankingDto.currency}`;
    this.bankAccounts.set(accountKey, account);

    this.logger.log(`Bank account ${account.accountId} added successfully`);
    return account;
  }

  async getBankingMetrics(timeRange?: string): Promise<any> {
    const transfers = Array.from(this.transfers.values());
    const filteredTransfers = this.filterTransfersByTimeRange(transfers, timeRange);

    const completedTransfers = filteredTransfers.filter(t => t.status === 'COMPLETED');
    const failedTransfers = filteredTransfers.filter(t => t.status === 'FAILED');
    const pendingTransfers = filteredTransfers.filter(t => t.status === 'PENDING');

    const totalVolume = completedTransfers.reduce((sum, t) => sum + t.amount, 0);
    const totalFees = completedTransfers.reduce((sum, t) => sum + t.fees, 0);

    return {
      totalTransfers: filteredTransfers.length,
      completedTransfers: completedTransfers.length,
      failedTransfers: failedTransfers.length,
      pendingTransfers: pendingTransfers.length,
      successRate: (completedTransfers.length / filteredTransfers.length) * 100,
      totalVolume,
      totalFees,
      averageTransferAmount: completedTransfers.length > 0 ? totalVolume / completedTransfers.length : 0,
      transferMethodBreakdown: this.calculateMethodBreakdown(completedTransfers),
      currencyBreakdown: this.calculateCurrencyBreakdown(completedTransfers),
      averageProcessingTime: this.calculateAverageProcessingTime(completedTransfers),
      providerReliability: this.calculateProviderReliability(),
      timestamp: new Date().toISOString(),
    };
  }

  private async validateBankAccount(partyId: string, currency: string): Promise<BankAccount> {
    const account = await this.getBankAccount(partyId, currency);
    
    if (account.status !== 'ACTIVE') {
      throw new Error(`Bank account ${account.accountId} is not active`);
    }

    return account;
  }

  private async checkTransferLimits(account: BankAccount, amount: number): Promise<void> {
    if (amount > account.dailyLimit - account.currentDailyVolume) {
      throw new Error(`Transfer amount exceeds daily limit for account ${account.accountId}`);
    }

    if (amount > account.monthlyLimit - account.currentMonthlyVolume) {
      throw new Error(`Transfer amount exceeds monthly limit for account ${account.accountId}`);
    }
  }

  private async determineTransferMethod(
    transaction: Transaction,
    fromAccount: BankAccount,
    toAccount: BankAccount,
  ): Promise<{ method: 'ACH' | 'WIRE' | 'SEPA' | 'SWIFT', provider: BankingProvider }> {
    // Simple logic to determine transfer method based on currency and amount
    if (transaction.currency === 'USD' && transaction.amount < 25000) {
      return { method: 'ACH', provider: this.getBankingProvider('ACH') };
    } else if (transaction.currency === 'EUR' && fromAccount.swiftCode && toAccount.swiftCode) {
      return { method: 'SEPA', provider: this.getBankingProvider('SEPA') };
    } else if (transaction.amount > 100000) {
      return { method: 'WIRE', provider: this.getBankingProvider('WIRE') };
    } else {
      return { method: 'SWIFT', provider: this.getBankingProvider('SWIFT') };
    }
  }

  private async processTransfer(
    request: TransferRequest,
    fromAccount: BankAccount,
    toAccount: BankAccount,
  ): Promise<TransferResult> {
    const provider = this.getBankingProvider(request.transferMethod);
    const fees = provider.fees[request.currency] || 0;

    const result: TransferResult = {
      transferId: this.generateTransferId(),
      transactionId: request.transactionId,
      status: 'PENDING',
      amount: request.amount,
      currency: request.currency,
      fromAccount: fromAccount.accountNumber,
      toAccount: toAccount.accountNumber,
      transferMethod: request.transferMethod,
      initiatedAt: new Date(),
      trackingNumber: this.generateTrackingNumber(),
      fees,
    };

    // Simulate processing based on provider reliability
    const successProbability = provider.reliability;
    const random = Math.random();

    if (random > successProbability) {
      result.status = 'FAILED';
      result.error = 'Bank processing error';
    }

    this.transfers.set(result.transferId, result);
    return result;
  }

  private async updateAccountVolumes(account: BankAccount, amount: number): Promise<void> {
    account.currentDailyVolume += amount;
    account.currentMonthlyVolume += amount;
    account.lastUsed = new Date();

    const accountKey = `${account.partyId}_${account.currency}`;
    this.bankAccounts.set(accountKey, account);
  }

  private getBankingProvider(method: string): BankingProvider {
    const provider = this.bankingProviders.find(p => p.supportedMethods.includes(method));
    if (!provider) {
      throw new Error(`Banking provider not found for method ${method}`);
    }
    return provider;
  }

  private filterTransfersByTimeRange(transfers: TransferResult[], timeRange?: string): TransferResult[] {
    if (!timeRange) {
      // Default to last 24 hours
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return transfers.filter(t => t.initiatedAt >= cutoff);
    }

    const hours = parseInt(timeRange.replace('h', ''));
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return transfers.filter(t => t.initiatedAt >= cutoff);
  }

  private calculateMethodBreakdown(transfers: TransferResult[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    for (const transfer of transfers) {
      breakdown[transfer.transferMethod] = (breakdown[transfer.transferMethod] || 0) + 1;
    }
    
    return breakdown;
  }

  private calculateCurrencyBreakdown(transfers: TransferResult[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    for (const transfer of transfers) {
      breakdown[transfer.currency] = (breakdown[transfer.currency] || 0) + transfer.amount;
    }
    
    return breakdown;
  }

  private calculateAverageProcessingTime(transfers: TransferResult[]): number {
    const completedTransfers = transfers.filter(t => t.status === 'COMPLETED' && t.completedAt);
    
    if (completedTransfers.length === 0) return 0;

    const totalTime = completedTransfers.reduce((sum, t) => {
      return sum + (t.completedAt!.getTime() - t.initiatedAt.getTime());
    }, 0);

    return totalTime / completedTransfers.length / (1000 * 60 * 60); // in hours
  }

  private calculateProviderReliability(): Record<string, number> {
    const reliability: Record<string, number> = {};
    
    for (const provider of this.bankingProviders) {
      reliability[provider.name] = provider.reliability * 100;
    }
    
    return reliability;
  }

  private initializeBankingProviders(): void {
    this.bankingProviders = [
      {
        name: 'JP Morgan Chase',
        supportedMethods: ['ACH', 'WIRE'],
        supportedCurrencies: ['USD'],
        processingTime: { USD: 1 },
        fees: { USD: 25 },
        reliability: 0.995,
      },
      {
        name: 'Deutsche Bank',
        supportedMethods: ['SEPA', 'SWIFT'],
        supportedCurrencies: ['EUR', 'USD', 'GBP'],
        processingTime: { EUR: 0.5, USD: 1, GBP: 1 },
        fees: { EUR: 15, USD: 30, GBP: 25 },
        reliability: 0.992,
      },
      {
        name: 'HSBC',
        supportedMethods: ['SWIFT', 'WIRE'],
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'JPY', 'CNY'],
        processingTime: { USD: 2, EUR: 1, GBP: 1, JPY: 2, CNY: 3 },
        fees: { USD: 35, EUR: 25, GBP: 25, JPY: 40, CNY: 45 },
        reliability: 0.988,
      },
    ];
  }

  private initializeSampleAccounts(): void {
    const sampleAccounts: BankAccount[] = [
      {
        accountId: 'ACC_001',
        partyId: 'party_001',
        bankName: 'JP Morgan Chase',
        accountNumber: '123456789',
        routingNumber: '021000021',
        currency: 'USD',
        status: 'ACTIVE',
        dailyLimit: 1000000,
        monthlyLimit: 10000000,
        currentDailyVolume: 0,
        currentMonthlyVolume: 0,
        lastUsed: new Date(),
      },
      {
        accountId: 'ACC_002',
        partyId: 'party_002',
        bankName: 'Deutsche Bank',
        accountNumber: '987654321',
        routingNumber: 'DEUTDEFF',
        swiftCode: 'DEUTDEFFXXX',
        currency: 'EUR',
        status: 'ACTIVE',
        dailyLimit: 800000,
        monthlyLimit: 8000000,
        currentDailyVolume: 0,
        currentMonthlyVolume: 0,
        lastUsed: new Date(),
      },
    ];

    for (const account of sampleAccounts) {
      const accountKey = `${account.partyId}_${account.currency}`;
      this.bankAccounts.set(accountKey, account);
    }
  }

  private generateAccountId(): string {
    return `ACC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTransferId(): string {
    return `TXF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTrackingNumber(): string {
    return Math.random().toString(36).substr(2, 15).toUpperCase();
  }
}
