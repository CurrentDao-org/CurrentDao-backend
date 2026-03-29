import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  MultisigWallet,
  WalletStatus,
} from '../entities/multisig-wallet.entity';
import {
  Signature,
  SignatureStatus,
  TransactionType,
} from '../entities/signature.entity';
import { InitiateRecoveryDto } from '../dto/multisig.dto';

export interface RecoveryRequest {
  walletId: string;
  initiatedBy: string;
  reason: string;
  newThreshold?: number;
  newSigners?: string[];
  recoverySignatures: Signature[];
  initiatedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'completed';
}

@Injectable()
export class RecoveryService {
  private readonly logger = new Logger(RecoveryService.name);
  private readonly RECOVERY_EXPIRY_HOURS = 72;
  private readonly SUPER_MAJORITY_THRESHOLD = 0.67;

  constructor(
    @InjectRepository(MultisigWallet)
    private readonly walletRepository: Repository<MultisigWallet>,
    @InjectRepository(Signature)
    private readonly signatureRepository: Repository<Signature>,
    private readonly dataSource: DataSource,
  ) {}

  async initiateRecovery(
    initiateRecoveryDto: InitiateRecoveryDto,
    initiatorId: string,
  ): Promise<RecoveryRequest> {
    const wallet = await this.walletRepository.findOne({
      where: { id: initiateRecoveryDto.walletId },
      relations: ['signatures'],
    });

    if (!wallet) {
      throw new NotFoundException('Multisig wallet not found');
    }

    if (!wallet.signers.includes(initiatorId)) {
      throw new BadRequestException('Initiator is not a signer of this wallet');
    }

    if (wallet.status === WalletStatus.RECOVERY) {
      throw new ConflictException(
        'Recovery is already in progress for this wallet',
      );
    }

    if (wallet.status === WalletStatus.TERMINATED) {
      throw new BadRequestException(
        'Cannot initiate recovery for terminated wallet',
      );
    }

    this.validateRecoveryRequest(wallet, initiateRecoveryDto);

    const recoveryTransactionHash = await this.generateRecoveryTransactionHash(
      wallet.id,
    );
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.RECOVERY_EXPIRY_HOURS);

    await this.dataSource.transaction(async (manager) => {
      wallet.status = WalletStatus.RECOVERY;
      wallet.recoveryInitiatedAt = new Date();
      wallet.recoveryInitiatedBy = initiatorId;

      if (initiateRecoveryDto.newThreshold) {
        wallet.recoveryThreshold = initiateRecoveryDto.newThreshold;
      }

      await manager.save(wallet);

      const recoverySignature = manager.create(Signature, {
        walletId: wallet.id,
        transactionHash: recoveryTransactionHash,
        signerId: initiatorId,
        signature: await this.generateRecoverySignature(
          initiatorId,
          recoveryTransactionHash,
        ),
        status: SignatureStatus.COLLECTED,
        transactionType: TransactionType.EMERGENCY_RECOVERY,
        transactionData: {
          recoveryType: 'initiation',
          reason: initiateRecoveryDto.reason,
          newSigners: initiateRecoveryDto.newSigners,
          newThreshold: initiateRecoveryDto.newThreshold,
        },
        expiresAt,
        signedAt: new Date(),
        auditData: {
          ipAddress: '127.0.0.1',
          userAgent: 'recovery-service',
          deviceId: 'system',
          location: 'system',
        },
      });

      await manager.save(recoverySignature);
    });

    const recoveryRequest = await this.buildRecoveryRequest(
      wallet,
      recoveryTransactionHash,
    );

    await this.notifySignersOfRecoveryInitiation(wallet, recoveryRequest);
    await this.auditRecoveryInitiation(wallet, recoveryRequest, initiatorId);

