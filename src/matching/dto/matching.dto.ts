import { IsString, IsNumber, IsEnum, IsOptional, IsArray, IsBoolean, Min, Max, Type } from 'class-validator';

export enum MatchingAlgorithm {
  FIFO = 'FIFO',
  PRO_RATA = 'PRO_RATA',
  TIME_WEIGHTED = 'TIME_WEIGHTED',
  PRICE_TIME_PRIORITY = 'PRICE_TIME_PRIORITY'
}

export class MatchingRequestDto {
  @IsString()
  symbol: string;

  @IsOptional()
  @IsEnum(MatchingAlgorithm)
  algorithm?: MatchingAlgorithm = MatchingAlgorithm.FIFO;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxOrdersPerMatch?: number = 100;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100000)
  timeoutMs?: number = 100;

  @IsOptional()
  @IsBoolean()
  enableLiquidityOptimization?: boolean = true;

  @IsOptional()
  @IsBoolean()
  enableAntiManipulation?: boolean = true;
}

export class MatchingResultDto {
  success: boolean;
  symbol: string;
  algorithm: MatchingAlgorithm;
  processedOrders: number;
  matchedOrders: number;
  totalTrades: number;
  totalVolume: number;
  averagePrice: number;
  processingTimeMs: number;
  trades: Array<{
    id: string;
    buyOrderId: string;
    sellOrderId: string;
    quantity: number;
    price: number;
    totalAmount: number;
    timestamp: number;
  }>;
  unmatchedOrders: Array<{
    orderId: string;
    reason: string;
  }>;
  liquidityMetrics?: {
    fillRate: number;
    marketDepth: number;
    priceImpact: number;
    spread: number;
  };
}

export class OrderBookQueryDto {
  @IsString()
  symbol: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  depth?: number = 20;

  @IsOptional()
  @IsNumber()
  @Min(0.00000001)
  @Type(() => Number)
  minQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.00000001)
  @Type(() => Number)
  maxQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.00000001)
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.00000001)
  @Type(() => Number)
  maxPrice?: number;
}

export class OrderBookResponseDto {
  symbol: string;
  timestamp: number;
  bestBid: number;
  bestAsk: number;
  spread: number;
  midPrice: number;
  totalBuyVolume: number;
  totalSellVolume: number;
  totalOrders: number;
  depth: number;
  buyOrders: Array<{
    price: number;
    quantity: number;
    orderCount: number;
    totalVolume: number;
  }>;
  sellOrders: Array<{
    price: number;
    quantity: number;
    orderCount: number;
    totalVolume: number;
  }>;
}

export class MatchingAnalyticsDto {
  @IsString()
  symbol: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  startTime?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  endTime?: number;

  @IsOptional()
  @IsArray()
  metrics?: string[] = ['fillRate', 'latency', 'throughput', 'priceImpact'];
}

export class MatchingAnalyticsResponseDto {
  symbol: string;
  period: {
    start: number;
    end: number;
    duration: number;
  };
  metrics: {
    fillRate: number;
    averageLatency: number;
    throughput: number;
    priceImpact: number;
    spread: number;
    marketDepth: number;
    volatility: number;
    orderFlow: number;
    matchEfficiency: number;
  };
  performance: {
    ordersProcessed: number;
    tradesGenerated: number;
    totalVolume: number;
    averageTradeSize: number;
    peakThroughput: number;
    latencyPercentiles: {
      p50: number;
      p95: number;
      p99: number;
      p999: number;
    };
  };
  alerts: Array<{
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    timestamp: number;
  }>;
}
