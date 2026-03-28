import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BridgeTransaction } from './entities/bridge-transaction.entity';
import { CreateBridgeTransactionDto, BridgeTransactionResponse, BridgeTransactionStatus } from './dto/bridge.dto';
import { BridgeValidator } from './validators/bridge.validator';
import { TransactionRouter } from './routers/transaction.router';
import { LiquidityManager } from './liquidity/liquidity.manager';

@Injectable()
export class BridgeService {
  private readonly logger = new Logger(BridgeService.name);

  constructor(
    @InjectRepository(BridgeTransaction)
    private readonly bridgeTxRepo: Repository<BridgeTransaction>,
    private readonly validator: BridgeValidator,
    private readonly router: TransactionRouter,
    private readonly liquidity: LiquidityManager,
  ) {}

  async createTransaction(dto: CreateBridgeTransactionDto): Promise<BridgeTransactionResponse> {
    this.validator.validateDto(dto);
    this.validator.validateTransactionSafety(dto);

    const route = this.router.getRoute(dto);
    if (!this.router.estimatePerformance(route)) {
      throw new InternalServerErrorException('Unable to meet cross-chain performance SLA');
    }

    const sourceLiquidity = this.liquidity.getAvailableLiquidity(dto.sourceChain, dto.sourceAsset);
    this.validator.validateLiquidity(sourceLiquidity, dto.amount);

    const fee = route.estimatedFee;
    const totalToDeduct = dto.amount + fee;
    if (!this.liquidity.reserveLiquidity(dto.sourceChain, dto.sourceAsset, totalToDeduct)) {
      throw new InternalServerErrorException('Unable to reserve liquidity after initial check');
    }

    const tx = this.bridgeTxRepo.create({
      transactionId: `bridge_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      sourceChain: dto.sourceChain,
      targetChain: dto.targetChain,
      sourceAsset: dto.sourceAsset,
      targetAsset: dto.targetAsset,
      amount: dto.amount,
      fee,
      status: BridgeTransactionStatus.ROUTING,
      fromAddress: dto.fromAddress,
      toAddress: dto.toAddress,
      memo: dto.memo,
    });

    let saved: BridgeTransaction;
    try {
      saved = await this.bridgeTxRepo.save(tx);
    } catch (error) {
      this.liquidity.releaseLiquidity(dto.sourceChain, dto.sourceAsset, totalToDeduct);
      this.logger.error('Failed to save bridge transaction', error);
      throw new InternalServerErrorException('Failed to persist bridge transaction');
    }

    try {
      // Simulate external cross-chain processing and monitoring in a reliable path.
      saved.status = BridgeTransactionStatus.CONFIRMED;
      saved = await this.bridgeTxRepo.save(saved);
      this.logger.log(`Bridge transaction ${saved.transactionId} confirmed`);
    } catch (processError) {
      this.logger.error('Cross-chain settlement failure', processError);
      saved.status = BridgeTransactionStatus.FAILED;
      saved.errorMessage = processError.message ?? 'Unknown cross-chain settlement failure';
      await this.bridgeTxRepo.save(saved);
      this.liquidity.releaseLiquidity(dto.sourceChain, dto.sourceAsset, totalToDeduct);
      throw new InternalServerErrorException('Cross-chain settlement failed');
    }

    return {
      id: saved.id,
      transactionId: saved.transactionId,
      sourceChain: saved.sourceChain as any,
      targetChain: saved.targetChain as any,
      sourceAsset: saved.sourceAsset,
      targetAsset: saved.targetAsset,
      amount: saved.amount,
      estimatedFee: saved.fee,
      status: saved.status,
      message: 'Cross-chain transaction confirmed',
    };
  }

  async getTransaction(transactionId: string): Promise<BridgeTransaction | null> {
    return this.bridgeTxRepo.findOne({ where: { transactionId } });
  }

  async listTransactions(): Promise<BridgeTransaction[]> {
    return this.bridgeTxRepo.find();
  }
}
