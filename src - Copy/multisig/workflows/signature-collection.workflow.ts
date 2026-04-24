import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MultisigWallet,
  WalletStatus,
} from '../entities/multisig-wallet.entity';
import { Signature, SignatureStatus } from '../entities/signature.entity';

export interface SignatureWorkflowEvent {
  type:
    | 'signature_collected'
    | 'signature_revoked'
    | 'signature_expired'
    | 'threshold_reached';
  wallet: MultisigWallet;
  signature?: Signature;
  signatures?: Signature[];
  timestamp: Date;
}

@Injectable()
export class SignatureCollectionWorkflow {
  private readonly logger = new Logger(SignatureCollectionWorkflow.name);

  constructor(
    @InjectRepository(Signature)
    private readonly signatureRepository: Repository<Signature>,
  ) {}

  async processSignature(
    wallet: MultisigWallet,
    signature: Signature,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      await this.validateSignature(wallet, signature);

      signature.status = SignatureStatus.COLLECTED;
      await this.signatureRepository.save(signature);

      const allSignatures = await this.getSignaturesForTransaction(
        signature.transactionHash,
      );
      const collectedSignatures = allSignatures.filter(
        (s) => s.status === SignatureStatus.COLLECTED,
      );

      await this.auditLog({
        eventType: 'signature_collected',
        walletId: wallet.id,
        transactionHash: signature.transactionHash,
        signerId: signature.signerId,
        signatureCount: collectedSignatures.length,
        requiredSignatures: wallet.requiredSignatures,
        timestamp: new Date(),
      });

      await this.notifySigners(wallet, signature, collectedSignatures);

      if (wallet.canExecute(collectedSignatures.length)) {
        await this.handleThresholdReached(
          wallet,
          signature.transactionHash,
          collectedSignatures,
        );
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Signature processed in ${processingTime}ms for transaction ${signature.transactionHash}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process signature for transaction ${signature.transactionHash}:`,
        error,
      );
      throw error;
    }
  }

  async processRevocation(
    wallet: MultisigWallet,
    signature: Signature,
  ): Promise<void> {
    try {
      const allSignatures = await this.getSignaturesForTransaction(
        signature.transactionHash,
      );
      const activeSignatures = allSignatures.filter(
        (s) => s.status === SignatureStatus.COLLECTED,
      );

      await this.auditLog({
        eventType: 'signature_revoked',
        walletId: wallet.id,
        transactionHash: signature.transactionHash,
        signerId: signature.signerId,
        revocationReason: signature.revocationReason,
        remainingSignatures: activeSignatures.length,
        requiredSignatures: wallet.requiredSignatures,
        timestamp: new Date(),
      });

      await this.notifySignersOfRevocation(wallet, signature, activeSignatures);

      this.logger.log(
        `Signature revoked for transaction ${signature.transactionHash} by signer ${signature.signerId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process signature revocation for transaction ${signature.transactionHash}:`,
        error,
      );
      throw error;
    }
  }

  async processExpiry(
    wallet: MultisigWallet,
    signature: Signature,
  ): Promise<void> {
    try {
      const allSignatures = await this.getSignaturesForTransaction(
        signature.transactionHash,
      );
      const activeSignatures = allSignatures.filter(
        (s) => s.status === SignatureStatus.COLLECTED,
      );

      await this.auditLog({
        eventType: 'signature_expired',
        walletId: wallet.id,
        transactionHash: signature.transactionHash,
        signerId: signature.signerId,
        expiredAt: signature.expiresAt,
        remainingSignatures: activeSignatures.length,
        requiredSignatures: wallet.requiredSignatures,
        timestamp: new Date(),
      });

      await this.notifySignersOfExpiry(wallet, signature, activeSignatures);

      this.logger.log(
        `Signature expired for transaction ${signature.transactionHash} from signer ${signature.signerId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process signature expiry for transaction ${signature.transactionHash}:`,
        error,
      );
      throw error;
    }
  }

  async getSignaturesForTransaction(
    transactionHash: string,
  ): Promise<Signature[]> {
    return this.signatureRepository.find({
      where: { transactionHash },
      order: { createdAt: 'ASC' },
    });
  }

  async getTransactionProgress(transactionHash: string): Promise<{
    totalSigners: number;
    requiredSignatures: number;
    collectedSignatures: number;
    pendingSignatures: number;
    expiredSignatures: number;
    revokedSignatures: number;
    isReady: boolean;
    timeToExpiry: number;
  }> {
    const signatures = await this.getSignaturesForTransaction(transactionHash);

    if (signatures.length === 0) {
      throw new Error('No signatures found for transaction');
    }

    const wallet =
      signatures[0].wallet ||
      (
        await this.signatureRepository.findOne({
          where: { transactionHash },
          relations: ['wallet'],
        })
      ).wallet;

    const collected = signatures.filter(
      (s) => s.status === SignatureStatus.COLLECTED,
    ).length;
    const pending = signatures.filter(
      (s) => s.status === SignatureStatus.PENDING && !s.isExpired,
    ).length;
    const expired = signatures.filter(
      (s) => s.status === SignatureStatus.EXPIRED || s.isExpired,
    ).length;
    const revoked = signatures.filter(
      (s) => s.status === SignatureStatus.REVOKED,
    ).length;

    const timeToExpiry = Math.max(...signatures.map((s) => s.timeToExpiry));

    return {
      totalSigners: wallet.signers.length,
      requiredSignatures: wallet.requiredSignatures,
      collectedSignatures: collected,
      pendingSignatures: pending,
      expiredSignatures: expired,
      revokedSignatures: revoked,
      isReady: wallet.canExecute(collected),
      timeToExpiry,
    };
  }

  private async validateSignature(
    wallet: MultisigWallet,
    signature: Signature,
  ): Promise<void> {
    if (
      wallet.status === WalletStatus.LOCKED ||
      wallet.status === WalletStatus.TERMINATED
    ) {
      throw new Error('Wallet is not available for transactions');
    }

    if (signature.isExpired) {
      throw new Error('Signature has expired');
    }

    const existingSignature = await this.signatureRepository.findOne({
      where: {
        transactionHash: signature.transactionHash,
        signerId: signature.signerId,
        status: [SignatureStatus.COLLECTED, SignatureStatus.EXECUTED],
      },
    });

    if (existingSignature) {
      throw new Error('Duplicate signature detected');
    }
  }

  private async handleThresholdReached(
    wallet: MultisigWallet,
    transactionHash: string,
    signatures: Signature[],
  ): Promise<void> {
    try {
      await this.auditLog({
        eventType: 'threshold_reached',
        walletId: wallet.id,
        transactionHash,
        signerIds: signatures.map((s) => s.signerId),
        signatureCount: signatures.length,
        requiredSignatures: wallet.requiredSignatures,
        timestamp: new Date(),
      });

      await this.notifyThresholdReached(wallet, transactionHash, signatures);

      this.logger.log(
        `Threshold reached for transaction ${transactionHash} with ${signatures.length} signatures`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle threshold reached for transaction ${transactionHash}:`,
        error,
      );
    }
  }

  private async notifySigners(
    wallet: MultisigWallet,
    signature: Signature,
    collectedSignatures: Signature[],
  ): Promise<void> {
    const notificationData = {
      type: 'signature_collected',
      walletId: wallet.id,
      walletName: wallet.name,
      transactionHash: signature.transactionHash,
      signerId: signature.signerId,
      collectedCount: collectedSignatures.length,
      requiredCount: wallet.requiredSignatures,
      isReady: wallet.canExecute(collectedSignatures.length),
      expiresAt: signature.expiresAt,
    };

    await this.sendNotificationsToSigners(wallet.signers, notificationData);
  }

  private async notifySignersOfRevocation(
    wallet: MultisigWallet,
    signature: Signature,
    activeSignatures: Signature[],
  ): Promise<void> {
    const notificationData = {
      type: 'signature_revoked',
      walletId: wallet.id,
      walletName: wallet.name,
      transactionHash: signature.transactionHash,
      signerId: signature.signerId,
      revocationReason: signature.revocationReason,
      remainingSignatures: activeSignatures.length,
      requiredSignatures: wallet.requiredSignatures,
    };

    await this.sendNotificationsToSigners(wallet.signers, notificationData);
  }

  private async notifySignersOfExpiry(
    wallet: MultisigWallet,
    signature: Signature,
    activeSignatures: Signature[],
  ): Promise<void> {
    const notificationData = {
      type: 'signature_expired',
      walletId: wallet.id,
      walletName: wallet.name,
      transactionHash: signature.transactionHash,
      signerId: signature.signerId,
      expiredAt: signature.expiresAt,
      remainingSignatures: activeSignatures.length,
      requiredSignatures: wallet.requiredSignatures,
    };

    await this.sendNotificationsToSigners(wallet.signers, notificationData);
  }

  private async notifyThresholdReached(
    wallet: MultisigWallet,
    transactionHash: string,
    signatures: Signature[],
  ): Promise<void> {
    const notificationData = {
      type: 'threshold_reached',
      walletId: wallet.id,
      walletName: wallet.name,
      transactionHash,
      signerIds: signatures.map((s) => s.signerId),
      signatureCount: signatures.length,
      requiredSignatures: wallet.requiredSignatures,
      canExecute: true,
    };

    await this.sendNotificationsToSigners(wallet.signers, notificationData);
  }

  private async sendNotificationsToSigners(
    signers: string[],
    data: any,
  ): Promise<void> {
    console.log('Sending notifications to signers:', data);
  }

  private async auditLog(data: any): Promise<void> {
    console.log('Audit log:', data);
  }
}
