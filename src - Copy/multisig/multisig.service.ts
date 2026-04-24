import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, MoreThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  MultisigWallet,
  WalletStatus,
} from './entities/multisig-wallet.entity';
import {
  Signature,
  SignatureStatus,
  TransactionType,
} from './entities/signature.entity';
import {
  CreateMultisigWalletDto,
  SignTransactionDto,
  RevokeSignatureDto,
  ExecuteTransactionDto,
  MultisigQueryDto,
} from './dto/multisig.dto';
import { SignatureCollectionWorkflow } from './workflows/signature-collection.workflow';
import { RecoveryService } from './recovery/recovery.service';

@Injectable()
export class MultisigService {
  private readonly logger = new Logger(MultisigService.name);
  private readonly SIGNATURE_EXPIRY_HOURS = 24;

  constructor(
    @InjectRepository(MultisigWallet)
    private readonly walletRepository: Repository<MultisigWallet>,
    @InjectRepository(Signature)
    private readonly signatureRepository: Repository<Signature>,
    private readonly signatureCollectionWorkflow: SignatureCollectionWorkflow,
    private readonly recoveryService: RecoveryService,
    private readonly dataSource: DataSource,
  ) {}

  async createWallet(
    createWalletDto: CreateMultisigWalletDto,
    creatorId: string,
  ): Promise<MultisigWallet> {
    this.validateWalletCreation(createWalletDto);

    const walletAddress = await this.generateMultisigAddress(
      createWalletDto.signers,
      createWalletDto.threshold,
    );

    const wallet = this.walletRepository.create({
      ...createWalletDto,
      address: walletAddress,
      creatorId,
      recoveryThreshold:
        createWalletDto.recoveryThreshold ||
        Math.ceil(createWalletDto.threshold * 1.5),
    });

    const savedWallet = await this.walletRepository.save(wallet);

    this.logger.log(
      `Created multisig wallet ${savedWallet.id} with address ${savedWallet.address}`,
    );
    return savedWallet;
  }

