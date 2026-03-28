import { Injectable, Logger } from '@nestjs/common';
import { CreateBridgeTransactionDto, SupportedChain } from '../dto/bridge.dto';

export interface TransactionRoute {
  path: SupportedChain[];
  estimatedFee: number;
  estimatedDurationSec: number;
}

@Injectable()
export class TransactionRouter {
  private readonly logger = new Logger(TransactionRouter.name);

  getRoute(dto: CreateBridgeTransactionDto): TransactionRoute {
    this.logger.log(`Routing bridge tx from ${dto.sourceChain} to ${dto.targetChain}`);

    const directRoute: TransactionRoute = {
      path: [dto.sourceChain, dto.targetChain],
      estimatedFee: this.calculateFee(dto.amount, 0.25),
      estimatedDurationSec: 15,
    };

    if (dto.sourceChain === 'stellar' && dto.targetChain === 'ethereum') {
      const crossRoute = {
        path: ['stellar', 'polygon', 'ethereum'] as SupportedChain[],
        estimatedFee: this.calculateFee(dto.amount, 0.18),
        estimatedDurationSec: 25,
      };
      return crossRoute;
    }

    if (dto.sourceChain === 'polygon' && dto.targetChain === 'stellar') {
      const crossRoute = {
        path: ['polygon', 'ethereum', 'stellar'] as SupportedChain[],
        estimatedFee: this.calculateFee(dto.amount, 0.2),
        estimatedDurationSec: 28,
      };
      return crossRoute;
    }

    return directRoute;
  }

  calculateFee(amount: number, feePercent: number): number {
    return parseFloat((amount * feePercent / 100).toFixed(12));
  }

  estimatePerformance(route: TransactionRoute): boolean {
    return route.estimatedDurationSec <= 30;
  }
}
