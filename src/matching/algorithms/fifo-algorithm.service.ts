import { Injectable, Logger } from '@nestjs/common';
import { Order, OrderType, OrderStatus } from '../entities/order.entity';
import { Trade } from '../entities/trade.entity';
import { MatchingAlgorithm } from '../dto/matching.dto';

export interface MatchingResult {
  trades: Trade[];
  updatedOrders: Order[];
  unmatchedOrders: Order[];
  processingTime: number;
}

@Injectable()
export class FifoAlgorithmService {
  private readonly logger = new Logger(FifoAlgorithmService.name);

  async matchOrders(
    buyOrders: Order[],
    sellOrders: Order[],
    symbol: string,
    maxOrdersPerMatch: number = 100,
    timeoutMs: number = 100
  ): Promise<MatchingResult> {
    const startTime = performance.now();
    const trades: Trade[] = [];
    const updatedOrders: Order[] = [];
    const unmatchedOrders: Order[] = [];

    // Sort orders by price priority and timestamp (FIFO)
    const sortedBuyOrders = buyOrders
      .filter(order => order.status === OrderStatus.PENDING && order.type === OrderType.BUY)
      .sort((a, b) => {
        // Higher price first for buy orders
        if (b.price !== a.price) return b.price - a.price;
        // Earlier timestamp first (FIFO)
        return a.timestamp - b.timestamp;
      });

    const sortedSellOrders = sellOrders
      .filter(order => order.status === OrderStatus.PENDING && order.type === OrderType.SELL)
      .sort((a, b) => {
        // Lower price first for sell orders
        if (a.price !== b.price) return a.price - b.price;
        // Earlier timestamp first (FIFO)
        return a.timestamp - b.timestamp;
      });

    let buyIndex = 0;
    let sellIndex = 0;
    let processedOrders = 0;

    while (buyIndex < sortedBuyOrders.length && 
           sellIndex < sortedSellOrders.length && 
           processedOrders < maxOrdersPerMatch &&
           (performance.now() - startTime) < timeoutMs) {
      
      const buyOrder = sortedBuyOrders[buyIndex];
      const sellOrder = sortedSellOrders[sellIndex];

      // Check if orders can match
      if (buyOrder.price >= sellOrder.price) {
        const matchPrice = sellOrder.price; // Use sell order price (taker takes maker price)
        const matchQuantity = Math.min(
          buyOrder.remainingQuantity,
          sellOrder.remainingQuantity
        );

        // Create trade
        const trade = this.createTrade(
          buyOrder,
          sellOrder,
          matchQuantity,
          matchPrice,
          symbol
        );
        trades.push(trade);

        // Update buy order
        buyOrder.filledQuantity += matchQuantity;
        buyOrder.remainingQuantity -= matchQuantity;
        if (buyOrder.remainingQuantity <= 0) {
          buyOrder.status = OrderStatus.FILLED;
          buyIndex++;
        } else {
          buyOrder.status = OrderStatus.PARTIALLY_FILLED;
        }
        updatedOrders.push(buyOrder);

        // Update sell order
        sellOrder.filledQuantity += matchQuantity;
        sellOrder.remainingQuantity -= matchQuantity;
        if (sellOrder.remainingQuantity <= 0) {
          sellOrder.status = OrderStatus.FILLED;
          sellIndex++;
        } else {
          sellOrder.status = OrderStatus.PARTIALLY_FILLED;
        }
        updatedOrders.push(sellOrder);

        processedOrders++;
      } else {
        // No match possible, move to next order
        if (buyOrder.price < sellOrder.price) {
          // Buy order price too low, move to next buy order
          unmatchedOrders.push(buyOrder);
          buyIndex++;
        } else {
          // Sell order price too high, move to next sell order
          unmatchedOrders.push(sellOrder);
          sellIndex++;
        }
      }
    }

    // Add remaining unmatched orders
    while (buyIndex < sortedBuyOrders.length) {
      unmatchedOrders.push(sortedBuyOrders[buyIndex]);
      buyIndex++;
    }
    while (sellIndex < sortedSellOrders.length) {
      unmatchedOrders.push(sortedSellOrders[sellIndex]);
      sellIndex++;
    }

    const processingTime = performance.now() - startTime;

    this.logger.log(
      `FIFO matching completed for ${symbol}: ${trades.length} trades, ` +
      `${updatedOrders.length} updated orders, ${processingTime.toFixed(2)}ms`
    );

    return {
      trades,
      updatedOrders,
      unmatchedOrders,
      processingTime
    };
  }

  private createTrade(
    buyOrder: Order,
    sellOrder: Order,
    quantity: number,
    price: number,
    symbol: string
  ): Trade {
    const trade = new Trade();
    trade.id = this.generateTradeId();
    trade.symbol = symbol;
    trade.buyOrderId = buyOrder.id;
    trade.sellOrderId = sellOrder.id;
    trade.makerOrderId = sellOrder.id; // Sell order is maker (price priority)
    trade.takerOrderId = buyOrder.id;  // Buy order is taker
    trade.quantity = quantity;
    trade.price = price;
    trade.totalAmount = quantity * price;
    trade.tradeType = buyOrder.type === OrderType.BUY ? TradeType.BUY : TradeType.SELL;
    trade.timestamp = Date.now();
    trade.makerFee = this.calculateFee(quantity * price, 0.001); // 0.1% maker fee
    trade.takerFee = this.calculateFee(quantity * price, 0.002); // 0.2% taker fee
    trade.metadata = {
      algorithm: MatchingAlgorithm.FIFO,
      buyOrderTimestamp: buyOrder.timestamp,
      sellOrderTimestamp: sellOrder.timestamp,
      priceImprovement: Math.max(0, buyOrder.price - sellOrder.price)
    };

    return trade;
  }

  private generateTradeId(): string {
    return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateFee(amount: number, rate: number): number {
    return amount * rate;
  }

  getAlgorithmType(): MatchingAlgorithm {
    return MatchingAlgorithm.FIFO;
  }

  calculateLiquidityMetrics(
    trades: Trade[],
    buyOrders: Order[],
    sellOrders: Order[]
  ): {
    fillRate: number;
    marketDepth: number;
    priceImpact: number;
    spread: number;
  } {
    const totalOrders = buyOrders.length + sellOrders.length;
    const filledOrders = trades.length * 2; // Each trade fills 2 orders
    const fillRate = totalOrders > 0 ? (filledOrders / totalOrders) * 100 : 0;

    const totalBuyVolume = buyOrders.reduce((sum, order) => sum + order.quantity, 0);
    const totalSellVolume = sellOrders.reduce((sum, order) => sum + order.quantity, 0);
    const marketDepth = (totalBuyVolume + totalSellVolume) / 2;

    const avgTradePrice = trades.length > 0 
      ? trades.reduce((sum, trade) => sum + trade.price, 0) / trades.length 
      : 0;
    
    const bestBid = buyOrders.length > 0 ? Math.max(...buyOrders.map(o => o.price)) : 0;
    const bestAsk = sellOrders.length > 0 ? Math.min(...sellOrders.map(o => o.price)) : 0;
    const midPrice = (bestBid + bestAsk) / 2;
    
    const priceImpact = midPrice > 0 ? Math.abs(avgTradePrice - midPrice) / midPrice * 100 : 0;
    const spread = bestAsk > 0 && bestBid > 0 ? ((bestAsk - bestBid) / bestBid) * 100 : 0;

    return {
      fillRate,
      marketDepth,
      priceImpact,
      spread
    };
  }
}
