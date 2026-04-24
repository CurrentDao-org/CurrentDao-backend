import { Injectable, Logger } from '@nestjs/common';
import { Order, OrderType, OrderStatus } from '../entities/order.entity';
import { Trade, TradeType } from '../entities/trade.entity';
import { MatchingAlgorithm } from '../dto/matching.dto';

export interface MatchingResult {
  trades: Trade[];
  updatedOrders: Order[];
  unmatchedOrders: Order[];
  processingTime: number;
}

@Injectable()
export class ProRataAlgorithmService {
  private readonly logger = new Logger(ProRataAlgorithmService.name);

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

    // Group orders by price level
    const buyOrdersByPrice = this.groupOrdersByPrice(
      buyOrders.filter(order => order.status === OrderStatus.PENDING && order.type === OrderType.BUY)
    );
    
    const sellOrdersByPrice = this.groupOrdersByPrice(
      sellOrders.filter(order => order.status === OrderStatus.PENDING && order.type === OrderType.SELL)
    );

    // Sort price levels
    const sortedBuyPrices = Object.keys(buyOrdersByPrice)
      .map(Number)
      .sort((a, b) => b - a); // Higher prices first
    
    const sortedSellPrices = Object.keys(sellOrdersByPrice)
      .map(Number)
      .sort((a, b) => a - b); // Lower prices first

    let processedOrders = 0;
    let buyPriceIndex = 0;
    let sellPriceIndex = 0;

    while (buyPriceIndex < sortedBuyPrices.length && 
           sellPriceIndex < sortedSellPrices.length && 
           processedOrders < maxOrdersPerMatch &&
           (performance.now() - startTime) < timeoutMs) {
      
      const buyPrice = sortedBuyPrices[buyPriceIndex];
      const sellPrice = sortedSellPrices[sellPriceIndex];

      if (buyPrice >= sellPrice) {
        // Match at this price level
        const matchPrice = sellPrice;
        const buyOrdersAtPrice = buyOrdersByPrice[buyPrice];
        const sellOrdersAtPrice = sellOrdersByPrice[sellPrice];

        const totalBuyVolume = buyOrdersAtPrice.reduce((sum, order) => sum + order.remainingQuantity, 0);
        const totalSellVolume = sellOrdersAtPrice.reduce((sum, order) => sum + order.remainingQuantity, 0);
        const matchVolume = Math.min(totalBuyVolume, totalSellVolume);

        if (matchVolume > 0) {
          // Execute pro-rata matching
          const proRataTrades = this.executeProRataMatching(
            buyOrdersAtPrice,
            sellOrdersAtPrice,
            matchVolume,
            matchPrice,
            symbol
          );

          trades.push(...proRataTrades);
          
          // Update orders
          proRataTrades.forEach(trade => {
            const buyOrder = buyOrdersAtPrice.find(o => o.id === trade.buyOrderId);
            const sellOrder = sellOrdersAtPrice.find(o => o.id === trade.sellOrderId);
            
            if (buyOrder) {
              buyOrder.filledQuantity += trade.quantity;
              buyOrder.remainingQuantity -= trade.quantity;
              buyOrder.status = buyOrder.remainingQuantity <= 0 ? OrderStatus.FILLED : OrderStatus.PARTIALLY_FILLED;
              updatedOrders.push(buyOrder);
            }
            
            if (sellOrder) {
              sellOrder.filledQuantity += trade.quantity;
              sellOrder.remainingQuantity -= trade.quantity;
              sellOrder.status = sellOrder.remainingQuantity <= 0 ? OrderStatus.FILLED : OrderStatus.PARTIALLY_FILLED;
              updatedOrders.push(sellOrder);
            }
          });

          processedOrders += proRataTrades.length;
        }

        // Remove fully filled orders from price levels
        buyOrdersByPrice[buyPrice] = buyOrdersAtPrice.filter(order => order.remainingQuantity > 0);
        sellOrdersByPrice[sellPrice] = sellOrdersAtPrice.filter(order => order.remainingQuantity > 0);

        // Move to next price level if empty
        if (buyOrdersByPrice[buyPrice].length === 0) {
          buyPriceIndex++;
        }
        if (sellOrdersByPrice[sellPrice].length === 0) {
          sellPriceIndex++;
        }
      } else {
        // No match possible, move to next level
        if (buyPrice < sellPrice) {
          buyPriceIndex++;
        } else {
          sellPriceIndex++;
        }
      }
    }

    // Add remaining unmatched orders
    Object.values(buyOrdersByPrice).forEach(orders => {
      unmatchedOrders.push(...orders);
    });
    Object.values(sellOrdersByPrice).forEach(orders => {
      unmatchedOrders.push(...orders);
    });

    const processingTime = performance.now() - startTime;

    this.logger.log(
      `Pro-Rata matching completed for ${symbol}: ${trades.length} trades, ` +
      `${updatedOrders.length} updated orders, ${processingTime.toFixed(2)}ms`
    );