    this.logger.log(
      `Recovery initiated for wallet ${wallet.id} by ${initiatorId}`,
    );
    return recoveryRequest;
  }

  async signRecovery(
    walletId: string,
    transactionHash: string,
    signerId: string,
  ): Promise<Signature> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });

    if (!wallet || wallet.status !== WalletStatus.RECOVERY) {
      throw new BadRequestException('Wallet is not in recovery mode');
    }

    if (!wallet.signers.includes(signerId)) {
      throw new BadRequestException('Signer is not authorized for this wallet');
    }

    const existingSignature = await this.signatureRepository.findOne({
      where: {
        transactionHash,
        signerId,
        status: SignatureStatus.COLLECTED,
      },
    });

    if (existingSignature) {
      throw new ConflictException('Recovery signature already exists');
    }

    const recoverySignatures = await this.signatureRepository.find({
      where: {
        walletId,
        transactionHash,
        transactionType: TransactionType.EMERGENCY_RECOVERY,
        status: SignatureStatus.COLLECTED,
      },
    });

    const requiredSignatures = Math.ceil(
      wallet.signers.length * this.SUPER_MAJORITY_THRESHOLD,
    );

    if (recoverySignatures.length >= requiredSignatures) {
      throw new BadRequestException(
        'Sufficient recovery signatures already collected',
      );
    }

    const signature = this.signatureRepository.create({
      walletId,
      transactionHash,
      signerId,
      signature: await this.generateRecoverySignature(
        signerId,
        transactionHash,
      ),
      status: SignatureStatus.COLLECTED,
      transactionType: TransactionType.EMERGENCY_RECOVERY,
      transactionData: {
        recoveryType: 'approval',
        walletId,
      },
      expiresAt: new Date(
        wallet.recoveryInitiatedAt.getTime() +
          this.RECOVERY_EXPIRY_HOURS * 60 * 60 * 1000,
      ),
      signedAt: new Date(),
    });

    const savedSignature = await this.signatureRepository.save(signature);

    if (recoverySignatures.length + 1 >= requiredSignatures) {
      await this.executeRecovery(wallet, transactionHash);
    } else {
      await this.notifyRecoveryProgress(
        wallet,
        transactionHash,
        recoverySignatures.length + 1,
        requiredSignatures,
      );
    }

    await this.auditRecoverySignature(wallet, savedSignature);

    this.logger.log(
      `Recovery signature added for wallet ${walletId} by ${signerId}`,
    );
    return savedSignature;
  }

  async getRecoveryStatus(walletId: string): Promise<RecoveryRequest> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Multisig wallet not found');
    }

    if (wallet.status !== WalletStatus.RECOVERY) {
      throw new BadRequestException('Wallet is not in recovery mode');
    }

    const recoverySignatures = await this.signatureRepository.find({
      where: {
        walletId,
        transactionType: TransactionType.EMERGENCY_RECOVERY,
        status: SignatureStatus.COLLECTED,
      },
      order: { signedAt: 'ASC' },
    });

    return await this.buildRecoveryRequest(
      wallet,
      recoverySignatures[0]?.transactionHash,
    );
  }

  async cancelRecovery(
    walletId: string,
    cancellerId: string,
    reason: string,
  ): Promise<void> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Multisig wallet not found');
    }

    if (wallet.status !== WalletStatus.RECOVERY) {
      throw new BadRequestException('Wallet is not in recovery mode');
    }

    if (!wallet.signers.includes(cancellerId)) {
      throw new BadRequestException(
        'Canceller is not authorized for this wallet',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      wallet.status = WalletStatus.ACTIVE;
      wallet.recoveryInitiatedAt = null;
      wallet.recoveryInitiatedBy = null;

      await manager.save(wallet);

      await manager.update(
        Signature,
        {
          walletId,
          transactionType: TransactionType.EMERGENCY_RECOVERY,
          status: SignatureStatus.PENDING,
        },
        {
          status: SignatureStatus.REVOKED,
          revokedAt: new Date(),
          revocationReason: `Recovery cancelled: ${reason}`,
        },
      );
    });

    await this.notifyRecoveryCancellation(wallet, reason);
    await this.auditRecoveryCancellation(wallet, cancellerId, reason);

    this.logger.log(
      `Recovery cancelled for wallet ${walletId} by ${cancellerId}`,
    );
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredRecoveries(): Promise<void> {
    const expiredRecoveryWallets = await this.walletRepository.find({
      where: {
        status: WalletStatus.RECOVERY,
        recoveryInitiatedAt: new Date(
          Date.now() - this.RECOVERY_EXPIRY_HOURS * 60 * 60 * 1000,
        ),
      },
    });

    for (const wallet of expiredRecoveryWallets) {
      await this.expireRecovery(wallet);
    }

    if (expiredRecoveryWallets.length > 0) {
      this.logger.log(
        `Cleaned up ${expiredRecoveryWallets.length} expired recovery processes`,
      );
    }
  }

  private async executeRecovery(
    wallet: MultisigWallet,
    transactionHash: string,
  ): Promise<void> {
    try {
      const recoverySignatures = await this.signatureRepository.find({
        where: {
          walletId: wallet.id,
          transactionHash,
          transactionType: TransactionType.EMERGENCY_RECOVERY,
          status: SignatureStatus.COLLECTED,
        },
      });

      const initiationSignature = recoverySignatures.find(
        (s) => s.transactionData?.recoveryType === 'initiation',
      );

      const newSigners =
        initiationSignature?.transactionData?.newSigners || wallet.signers;
      const newThreshold =
        initiationSignature?.transactionData?.newThreshold || wallet.threshold;

      await this.updateMultisigAccount(
        wallet.address,
        newSigners,
        newThreshold,
        recoverySignatures.map((s) => s.signature),
      );

      await this.dataSource.transaction(async (manager) => {
        wallet.signers = newSigners;
        wallet.threshold = newThreshold;
        wallet.status = WalletStatus.ACTIVE;
        wallet.recoveryInitiatedAt = null;
        wallet.recoveryInitiatedBy = null;

        await manager.save(wallet);

        await manager.update(
          Signature,
          {
            walletId: wallet.id,
            transactionHash,
          },
          {
            status: SignatureStatus.EXECUTED,
            executedAt: new Date(),
          },
        );
      });

      await this.notifyRecoveryCompletion(wallet, newSigners, newThreshold);
      await this.auditRecoveryCompletion(wallet, recoverySignatures);

      this.logger.log(`Recovery completed for wallet ${wallet.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to execute recovery for wallet ${wallet.id}:`,
        error,
      );
      throw new BadRequestException('Recovery execution failed');
    }
  }

  private async expireRecovery(wallet: MultisigWallet): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      wallet.status = WalletStatus.ACTIVE;
      wallet.recoveryInitiatedAt = null;
      wallet.recoveryInitiatedBy = null;

      await manager.save(wallet);

      await manager.update(
        Signature,
        {
          walletId: wallet.id,
          transactionType: TransactionType.EMERGENCY_RECOVERY,
          status: SignatureStatus.PENDING,
        },
        {
          status: SignatureStatus.EXPIRED,
        },
      );
    });

    await this.notifyRecoveryExpiry(wallet);
    await this.auditRecoveryExpiry(wallet);

    this.logger.log(`Recovery expired for wallet ${wallet.id}`);
  }

  private async buildRecoveryRequest(
    wallet: MultisigWallet,
    transactionHash?: string,
  ): Promise<RecoveryRequest> {
    const recoverySignatures = await this.signatureRepository.find({
      where: {
        walletId: wallet.id,
        transactionType: TransactionType.EMERGENCY_RECOVERY,
        ...(transactionHash && { transactionHash }),
      },
      order: { signedAt: 'ASC' },
    });

    const initiationSignature = recoverySignatures.find(
      (s) => s.transactionData?.recoveryType === 'initiation',
    );

    const requiredSignatures = Math.ceil(
      wallet.signers.length * this.SUPER_MAJORITY_THRESHOLD,
    );
    const isApproved = recoverySignatures.length >= requiredSignatures;

    let status: RecoveryRequest['status'] = 'pending';
    if (
      wallet.status === WalletStatus.ACTIVE &&
      recoverySignatures.length > 0
    ) {
      status = 'completed';
    } else if (isApproved) {
      status = 'approved';
    } else if (initiationSignature?.isExpired) {
      status = 'expired';
    }

    return {
      walletId: wallet.id,
      initiatedBy: wallet.recoveryInitiatedBy || '',
      reason: initiationSignature?.transactionData?.reason || '',
      newThreshold: initiationSignature?.transactionData?.newThreshold,
      newSigners: initiationSignature?.transactionData?.newSigners,
      recoverySignatures,
      initiatedAt: wallet.recoveryInitiatedAt || new Date(),
      expiresAt: wallet.recoveryInitiatedAt
        ? new Date(
            wallet.recoveryInitiatedAt.getTime() +
              this.RECOVERY_EXPIRY_HOURS * 60 * 60 * 1000,
          )
        : new Date(),
      status,
    };
  }

  private validateRecoveryRequest(
    wallet: MultisigWallet,
    dto: InitiateRecoveryDto,
  ): void {
    if (
      dto.newSigners &&
      (dto.newSigners.length < 2 || dto.newSigners.length > 15)
    ) {
      throw new BadRequestException(
        'New signers count must be between 2 and 15',
      );
    }

    if (dto.newThreshold && dto.newSigners) {
      if (dto.newThreshold < 2 || dto.newThreshold > dto.newSigners.length) {
        throw new BadRequestException(
          'New threshold must be between 2 and new signers count',
        );
      }
    }

    if (dto.newSigners) {
      const uniqueSigners = new Set(dto.newSigners);
      if (uniqueSigners.size !== dto.newSigners.length) {
        throw new BadRequestException('New signers must be unique');
      }
    }

    const superMajorityRequired = Math.ceil(
      wallet.signers.length * this.SUPER_MAJORITY_THRESHOLD,
    );
    if (wallet.signers.length < superMajorityRequired) {
      throw new BadRequestException(
        'Insufficient signers for super-majority recovery',
      );
    }
  }

  private async generateRecoveryTransactionHash(
    walletId: string,
  ): Promise<string> {
    return `recovery_${walletId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async generateRecoverySignature(
    signerId: string,
    transactionHash: string,
  ): Promise<string> {
    return `recovery_sig_${signerId}_${transactionHash}_${Date.now()}`;
  }

  private async auditRecoveryExpiry(wallet: MultisigWallet): Promise<void> {
    console.log(`Recovery expired for wallet ${wallet.id}`);
  }

  private async notifySignersOfRecoveryInitiation(
    wallet: MultisigWallet,
    recoveryRequest: RecoveryRequest,
  ): Promise<void> {
    console.log(
      `Notifying signers of recovery initiation for wallet ${wallet.id}`,
    );
  }

  private async notifyRecoveryProgress(
    wallet: MultisigWallet,
    transactionHash: string,
    collected: number,
    required: number,
  ): Promise<void> {
    console.log(
      `Notifying recovery progress: ${collected}/${required} for wallet ${wallet.id}`,
    );
  }

  private async notifyRecoveryCompletion(
    wallet: MultisigWallet,
    newSigners: string[],
    newThreshold: number,
  ): Promise<void> {
    console.log(`Notifying recovery completion for wallet ${wallet.id}`);
  }

  private async notifyRecoveryCancellation(
    wallet: MultisigWallet,
    reason: string,
  ): Promise<void> {
    console.log(
      `Notifying recovery cancellation for wallet ${wallet.id}: ${reason}`,
    );
  }

  private async updateMultisigAccount(
    walletAddress: string,
    newSigners: string[],
    newThreshold: number,
    signatures: string[],
  ): Promise<void> {
    // Placeholder for Stellar account update
    console.log(
      `Updating multisig account ${walletAddress} with ${newSigners.length} signers and threshold ${newThreshold}`,
    );
  }

  private async auditRecoveryInitiation(
    wallet: MultisigWallet,
    recoveryRequest: RecoveryRequest,
    initiatorId: string,
  ): Promise<void> {
    console.log(`Recovery initiated for wallet ${wallet.id} by ${initiatorId}`);
  }

  private async auditRecoverySignature(
    wallet: MultisigWallet,
    signature: Signature,
  ): Promise<void> {
    console.log(
      `Recovery signature added for wallet ${wallet.id} by ${signature.signerId}`,
    );
  }

  private async auditRecoveryCompletion(
    wallet: MultisigWallet,
    signatures: Signature[],
  ): Promise<void> {
    console.log(
      `Recovery completed for wallet ${wallet.id} with ${signatures.length} signatures`,
    );
  }

  private async auditRecoveryCancellation(
    wallet: MultisigWallet,
    cancellerId: string,
    reason: string,
  ): Promise<void> {
    console.log(
      `Recovery cancelled for wallet ${wallet.id} by ${cancellerId}: ${reason}`,
    );
  }
}
