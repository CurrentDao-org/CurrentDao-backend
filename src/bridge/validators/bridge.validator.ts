import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateBridgeTransactionDto, SUPPORTED_CHAINS } from '../dto/bridge.dto';

@Injectable()
export class BridgeValidator {
  validateChainSupported(chain: string): void {
    if (!SUPPORTED_CHAINS.includes(chain as any)) {
      throw new BadRequestException(`Unsupported chain: ${chain}`);
    }
  }

  validateDto(dto: CreateBridgeTransactionDto): void {
    this.validateChainSupported(dto.sourceChain);
    this.validateChainSupported(dto.targetChain);

    if (dto.sourceChain === dto.targetChain) {
      throw new BadRequestException('Source and target chain must be different');
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    // Basic anti-fraud options
    if (!dto.fromAddress || !dto.toAddress) {
      throw new BadRequestException('From and To addresses are required');
    }

    if (dto.amount > 10_000_000) {
      throw new BadRequestException('Amount exceeds maximum allowed bridge size');
    }
  }

  validateLiquidity(availableLiquidity: number, requestedAmount: number): void {
    if (availableLiquidity < requestedAmount) {
      throw new BadRequestException('Insufficient liquidity for requested cross-chain transaction');
    }
  }

  validateTransactionSafety(payload: CreateBridgeTransactionDto): boolean {
    if (payload.memo && payload.memo.length > 1024) {
      throw new BadRequestException('Memo too long');
    }
    return true;
  }
}
