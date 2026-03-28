import { Injectable, Logger } from '@nestjs/common';
import { SecurityEvent, SeverityLevel } from '../entities/security-event.entity';

export interface FraudAnalysisResult {
  isSuspicious: boolean;
  severity: SeverityLevel;
  patterns: string[];
  confidence: number;
  riskScore: number;
}

export interface WashTradingResult {
  isWashTrading: boolean;
  confidence: number;
  indicators: string[];
  relatedTransactions: string[];
}

@Injectable()
export class FraudDetectorService {
  private readonly logger = new Logger(FraudDetectorService.name);

  // Risk scoring weights
  private readonly riskWeights = {
    selfTrading: 0.4,
    rapidReversal: 0.3,
    circularTrading: 0.2,
    suspiciousPatterns: 0.1,
  };

  async analyzeTransaction(transactionData: any): Promise<FraudAnalysisResult> {
    const patterns: string[] = [];
    let riskScore = 0;

    // Check for self-trading
    const selfTradingResult = await this.detectSelfTrading(transactionData);
    if (selfTradingResult) {
      patterns.push('SELF_TRADING');
      riskScore += this.riskWeights.selfTrading;
    }

    // Check for rapid reversal
    const rapidReversalResult = await this.detectRapidReversal(transactionData);
    if (rapidReversalResult) {
      patterns.push('RAPID_REVERSAL');
      riskScore += this.riskWeights.rapidReversal;
    }

    // Check for circular trading
    const circularResult = await this.detectCircularTrading(transactionData);
    if (circularResult) {
      patterns.push('CIRCULAR_TRADING');
      riskScore += this.riskWeights.circularTrading;
    }

    // Check for other suspicious patterns
    const suspiciousPatternResult = await this.detectSuspiciousPatterns(transactionData);
    if (suspiciousPatternResult) {
      patterns.push('SUSPICIOUS_PATTERN');
      riskScore += this.riskWeights.suspiciousPatterns;
    }

    const severity = this.calculateSeverity(riskScore);
    
    return {
      isSuspicious: riskScore > 0.3,
      severity,
      patterns,
      confidence: riskScore,
      riskScore,
    };
  }

  async detectWashTrading(transactionData: any): Promise<WashTradingResult> {
    const indicators: string[] = [];
    const relatedTransactions: string[] = [];
    let confidence = 0;

    // Check for same buyer and seller
    if (await this.isSameBeneficialOwner(transactionData)) {
      indicators.push('SAME_BENEFICIAL_OWNER');
      confidence += 0.3;
    }

    // Check for matching buy/sell orders
    const matchResult = await this.checkMatchingOrders(transactionData);
    if (matchResult) {
      indicators.push('MATCHING_ORDERS');
      confidence += 0.3;
      relatedTransactions.push(...matchResult);
    }

    // Check for price manipulation patterns
    const priceManipulation = await this.detectPriceManipulation(transactionData);
    if (priceManipulation) {
      indicators.push('PRICE_MANIPULATION');
      confidence += 0.2;
    }

    // Check for volume inflation
    const volumeInflation = await this.detectVolumeInflation(transactionData);
    if (volumeInflation) {
      indicators.push('VOLUME_INFLATION');
      confidence += 0.2;
    }

    return {
      isWashTrading: confidence > 0.5,
      confidence,
      indicators,
      relatedTransactions,
    };
  }

  private async detectSelfTrading(transactionData: any): Promise<boolean> {
    const { buyerId, sellerId, walletAddress } = transactionData;
    
    // Check if buyer and seller are the same entity
    if (buyerId === sellerId) {
      return true;
    }

    // Check for wallets controlled by same user
    const areRelated = await this.checkWalletRelationship(buyerId, sellerId);
    return areRelated;
  }

  private async detectRapidReversal(transactionData: any): Promise<boolean> {
    const { walletAddress, timestamp, amount } = transactionData;
    
    // Look for opposite transactions within short time window (e.g., 5 minutes)
    const reversalExists = await this.findOppositeTransaction(
      walletAddress,
      timestamp,
      amount,
      5 * 60 * 1000, // 5 minutes
    );

    return reversalExists;
  }

  private async detectCircularTrading(transactionData: any): Promise<boolean> {
    const { participants } = transactionData;
    
    // Detect circular trading patterns (A->B->C->A)
    if (participants && participants.length >= 3) {
      const hasCircularPattern = await this.checkCircularPattern(participants);
      return hasCircularPattern;
    }

    return false;
  }

  private async detectSuspiciousPatterns(transactionData: any): Promise<boolean> {
    // Check for structuring (breaking large transactions into smaller ones)
    const structuringDetected = await this.detectStructuring(transactionData);
    if (structuringDetected) return true;

    // Check for unusual timing patterns
    const unusualTiming = await this.detectUnusualTiming(transactionData);
    if (unusualTiming) return true;

    return false;
  }

  private async detectPriceManipulation(transactionData: any): Promise<boolean> {
    const { price, marketPrice, recentPrices } = transactionData;
    
    if (!recentPrices || recentPrices.length === 0) return false;

    // Check for artificial price movements
    const avgRecentPrice = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    const deviation = Math.abs(price - avgRecentPrice) / avgRecentPrice;

    return deviation > 0.2; // 20% deviation suggests manipulation
  }

  private async detectVolumeInflation(transactionData: any): Promise<boolean> {
    const { amount, walletAddress } = transactionData;
    
    // Check for unusually high volume compared to historical data
    const avgVolume = await this.getHistoricalAverageVolume(walletAddress);
    const ratio = amount / avgVolume;

    return ratio > 10; // 10x normal volume suggests inflation
  }

  private calculateSeverity(riskScore: number): SeverityLevel {
    if (riskScore >= 0.8) return SeverityLevel.CRITICAL;
    if (riskScore >= 0.6) return SeverityLevel.HIGH;
    if (riskScore >= 0.4) return SeverityLevel.MEDIUM;
    return SeverityLevel.LOW;
  }

  // Helper methods - implement actual DB queries in production
  private async checkWalletRelationship(wallet1: string, wallet2: string): Promise<boolean> {
    // Check if wallets are related through common ownership, IP, etc.
    return false; // Placeholder
  }

  private async findOppositeTransaction(
    wallet: string,
    timestamp: Date,
    amount: number,
    windowMs: number,
  ): Promise<boolean> {
    // Search for opposite transaction within time window
    return false; // Placeholder
  }

  private async checkCircularPattern(participants: string[]): Promise<boolean> {
    // Analyze trading pattern for circular behavior
    return false; // Placeholder
  }

  private async detectStructuring(transactionData: any): Promise<boolean> {
    // Detect multiple transactions just below reporting thresholds
    return false; // Placeholder
  }

  private async detectUnusualTiming(transactionData: any): Promise<boolean> {
    // Check for transactions at unusual hours or frequencies
    return false; // Placeholder
  }

  private async checkMatchingOrders(transactionData: any): Promise<string[]> {
    // Find matching buy/sell orders
    return []; // Placeholder
  }

  private async isSameBeneficialOwner(transactionData: any): Promise<boolean> {
    // Check ultimate beneficial ownership
    return false; // Placeholder
  }

  private async getHistoricalAverageVolume(walletAddress: string): Promise<number> {
    return 1000; // Placeholder
  }
}
