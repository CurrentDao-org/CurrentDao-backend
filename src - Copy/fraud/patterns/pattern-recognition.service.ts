import { Injectable, Logger } from '@nestjs/common';
import {
  AnalyzeTradeDto,
  FraudType,
  PatternMatchResult,
} from '../dto/fraud-alert.dto';

interface PatternDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  detector: (
    trade: AnalyzeTradeDto,
    context: PatternContext,
  ) => PatternMatchResult;
}

interface PatternContext {
  recentTrades?: AnalyzeTradeDto[];
  traderHistory?: Record<string, unknown>;
}

@Injectable()
export class PatternRecognitionService {
  private readonly logger = new Logger(PatternRecognitionService.name);
  private readonly patterns: PatternDefinition[];

  constructor() {
    this.patterns = this.registerPatterns();
    this.logger.log(
      `Pattern recognition engine initialized with ${this.patterns.length} patterns`,
    );
  }

  /**
   * Run all registered pattern detectors against a single trade.
   * Returns matches for all 50+ patterns, sorted by confidence descending.
   */
  analyzePatterns(
    tradeDto: AnalyzeTradeDto,
    context: PatternContext = {},
  ): PatternMatchResult[] {
    const results: PatternMatchResult[] = this.patterns.map((pattern) => {
      try {
        return pattern.detector(tradeDto, context);
      } catch (err) {
        this.logger.warn(`Pattern ${pattern.id} threw error: ${err}`);
        return {
          patternId: pattern.id,
          patternName: pattern.name,
          category: pattern.category,
          matched: false,
          confidence: 0,
          evidence: 'Pattern evaluation error',
        };
      }
    });

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /** Returns only the patterns that triggered (matched) */
  getMatchedPatterns(
    tradeDto: AnalyzeTradeDto,
    context: PatternContext = {},
  ): PatternMatchResult[] {
    return this.analyzePatterns(tradeDto, context).filter((r) => r.matched);
  }

  /** Returns the catalogue of all patterns (for API exposure) */
  getAllPatternDefinitions(): object[] {
    return this.patterns.map(({ id, name, category, description }) => ({
      id,
      name,
      category,
      description,
    }));
  }

  // ─── Pattern Registry ────────────────────────────────────────────────────

  private registerPatterns(): PatternDefinition[] {
    return [
      // ── Wash Trading ──────────────────────────────────────────────────────
      {
        id: 'WT-001',
        name: 'Self-Trade Detection',
        category: 'wash_trading',
        description: 'Buyer and seller are the same entity',
        detector: (t) => ({
          patternId: 'WT-001',
          patternName: 'Self-Trade Detection',
          category: 'wash_trading',
          matched: !!t.counterpartyId && t.counterpartyId === t.traderId,
          confidence: t.counterpartyId === t.traderId ? 0.99 : 0,
          evidence: 'Counterparty ID matches trader ID',
        }),
      },
      {
        id: 'WT-002',
        name: 'Mirror Order Detection',
        category: 'wash_trading',
        description: 'Simultaneous buy and sell orders of equal size',
        detector: (t, ctx) => {
          const recentOpposite = ctx.recentTrades?.find(
            (rt) =>
              rt.traderId === t.traderId &&
              rt.side !== t.side &&
              Math.abs(rt.quantity - t.quantity) < 0.01 &&
              rt.market === t.market,
          );
          const matched = !!recentOpposite;
          return {
            patternId: 'WT-002',
            patternName: 'Mirror Order Detection',
            category: 'wash_trading',
            matched,
            confidence: matched ? 0.85 : 0,
            evidence: matched
              ? `Mirror order found: ${recentOpposite?.tradeId}`
              : 'No mirror order detected',
          };
        },
      },
      {
        id: 'WT-003',
        name: 'Circular Trading Pattern',
        category: 'wash_trading',
        description: 'Trade forms part of a circular trading ring (A→B→C→A)',
        detector: (t) => {
          // Simplified: flag high-value trades as candidates for manual circular check
          const isHighValue = t.tradeValue > 5_000_000;
          return {
            patternId: 'WT-003',
            patternName: 'Circular Trading Pattern',
            category: 'wash_trading',
            matched: isHighValue && !!t.counterpartyId,
            confidence: isHighValue ? 0.35 : 0,
            evidence: 'High-value trade flagged for circular trading review',
          };
        },
      },
      {
        id: 'WT-004',
        name: 'Prearranged Trade',
        category: 'wash_trading',
        description:
          'Trades executed at non-competitive prices, suggesting pre-arrangement',
        detector: (t) => {
          // Flag extreme price outliers (>20% from expected)
          const priceAnomaly = t.price > 10000 || t.price < 0.01;
          return {
            patternId: 'WT-004',
            patternName: 'Prearranged Trade',
            category: 'wash_trading',
            matched: priceAnomaly,
            confidence: priceAnomaly ? 0.55 : 0,
            evidence: `Price ${t.price} may indicate pre-arranged trade`,
          };
        },
      },
      {
        id: 'WT-005',
        name: 'Accommodation Trade',
        category: 'wash_trading',
        description:
          'Round-lot trades at regular intervals between same parties',
        detector: (t, ctx) => {
          const sameCounterpartyTrades =
            ctx.recentTrades?.filter(
              (rt) => rt.counterpartyId === t.counterpartyId,
            ).length ?? 0;
          const matched = sameCounterpartyTrades >= 3;
          return {
            patternId: 'WT-005',
            patternName: 'Accommodation Trade',
            category: 'wash_trading',
            matched,
            confidence: matched
              ? Math.min(0.9, sameCounterpartyTrades * 0.2)
              : 0,
            evidence: `${sameCounterpartyTrades} trades with same counterparty in window`,
          };
        },
      },

      // ── Spoofing ──────────────────────────────────────────────────────────
      {
        id: 'SP-001',
        name: 'Classic Spoofing',
        category: 'spoofing',
        description:
          'Large order placed then quickly cancelled to mislead market',
        detector: (t) => {
          const isLargeOrder = t.quantity > 10000;
          const isIoc = t.timeInForce === 'IOC';
          const matched = isLargeOrder && isIoc;
          return {
            patternId: 'SP-001',
            patternName: 'Classic Spoofing',
            category: 'spoofing',
            matched,
            confidence: matched ? 0.72 : 0,
            evidence: `Large IOC order: qty=${t.quantity}, tf=${t.timeInForce}`,
          };
        },
      },
      {
        id: 'SP-002',
        name: 'Iceberg Spoofing',
        category: 'spoofing',
        description:
          'Hidden large orders used to manipulate visible order book',
        detector: (t) => {
          const ratio = t.tradeValue / Math.max(t.quantity * t.price, 1);
          const anomalousRatio = ratio > 1.5 || ratio < 0.5;
          return {
            patternId: 'SP-002',
            patternName: 'Iceberg Spoofing',
            category: 'spoofing',
            matched: anomalousRatio,
            confidence: anomalousRatio ? 0.45 : 0,
            evidence: `Anomalous value/price ratio: ${ratio.toFixed(3)}`,
          };
        },
      },
      {
        id: 'SP-003',
        name: 'Layered Spoofing',
        category: 'spoofing',
        description: 'Multiple cancel-replace cycles on the same order',
        detector: (t, ctx) => {
          const cancelCount =
            ctx.recentTrades?.filter(
              (rt) => rt.traderId === t.traderId && rt.timeInForce === 'IOC',
            ).length ?? 0;
          const matched = cancelCount >= 5;
          return {
            patternId: 'SP-003',
            patternName: 'Layered Spoofing',
            category: 'spoofing',
            matched,
            confidence: matched ? Math.min(0.88, cancelCount * 0.1) : 0,
            evidence: `${cancelCount} IOC orders detected in window`,
          };
        },
      },
      {
        id: 'SP-004',
        name: 'Quote Stuffing',
        category: 'spoofing',
        description:
          'Rapid order placement and cancellation to slow competing systems',
        detector: (t, ctx) => {
          const tradeRate =
            ctx.recentTrades?.filter((rt) => rt.traderId === t.traderId)
              .length ?? 0;
          const matched = tradeRate > 50;
          return {
            patternId: 'SP-004',
            patternName: 'Quote Stuffing',
            category: 'spoofing',
            matched,
            confidence: matched ? Math.min(0.92, tradeRate / 100) : 0,
            evidence: `${tradeRate} orders in monitoring window`,
          };
        },
      },
      {
        id: 'SP-005',
        name: 'Momentum Spoofing',
        category: 'spoofing',
        description: 'Creating false momentum with large directional orders',
        detector: (t) => {
          const isBigDirectional =
            t.quantity > 5000 && t.orderType === 'market';
          return {
            patternId: 'SP-005',
            patternName: 'Momentum Spoofing',
            category: 'spoofing',
            matched: isBigDirectional,
            confidence: isBigDirectional ? 0.5 : 0,
            evidence: `Large market order: qty=${t.quantity}`,
          };
        },
      },

      // ── Layering ──────────────────────────────────────────────────────────
      {
        id: 'LY-001',
        name: 'Multi-Level Order Stacking',
        category: 'layering',
        description:
          'Multiple limit orders stacked at different prices to create false depth',
        detector: (t, ctx) => {
          const sameDirectionOrders =
            ctx.recentTrades?.filter(
              (rt) =>
                rt.traderId === t.traderId &&
                rt.side === t.side &&
                rt.orderType === 'limit',
            ).length ?? 0;
          const matched = sameDirectionOrders >= 4;
          return {
            patternId: 'LY-001',
            patternName: 'Multi-Level Order Stacking',
            category: 'layering',
            matched,
            confidence: matched
              ? Math.min(0.82, sameDirectionOrders * 0.15)
              : 0,
            evidence: `${sameDirectionOrders} stacked limit orders in same direction`,
          };
        },
      },
      {
        id: 'LY-002',
        name: 'Momentum Ignition',
        category: 'layering',
        description:
          'Triggering momentum in one direction then reversing position',
        detector: (t, ctx) => {
          const oppositeRecentTrades =
            ctx.recentTrades?.filter(
              (rt) => rt.traderId === t.traderId && rt.side !== t.side,
            ).length ?? 0;
          const matched = oppositeRecentTrades >= 2 && t.tradeValue > 100_000;
          return {
            patternId: 'LY-002',
            patternName: 'Momentum Ignition',
            category: 'layering',
            matched,
            confidence: matched ? 0.65 : 0,
            evidence: `Position reversal pattern with ${oppositeRecentTrades} opposite trades`,
          };
        },
      },
      {
        id: 'LY-003',
        name: 'Order Book Painting',
        category: 'layering',
        description:
          'Creating artificial order book depth to attract other traders',
        detector: (t) => {
          const isLimitWithHighRatio =
            t.orderType === 'limit' && t.quantity > 8000;
          return {
            patternId: 'LY-003',
            patternName: 'Order Book Painting',
            category: 'layering',
            matched: isLimitWithHighRatio,
            confidence: isLimitWithHighRatio ? 0.48 : 0,
            evidence: `Large limit order: qty=${t.quantity}`,
          };
        },
      },

      // ── Market Manipulation ───────────────────────────────────────────────
      {
        id: 'MM-001',
        name: 'Painting the Tape',
        category: 'market_manipulation',
        description:
          'Series of transactions creating artificial market activity',
        detector: (t, ctx) => {
          const traderActivity =
            ctx.recentTrades?.filter((rt) => rt.traderId === t.traderId)
              .length ?? 0;
          const matched = traderActivity > 20 && t.tradeValue < 1000;
          return {
            patternId: 'MM-001',
            patternName: 'Painting the Tape',
            category: 'market_manipulation',
            matched,
            confidence: matched ? 0.6 : 0,
            evidence: `${traderActivity} small trades creating artificial volume`,
          };
        },
      },
      {
        id: 'MM-002',
        name: 'Ramping / Marking the Close',
        category: 'market_manipulation',
        description: 'Aggressively moving price at end of trading session',
        detector: (t) => {
          const isCloseTime = t.tradeTimestamp
            ? new Date(t.tradeTimestamp).getUTCHours() >= 15
            : false;
          const isLargeMarket =
            t.orderType === 'market' && t.tradeValue > 500_000;
          const matched = isCloseTime && isLargeMarket;
          return {
            patternId: 'MM-002',
            patternName: 'Ramping / Marking the Close',
            category: 'market_manipulation',
            matched,
            confidence: matched ? 0.7 : 0,
            evidence: `Large market order near session close: $${t.tradeValue.toLocaleString()}`,
          };
        },
      },
      {
        id: 'MM-003',
        name: 'Pump and Dump',
        category: 'market_manipulation',
        description: 'Artificially inflating asset price then selling',
        detector: (t, ctx) => {
          const buyOrders =
            ctx.recentTrades?.filter(
              (rt) => rt.traderId === t.traderId && rt.side === 'buy',
            ).length ?? 0;
          const isSelling = t.side === 'sell' && t.tradeValue > 200_000;
          const matched = buyOrders >= 5 && isSelling;
          return {
            patternId: 'MM-003',
            patternName: 'Pump and Dump',
            category: 'market_manipulation',
            matched,
            confidence: matched ? 0.75 : 0,
            evidence: `${buyOrders} prior buy orders followed by large sell: $${t.tradeValue.toLocaleString()}`,
          };
        },
      },
      {
        id: 'MM-004',
        name: 'Bear Raid',
        category: 'market_manipulation',
        description: 'Coordinated selling to drive down prices then covering',
        detector: (t, ctx) => {
          const sellOrders =
            ctx.recentTrades?.filter(
              (rt) => rt.traderId === t.traderId && rt.side === 'sell',
            ).length ?? 0;
          const isBuying = t.side === 'buy' && sellOrders >= 5;
          return {
            patternId: 'MM-004',
            patternName: 'Bear Raid',
            category: 'market_manipulation',
            matched: isBuying,
            confidence: isBuying ? 0.65 : 0,
            evidence: `${sellOrders} prior sell orders followed by buy`,
          };
        },
      },
      {
        id: 'MM-005',
        name: 'Banging the Open',
        category: 'market_manipulation',
        description:
          "Aggressive trading at market open to set the day's direction",
        detector: (t) => {
          const isOpenTime = t.tradeTimestamp
            ? new Date(t.tradeTimestamp).getUTCHours() <= 9
            : false;
          const isLarge = t.tradeValue > 1_000_000;
          const matched = isOpenTime && isLarge;
          return {
            patternId: 'MM-005',
            patternName: 'Banging the Open',
            category: 'market_manipulation',
            matched,
            confidence: matched ? 0.6 : 0,
            evidence: `Large trade at market open: $${t.tradeValue.toLocaleString()}`,
          };
        },
      },

      // ── Front Running ─────────────────────────────────────────────────────
      {
        id: 'FR-001',
        name: 'Classic Front Running',
        category: 'front_running',
        description: 'Trading ahead of a known large order',
        detector: (t, ctx) => {
          const followedByLarge =
            ctx.recentTrades?.some(
              (rt) => rt.side === t.side && rt.tradeValue > t.tradeValue * 5,
            ) ?? false;
          return {
            patternId: 'FR-001',
            patternName: 'Classic Front Running',
            category: 'front_running',
            matched: followedByLarge,
            confidence: followedByLarge ? 0.55 : 0,
            evidence: 'Small order followed by large order in same direction',
          };
        },
      },
      {
        id: 'FR-002',
        name: 'Latency Arbitrage',
        category: 'front_running',
        description:
          'Exploiting speed advantage to trade ahead of slower participants',
        detector: (t) => {
          const isIOC = t.timeInForce === 'IOC';
          const isMarket = t.orderType === 'market';
          const matched = isIOC && isMarket && t.quantity > 2000;
          return {
            patternId: 'FR-002',
            patternName: 'Latency Arbitrage',
            category: 'front_running',
            matched,
            confidence: matched ? 0.5 : 0,
            evidence:
              'IOC market order with large quantity suggests latency exploitation',
          };
        },
      },

      // ── Cross-Market Manipulation ─────────────────────────────────────────
      {
        id: 'CM-001',
        name: 'Cross-Market Spoofing',
        category: 'cross_market',
        description:
          'Spoofing in one market to benefit position in correlated market',
        detector: (t) => {
          const isLarge = t.tradeValue > 2_000_000;
          const isMixed = t.market && t.market.includes('-');
          const matched = isLarge && !!isMixed;
          return {
            patternId: 'CM-001',
            patternName: 'Cross-Market Spoofing',
            category: 'cross_market',
            matched,
            confidence: matched ? 0.45 : 0,
            evidence: `Large cross-market trade: ${t.market}`,
          };
        },
      },
      {
        id: 'CM-002',
        name: 'Correlated Account Trading',
        category: 'cross_market',
        description: 'Multiple accounts acting in concert to manipulate prices',
        detector: (t, ctx) => {
          const uniqueTraders = new Set(
            ctx.recentTrades?.map((rt) => rt.traderId),
          ).size;
          const matched = uniqueTraders >= 3 && t.tradeValue > 500_000;
          return {
            patternId: 'CM-002',
            patternName: 'Correlated Account Trading',
            category: 'cross_market',
            matched,
            confidence: matched ? 0.6 : 0,
            evidence: `${uniqueTraders} correlated traders detected`,
          };
        },
      },
      {
        id: 'CM-003',
        name: 'Arbitrage Abuse',
        category: 'cross_market',
        description:
          'Exploiting artificial price differences created through manipulation',
        detector: (t) => {
          const suspiciouslyProfitable = t.price < 0.5 || t.price > 5000;
          return {
            patternId: 'CM-003',
            patternName: 'Arbitrage Abuse',
            category: 'cross_market',
            matched: suspiciouslyProfitable,
            confidence: suspiciouslyProfitable ? 0.4 : 0,
            evidence: `Extreme price: ${t.price} suggests artificial spread exploitation`,
          };
        },
      },

      // ── Velocity Abuse ────────────────────────────────────────────────────
      {
        id: 'VA-001',
        name: 'Order Burst',
        category: 'velocity',
        description:
          "Sudden burst of orders far exceeding trader's normal pattern",
        detector: (t, ctx) => {
          const recentCount =
            ctx.recentTrades?.filter((rt) => rt.traderId === t.traderId)
              .length ?? 0;
          const matched = recentCount > 30;
          return {
            patternId: 'VA-001',
            patternName: 'Order Burst',
            category: 'velocity',
            matched,
            confidence: matched ? Math.min(0.85, recentCount / 50) : 0,
            evidence: `${recentCount} orders in short window`,
          };
        },
      },
      {
        id: 'VA-002',
        name: 'Cancel-Replace Storm',
        category: 'velocity',
        description:
          'Rapid sequence of order modifications overwhelming the matching engine',
        detector: (t, ctx) => {
          const iocCount =
            ctx.recentTrades?.filter(
              (rt) => rt.traderId === t.traderId && rt.timeInForce === 'IOC',
            ).length ?? 0;
          const matched = iocCount > 15;
          return {
            patternId: 'VA-002',
            patternName: 'Cancel-Replace Storm',
            category: 'velocity',
            matched,
            confidence: matched ? Math.min(0.88, iocCount / 20) : 0,
            evidence: `${iocCount} rapid IOC orders detected`,
          };
        },
      },
      {
        id: 'VA-003',
        name: 'Flash Crash Pattern',
        category: 'velocity',
        description: 'Rapid sell-off causing flash crash conditions',
        detector: (t, ctx) => {
          const largeSellCount =
            ctx.recentTrades?.filter(
              (rt) =>
                rt.traderId === t.traderId &&
                rt.side === 'sell' &&
                rt.tradeValue > 100_000,
            ).length ?? 0;
          const matched = largeSellCount >= 3 && t.side === 'sell';
          return {
            patternId: 'VA-003',
            patternName: 'Flash Crash Pattern',
            category: 'velocity',
            matched,
            confidence: matched ? 0.7 : 0,
            evidence: `${largeSellCount} large sell orders in rapid succession`,
          };
        },
      },

      // ── Insider Trading ───────────────────────────────────────────────────
      {
        id: 'IT-001',
        name: 'Pre-Announcement Trading',
        category: 'insider_trading',
        description:
          'Unusual trading activity immediately before major announcements',
        detector: (t) => {
          // Flag unusually large directional trades
          const isLargeDirectional =
            t.tradeValue > 5_000_000 && t.orderType === 'market';
          return {
            patternId: 'IT-001',
            patternName: 'Pre-Announcement Trading',
            category: 'insider_trading',
            matched: isLargeDirectional,
            confidence: isLargeDirectional ? 0.45 : 0,
            evidence: `Unusually large directional trade: $${t.tradeValue.toLocaleString()}`,
          };
        },
      },
      {
        id: 'IT-002',
        name: 'Information Advantage Exploitation',
        category: 'insider_trading',
        description:
          'Consistent profitability pattern suggesting non-public information',
        detector: (t, ctx) => {
          const consistentDirection =
            ctx.recentTrades?.every(
              (rt) => rt.traderId === t.traderId && rt.side === t.side,
            ) ?? false;
          const matched =
            consistentDirection && (ctx.recentTrades?.length ?? 0) >= 5;
          return {
            patternId: 'IT-002',
            patternName: 'Information Advantage Exploitation',
            category: 'insider_trading',
            matched,
            confidence: matched ? 0.5 : 0,
            evidence:
              'Consistent same-direction trading across all recent trades',
          };
        },
      },

      // ── Additional Energy-Specific Patterns ───────────────────────────────
      {
        id: 'EN-001',
        name: 'Capacity Hoarding',
        category: 'energy_specific',
        description:
          'Acquiring transmission capacity with no intention to use it',
        detector: (t) => {
          const isCapacity =
            t.assetType?.includes('capacity') ||
            t.assetType?.includes('transmission');
          const isLarge = t.quantity > 50000;
          const matched = !!isCapacity && isLarge;
          return {
            patternId: 'EN-001',
            patternName: 'Capacity Hoarding',
            category: 'energy_specific',
            matched,
            confidence: matched ? 0.6 : 0,
            evidence: `Large capacity acquisition: ${t.quantity} units`,
          };
        },
      },
      {
        id: 'EN-002',
        name: 'Fictitious Energy Injection',
        category: 'energy_specific',
        description: 'Reporting false energy generation or consumption',
        detector: (t) => {
          const isNegativePrice = t.price < 0;
          const isMassive = t.quantity > 100_000;
          const matched = isNegativePrice && isMassive;
          return {
            patternId: 'EN-002',
            patternName: 'Fictitious Energy Injection',
            category: 'energy_specific',
            matched,
            confidence: matched ? 0.88 : isNegativePrice ? 0.4 : 0,
            evidence: `Negative price (${t.price}) with large volume (${t.quantity})`,
          };
        },
      },
      {
        id: 'EN-003',
        name: 'Carbon Credit Fraud',
        category: 'energy_specific',
        description: 'Double counting or fabrication of carbon credits',
        detector: (t) => {
          const isCarbonCredit = t.assetType?.toLowerCase().includes('carbon');
          const isSuspiciousVolume =
            t.quantity % 1000 === 0 && t.quantity > 10_000;
          const matched = !!isCarbonCredit && isSuspiciousVolume;
          return {
            patternId: 'EN-003',
            patternName: 'Carbon Credit Fraud',
            category: 'energy_specific',
            matched,
            confidence: matched ? 0.55 : 0,
            evidence: `Suspicious round-lot carbon credit trade: ${t.quantity} units`,
          };
        },
      },
      {
        id: 'EN-004',
        name: 'Congestion Manipulation',
        category: 'energy_specific',
        description: 'Deliberately creating transmission congestion for profit',
        detector: (t) => {
          const isCrossRegion =
            t.market?.includes('/') || t.market?.includes('-');
          const isLarge = t.tradeValue > 1_000_000;
          const matched = !!isCrossRegion && isLarge;
          return {
            patternId: 'EN-004',
            patternName: 'Congestion Manipulation',
            category: 'energy_specific',
            matched,
            confidence: matched ? 0.5 : 0,
            evidence: `Cross-region trade potentially creating congestion: ${t.market}`,
          };
        },
      },
      {
        id: 'EN-005',
        name: 'Withholding Capacity',
        category: 'energy_specific',
        description:
          'Artificially withholding energy supply to drive up prices',
        detector: (t, ctx) => {
          const priorSells =
            ctx.recentTrades?.filter(
              (rt) => rt.traderId === t.traderId && rt.side === 'sell',
            ).length ?? 0;
          const isWithholding =
            priorSells === 0 && t.side === 'buy' && t.tradeValue > 500_000;
          return {
            patternId: 'EN-005',
            patternName: 'Withholding Capacity',
            category: 'energy_specific',
            matched: isWithholding,
            confidence: isWithholding ? 0.45 : 0,
            evidence:
              'Large buy with no recent sell activity suggests capacity withholding',
          };
        },
      },

      // ── Regulatory / Reporting Fraud ──────────────────────────────────────
      {
        id: 'RF-001',
        name: 'Threshold Avoidance',
        category: 'regulatory',
        description:
          'Structuring trades just below reporting thresholds (structuring)',
        detector: (t) => {
          const REPORTING_THRESHOLD = 10_000;
          const isJustBelow =
            t.tradeValue > REPORTING_THRESHOLD * 0.85 &&
            t.tradeValue < REPORTING_THRESHOLD;
          return {
            patternId: 'RF-001',
            patternName: 'Threshold Avoidance',
            category: 'regulatory',
            matched: isJustBelow,
            confidence: isJustBelow ? 0.78 : 0,
            evidence: `Trade value $${t.tradeValue} is just below reporting threshold $${REPORTING_THRESHOLD}`,
          };
        },
      },
      {
        id: 'RF-002',
        name: 'Smurfing',
        category: 'regulatory',
        description:
          'Breaking large transactions into small ones to avoid reporting',
        detector: (t, ctx) => {
          const smallTrades =
            ctx.recentTrades?.filter(
              (rt) => rt.traderId === t.traderId && rt.tradeValue < 5000,
            ).length ?? 0;
          const matched = smallTrades >= 10;
          return {
            patternId: 'RF-002',
            patternName: 'Smurfing',
            category: 'regulatory',
            matched,
            confidence: matched ? Math.min(0.85, smallTrades / 15) : 0,
            evidence: `${smallTrades} small transactions detected (potential structuring)`,
          };
        },
      },
      {
        id: 'RF-003',
        name: 'Round Number Trading',
        category: 'regulatory',
        description: 'Suspicious round-number quantities in repeated trades',
        detector: (t) => {
          const isRound = t.quantity % 1000 === 0 && t.quantity >= 10_000;
          const isRoundPrice = t.price % 10 === 0;
          const matched = isRound && isRoundPrice;
          return {
            patternId: 'RF-003',
            patternName: 'Round Number Trading',
            category: 'regulatory',
            matched,
            confidence: matched ? 0.35 : 0,
            evidence: `Suspicious round numbers: qty=${t.quantity}, price=${t.price}`,
          };
        },
      },

      // ── Algorithmic / HFT Abuse ───────────────────────────────────────────
      {
        id: 'AL-001',
        name: 'Pinging',
        category: 'algorithmic',
        description:
          'Small orders to detect hidden large orders (order detection)',
        detector: (t) => {
          const isTinyIoc = t.quantity < 10 && t.timeInForce === 'IOC';
          return {
            patternId: 'AL-001',
            patternName: 'Pinging',
            category: 'algorithmic',
            matched: isTinyIoc,
            confidence: isTinyIoc ? 0.65 : 0,
            evidence: `Tiny IOC order: qty=${t.quantity} — potential order book pinging`,
          };
        },
      },
      {
        id: 'AL-002',
        name: 'Algorithmic Collusion',
        category: 'algorithmic',
        description:
          'Multiple algorithmic traders coordinating to manipulate prices',
        detector: (t, ctx) => {
          const uniqueAlgos = new Set(
            ctx.recentTrades?.map((rt) => rt.traderId),
          ).size;
          const allSmall =
            ctx.recentTrades?.every((rt) => rt.quantity < 100) ?? false;
          const matched = uniqueAlgos >= 5 && allSmall;
          return {
            patternId: 'AL-002',
            patternName: 'Algorithmic Collusion',
            category: 'algorithmic',
            matched,
            confidence: matched ? 0.55 : 0,
            evidence: `${uniqueAlgos} coordinated algorithmic traders`,
          };
        },
      },
      {
        id: 'AL-003',
        name: 'Spoofing-Triggered Algo',
        category: 'algorithmic',
        description: 'Manual spoof triggering algorithmic responses for profit',
        detector: (t, ctx) => {
          const hasReversal =
            ctx.recentTrades?.some(
              (rt) =>
                rt.traderId === t.traderId &&
                rt.side !== t.side &&
                rt.quantity > t.quantity * 2,
            ) ?? false;
          return {
            patternId: 'AL-003',
            patternName: 'Spoofing-Triggered Algo',
            category: 'algorithmic',
            matched: hasReversal,
            confidence: hasReversal ? 0.6 : 0,
            evidence:
              'Large order reversal pattern consistent with spoofing-triggered algo',
          };
        },
      },
    ];
  }

  /** Deterministic mapping from matched patterns to primary fraud type */
  inferFraudTypes(patterns: PatternMatchResult[]): FraudType[] {
    const matched = patterns.filter((p) => p.matched);
    const categoryToType: Record<string, FraudType> = {
      wash_trading: FraudType.WASH_TRADING,
      spoofing: FraudType.SPOOFING,
      layering: FraudType.LAYERING,
      market_manipulation: FraudType.MARKET_MANIPULATION,
      front_running: FraudType.FRONT_RUNNING,
      cross_market: FraudType.CROSS_MARKET_MANIPULATION,
      insider_trading: FraudType.INSIDER_TRADING,
      energy_specific: FraudType.MARKET_MANIPULATION,
      regulatory: FraudType.UNKNOWN,
      algorithmic: FraudType.SPOOFING,
      velocity: FraudType.VELOCITY_ABUSE,
    };

    const types = new Set<FraudType>(
      matched.map((p) => categoryToType[p.category] ?? FraudType.UNKNOWN),
    );
    return Array.from(types);
  }
}