    return {
      trades,
      updatedOrders,
      unmatchedOrders,
      processingTime
    };
  }

  private groupOrdersByPrice(orders: Order[]): Record<number, Order[]> {
    const grouped: Record<number, Order[]> = {};
    
    orders.forEach(order => {
      const price = Math.floor(order.price * 100); // Group by 2 decimal places
      if (!grouped[price]) {
        grouped[price] = [];
      }
      grouped[price].push(order);
    });

    // Sort orders within each price level by timestamp (FIFO within price level)
    Object.keys(grouped).forEach(price => {
      grouped[Number(price)].sort((a, b) => a.timestamp - b.timestamp);
    });

    return grouped;
  }

  private executeProRataMatching(
    buyOrders: Order[],
    sellOrders: Order[],
    totalMatchVolume: number,
    matchPrice: number,
    symbol: string
  ): Trade[] {
    const trades: Trade[] = [];
    
    // Calculate pro-rata allocations
    const totalBuyVolume = buyOrders.reduce((sum, order) => sum + order.remainingQuantity, 0);
    const totalSellVolume = sellOrders.reduce((sum, order) => sum + order.remainingQuantity, 0);

    // Determine which side has more volume and allocate accordingly
    if (totalBuyVolume <= totalSellVolume) {
      // Buy side is smaller, allocate all buy orders proportionally to sell orders
      const buyAllocations = this.calculateProRataAllocations(buyOrders, totalMatchVolume);
      
      buyOrders.forEach((buyOrder, index) => {
        const buyAllocation = buyAllocations[index];
        if (buyAllocation > 0) {
          // Find sell orders to match with
          const remainingSellOrders = sellOrders.filter(o => o.remainingQuantity > 0);
          const sellAllocations = this.calculateProRataAllocations(remainingSellOrders, buyAllocation);
          
          remainingSellOrders.forEach((sellOrder, sellIndex) => {
            const sellAllocation = sellAllocations[sellIndex];
            if (sellAllocation > 0) {
              const trade = this.createTrade(
                buyOrder,
                sellOrder,
                sellAllocation,
                matchPrice,
                symbol
              );
              trades.push(trade);
              
              // Update sell order temporarily for allocation calculation
              sellOrder.remainingQuantity -= sellAllocation;
            }
          });
          
          // Reset sell orders for next buy order
          sellOrders.forEach(order => {
            order.remainingQuantity = order.quantity - order.filledQuantity;
          });
        }
      });
    } else {
      // Sell side is smaller, allocate all sell orders proportionally to buy orders
      const sellAllocations = this.calculateProRataAllocations(sellOrders, totalMatchVolume);
      
      sellOrders.forEach((sellOrder, index) => {
        const sellAllocation = sellAllocations[index];
        if (sellAllocation > 0) {
          // Find buy orders to match with
          const remainingBuyOrders = buyOrders.filter(o => o.remainingQuantity > 0);
          const buyAllocations = this.calculateProRataAllocations(remainingBuyOrders, sellAllocation);
          
          remainingBuyOrders.forEach((buyOrder, buyIndex) => {
            const buyAllocation = buyAllocations[buyIndex];
            if (buyAllocation > 0) {
              const trade = this.createTrade(
                buyOrder,
                sellOrder,
                buyAllocation,
                matchPrice,
                symbol
              );
              trades.push(trade);
              
              // Update buy order temporarily for allocation calculation
              buyOrder.remainingQuantity -= buyAllocation;
            }
          });
          
          // Reset buy orders for next sell order
          buyOrders.forEach(order => {
            order.remainingQuantity = order.quantity - order.filledQuantity;
          });
        }
      });
    }

    return trades;
  }

  private calculateProRataAllocations(orders: Order[], totalVolume: number): number[] {
    const allocations: number[] = [];
    const totalOrderVolume = orders.reduce((sum, order) => sum + order.remainingQuantity, 0);
    
    if (totalOrderVolume === 0) return allocations;
    
    orders.forEach(order => {
      const proportion = order.remainingQuantity / totalOrderVolume;
      const allocation = Math.floor(totalVolume * proportion * 100) / 100; // Round to 2 decimal places
      allocations.push(allocation);
    });
    
    // Handle rounding errors by distributing remaining volume
    const allocatedVolume = allocations.reduce((sum, allocation) => sum + allocation, 0);
    const remainingVolume = totalVolume - allocatedVolume;
    
    if (remainingVolume > 0 && allocations.length > 0) {
      // Give remaining volume to the order with the largest remainder
      let maxRemainderIndex = 0;
      let maxRemainder = 0;
      
      orders.forEach((order, index) => {
        const proportion = order.remainingQuantity / totalOrderVolume;
        const idealAllocation = totalVolume * proportion;
        const remainder = idealAllocation - allocations[index];
        
        if (remainder > maxRemainder) {
          maxRemainder = remainder;
          maxRemainderIndex = index;
        }
      });
      
      allocations[maxRemainderIndex] += remainingVolume;
    }
    
    return allocations;
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
    trade.tradeType = TradeType.BUY;
    trade.timestamp = Date.now();
    trade.makerFee = this.calculateFee(quantity * price, 0.001); // 0.1% maker fee
    trade.takerFee = this.calculateFee(quantity * price, 0.002); // 0.2% taker fee
    trade.metadata = {
      algorithm: MatchingAlgorithm.PRO_RATA,
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
    return MatchingAlgorithm.PRO_RATA;
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
