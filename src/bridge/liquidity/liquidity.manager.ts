import { Injectable, Logger } from '@nestjs/common';

export interface LiquidityPoolEntry {
  chain: string;
  asset: string;
  amount: number;
}

@Injectable()
export class LiquidityManager {
  private readonly logger = new Logger(LiquidityManager.name);
  private readonly pools: LiquidityPoolEntry[] = [
    { chain: 'stellar', asset: 'XLM', amount: 500_000 },
    { chain: 'ethereum', asset: 'ETH', amount: 300_000 },
    { chain: 'polygon', asset: 'MATIC', amount: 300_000 },
    { chain: 'ethereum', asset: 'USDC', amount: 10_000_000 },
    { chain: 'polygon', asset: 'USDC', amount: 10_000_000 },
  ];

  getAvailableLiquidity(chain: string, asset: string): number {
    const pool = this.pools.find((p) => p.chain === chain && p.asset === asset);
    return pool?.amount ?? 0;
  }

  reserveLiquidity(chain: string, asset: string, amount: number): boolean {
    const pool = this.pools.find((p) => p.chain === chain && p.asset === asset);
    if (!pool || pool.amount < amount) {
      this.logger.warn(`Liquidity reserve failed for ${chain}:${asset} ${amount}`);
      return false;
    }

    pool.amount -= amount;
    this.logger.log(`Reserved ${amount} ${asset} on ${chain}, remaining ${pool.amount}`);
    return true;
  }

  releaseLiquidity(chain: string, asset: string, amount: number): void {
    const pool = this.pools.find((p) => p.chain === chain && p.asset === asset);
    if (!pool) {
      this.pools.push({ chain, asset, amount });
      return;
    }
    pool.amount += amount;
  }

  getPools(): LiquidityPoolEntry[] {
    return [...this.pools];
  }
}