  async getWallet(walletId: string): Promise<MultisigWallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
      relations: ['signatures'],
    });

    if (!wallet) {
      throw new NotFoundException('Multisig wallet not found');
    }

    return wallet;
  }

  async getWalletByAddress(address: string): Promise<MultisigWallet> {
    const wallet = await this.walletRepository.findOne({
      where: { address },
      relations: ['signatures'],
    });

    if (!wallet) {
      throw new NotFoundException('Multisig wallet not found');
    }

    return wallet;
  }

  async signTransaction(
    signTransactionDto: SignTransactionDto,
    signerId: string,
  ): Promise<Signature> {
    const wallet = await this.getWalletByAddress(
      signTransactionDto.transactionData.walletAddress,
    );

    if (!wallet.signers.includes(signerId)) {
      throw new BadRequestException('Signer is not authorized for this wallet');
    }

    if (
      wallet.status === WalletStatus.LOCKED ||
      wallet.status === WalletStatus.TERMINATED
    ) {
      throw new BadRequestException('Wallet is not available for transactions');
    }

    const existingSignature = await this.signatureRepository.findOne({
      where: {
        transactionHash: signTransactionDto.transactionHash,
        signerId,
        status: SignatureStatus.PENDING,
      },
    });

    if (existingSignature) {
      throw new ConflictException(
        'Signature already exists for this transaction',
      );
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.SIGNATURE_EXPIRY_HOURS);

    const signature = this.signatureRepository.create({
      ...signTransactionDto,
      walletId: wallet.id,
      signerId,
      expiresAt,
      signedAt: new Date(),
    });

    const savedSignature = await this.signatureRepository.save(signature);

    await this.signatureCollectionWorkflow.processSignature(
      wallet,
      savedSignature,
    );

    this.logger.log(
      `Signature collected for transaction ${signTransactionDto.transactionHash} by signer ${signerId}`,
    );
    return savedSignature;
  }

  async revokeSignature(
    revokeDto: RevokeSignatureDto,
    signerId: string,
  ): Promise<Signature> {
    const signature = await this.signatureRepository.findOne({
      where: {
        transactionHash: revokeDto.transactionHash,
        signerId,
        status: SignatureStatus.PENDING,
      },
      relations: ['wallet'],
    });

    if (!signature) {
      throw new NotFoundException('Pending signature not found');
    }

    if (!signature.canRevoke) {
      throw new BadRequestException('Signature cannot be revoked');
    }

    signature.status = SignatureStatus.REVOKED;
    signature.revokedAt = new Date();
    signature.revocationReason = revokeDto.reason;

    const revokedSignature = await this.signatureRepository.save(signature);

    await this.signatureCollectionWorkflow.processRevocation(
      signature.wallet,
      revokedSignature,
    );

    this.logger.log(
      `Signature revoked for transaction ${revokeDto.transactionHash} by signer ${signerId}`,
    );
    return revokedSignature;
  }

  async executeTransaction(
    executeDto: ExecuteTransactionDto,
    executorId: string,
  ): Promise<Signature> {
    const signatures = await this.signatureRepository.find({
      where: {
        transactionHash: executeDto.transactionHash,
        status: SignatureStatus.COLLECTED,
      },
      relations: ['wallet'],
    });

    if (signatures.length === 0) {
      throw new NotFoundException(
        'No collected signatures found for this transaction',
      );
    }

    const wallet = signatures[0].wallet;

    if (!wallet.signers.includes(executorId)) {
      throw new BadRequestException(
        'Executor is not authorized for this wallet',
      );
    }

    const requiredSignatures = wallet.requiredSignatures;
    if (signatures.length < requiredSignatures) {
      throw new BadRequestException(
        `Insufficient signatures. Required: ${requiredSignatures}, Collected: ${signatures.length}`,
      );
    }

    try {
      const executionResult = await this.executeMultisigTransaction(
        wallet.address,
        executeDto.transactionHash,
        signatures.map((s) => s.signature),
        executeDto.executionData,
      );

      const updatedSignatures = await Promise.all(
        signatures.map(async (signature) => {
          signature.status = SignatureStatus.EXECUTED;
          signature.executedAt = new Date();
          signature.executionTxHash = executionResult.transactionHash;
          return this.signatureRepository.save(signature);
        }),
      );

      wallet.lastTransactionAt = new Date();
      wallet.transactionCount += 1;
      wallet.nonce += 1;
      await this.walletRepository.save(wallet);

      this.logger.log(
        `Transaction ${executeDto.transactionHash} executed successfully`,
      );
      return updatedSignatures[0];
    } catch (error) {
      this.logger.error(
        `Failed to execute transaction ${executeDto.transactionHash}:`,
        error,
      );
      throw new BadRequestException('Transaction execution failed');
    }
  }

  async getTransactionStatus(transactionHash: string): Promise<any> {
    const signatures = await this.signatureRepository.find({
      where: { transactionHash },
      relations: ['wallet'],
    });

    if (signatures.length === 0) {
      throw new NotFoundException('Transaction not found');
    }

    const wallet = signatures[0].wallet;
    const validSignatures = signatures.filter((s) => s.isValid);
    const collectedSignatures = signatures.filter(
      (s) => s.status === SignatureStatus.COLLECTED,
    );
    const executedSignatures = signatures.filter(
      (s) => s.status === SignatureStatus.EXECUTED,
    );

    let status: 'pending' | 'ready' | 'executed' | 'expired' | 'failed' =
      'pending';

    if (executedSignatures.length > 0) {
      status = 'executed';
    } else if (
      validSignatures.length === 0 &&
      signatures.some((s) => s.isExpired)
    ) {
      status = 'expired';
    } else if (wallet.canExecute(collectedSignatures.length)) {
      status = 'ready';
    }

    return {
      transactionHash,
      walletId: wallet.id,
      totalSigners: wallet.signers.length,
      requiredSignatures: wallet.requiredSignatures,
      collectedSignatures: collectedSignatures.length,
      signatures: signatures,
      status,
      canExecute: wallet.canExecute(collectedSignatures.length),
      timeToExpiry: Math.max(...signatures.map((s) => s.timeToExpiry)),
    };
  }

  async queryMultisigData(
    queryDto: MultisigQueryDto,
  ): Promise<{ wallets: MultisigWallet[]; signatures: Signature[] }> {
    const walletQuery = this.walletRepository
      .createQueryBuilder('wallet')
      .leftJoinAndSelect('wallet.signatures', 'signature');

    if (queryDto.walletId) {
      walletQuery.andWhere('wallet.id = :walletId', {
        walletId: queryDto.walletId,
      });
    }

    if (queryDto.status) {
      walletQuery.andWhere('wallet.status = :status', {
        status: queryDto.status,
      });
    }

    if (queryDto.signerId) {
      walletQuery.andWhere('JSON_CONTAINS(wallet.signers, :signerId)', {
        signerId: `"${queryDto.signerId}"`,
      });
    }

    const wallets = await walletQuery
      .limit(queryDto.limit)
      .offset(queryDto.offset)
      .getMany();

    const signatureQuery = this.signatureRepository
      .createQueryBuilder('signature')
      .leftJoinAndSelect('signature.wallet', 'wallet');

    if (queryDto.walletId) {
      signatureQuery.andWhere('signature.walletId = :walletId', {
        walletId: queryDto.walletId,
      });
    }

    if (queryDto.transactionType) {
      signatureQuery.andWhere('signature.transactionType = :transactionType', {
        transactionType: queryDto.transactionType,
      });
    }

    if (queryDto.signatureStatus) {
      signatureQuery.andWhere('signature.status = :signatureStatus', {
        signatureStatus: queryDto.signatureStatus,
      });
    }

    if (queryDto.fromDate) {
      signatureQuery.andWhere('signature.createdAt >= :fromDate', {
        fromDate: new Date(queryDto.fromDate),
      });
    }

    if (queryDto.toDate) {
      signatureQuery.andWhere('signature.createdAt <= :toDate', {
        toDate: new Date(queryDto.toDate),
      });
    }

    const signatures = await signatureQuery
      .limit(queryDto.limit)
      .offset(queryDto.offset)
      .getMany();

    return { wallets, signatures };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSignatures(): Promise<void> {
    const expiredSignatures = await this.signatureRepository.find({
      where: {
        status: SignatureStatus.PENDING,
        expiresAt: LessThan(new Date()),
      },
      relations: ['wallet'],
    });

    for (const signature of expiredSignatures) {
      signature.status = SignatureStatus.EXPIRED;
      await this.signatureRepository.save(signature);
      await this.signatureCollectionWorkflow.processExpiry(
        signature.wallet,
        signature,
      );
    }

    if (expiredSignatures.length > 0) {
      this.logger.log(
        `Cleaned up ${expiredSignatures.length} expired signatures`,
      );
    }
  }

  private validateWalletCreation(
    createWalletDto: CreateMultisigWalletDto,
  ): void {
    if (
      createWalletDto.signers.length < 2 ||
      createWalletDto.signers.length > 15
    ) {
      throw new BadRequestException(
        'Number of signers must be between 2 and 15',
      );
    }

    if (
      createWalletDto.threshold < 2 ||
      createWalletDto.threshold > createWalletDto.signers.length
    ) {
      throw new BadRequestException(
        'Threshold must be between 2 and the number of signers',
      );
    }

    if (createWalletDto.recoveryThreshold) {
      if (
        createWalletDto.recoveryThreshold < createWalletDto.threshold ||
        createWalletDto.recoveryThreshold > createWalletDto.signers.length
      ) {
        throw new BadRequestException(
          'Recovery threshold must be between normal threshold and number of signers',
        );
      }
    }

    const uniqueSigners = new Set(createWalletDto.signers);
    if (uniqueSigners.size !== createWalletDto.signers.length) {
      throw new BadRequestException('Signers must be unique');
    }
  }

  private async generateMultisigAddress(
    signers: string[],
    threshold: number,
  ): Promise<string> {
    return `multisig_${signers.join('_')}_${threshold}_${Date.now()}`;
  }

  private async executeMultisigTransaction(
    walletAddress: string,
    transactionHash: string,
    signatures: string[],
    executionData?: Record<string, any>,
  ): Promise<{ transactionHash: string }> {
    return { transactionHash: `exec_${transactionHash}_${Date.now()}` };
  }
}
