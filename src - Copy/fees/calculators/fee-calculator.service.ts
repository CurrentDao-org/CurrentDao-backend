/**
 * Fee Calculator Service
 * 
 * Core service for calculating fees based on different fee structures.
 */

import { Injectable, Logger } from '@nestjs/common';
import { FeeStructure, FeeType, TierRange } from '../entities/fee-structure.entity';
import { FeeBreakdown } from '../entities/fee-transaction.entity';

@Injectable()
export class FeeCalculatorService {
  private readonly logger = new Logger(FeeCalculatorService.name);

  /**
   * Calculate fee based on fee structure
   */
  calculate(
    amount: number,
    feeStructure: FeeStructure,
    userVolume?: number,
  ): { fee: number; breakdown: FeeBreakdown } {
    this.logger.debug(`Calculating fee for amount: ${amount} using structure: ${feeStructure.name}`);

    let baseFee = 0;
    const breakdown: FeeBreakdown = {
      baseFee: 0,
      totalFee: 0,
    };

    switch (feeStructure.feeType) {
      case FeeType.FIXED:
        baseFee = this.calculateFixedFee(feeStructure);
        break;
      case FeeType.PERCENTAGE:
        baseFee = this.calculatePercentageFee(amount, feeStructure);
        break;
      case FeeType.TIERED:
        baseFee = this.calculateTieredFee(amount, feeStructure);
        break;
      case FeeType.HYBRID:
        baseFee = this.calculateHybridFee(amount, feeStructure);
        break;
      default:
        throw new Error(`Unsupported fee type: ${feeStructure.feeType}`);
    }

    // Apply minimum and maximum fee caps
    baseFee = this.applyFeeCaps(baseFee, feeStructure);

    // Apply volume discounts if applicable
    if (userVolume !== undefined && feeStructure.volumeThreshold !== undefined) {
      baseFee = this.applyVolumeDiscount(baseFee, userVolume, feeStructure);
    }

    breakdown.baseFee = baseFee;
    breakdown.totalFee = baseFee;

    return { fee: baseFee, breakdown };
  }

  /**
   * Calculate fixed fee
   */
  private calculateFixedFee(feeStructure: FeeStructure): number {
    return feeStructure.fixedAmount || 0;
  }

  /**
   * Calculate percentage fee
   */
  private calculatePercentageFee(amount: number, feeStructure: FeeStructure): number {
    const rate = feeStructure.percentageRate || 0;
    return amount * (rate / 100);
  }

  /**
   * Calculate tiered fee
   */
  private calculateTieredFee(amount: number, feeStructure: FeeStructure): number {
    if (!feeStructure.tiers || feeStructure.tiers.length === 0) {
      return 0;
    }

    let totalFee = 0;
    let remainingAmount = amount;

    for (const tier of feeStructure.tiers) {
      const tierRange = this.getTierRange(tier);
      const amountInTier = Math.min(remainingAmount, tierRange.max - tierRange.min);

      if (amountInTier <= 0) {
        break;
      }

      const tierFee = amountInTier * (tier.feeRate / 100);
      totalFee += tierFee;
      remainingAmount -= amountInTier;
    }

    return totalFee;
  }

  /**
   * Calculate hybrid fee (combination of fixed and percentage)
   */
  private calculateHybridFee(amount: number, feeStructure: FeeStructure): number {
    const fixedFee = feeStructure.fixedAmount || 0;
    const percentageFee = this.calculatePercentageFee(amount, feeStructure);
    return fixedFee + percentageFee;
  }

  /**
   * Apply minimum and maximum fee caps
   */
  private applyFeeCaps(fee: number, feeStructure: FeeStructure): number {
    let cappedFee = fee;

    if (feeStructure.minimumFee !== undefined) {
      cappedFee = Math.max(cappedFee, feeStructure.minimumFee);
    }

    if (feeStructure.maximumFee !== undefined) {
      cappedFee = Math.min(cappedFee, feeStructure.maximumFee);
    }

    return cappedFee;
  }

  /**
   * Apply volume discount
   */
  private applyVolumeDiscount(
    fee: number,
    userVolume: number,
    feeStructure: FeeStructure,
  ): number {
    if (!feeStructure.volumeThreshold || !feeStructure.volumeDiscountRate) {
      return fee;
    }

    if (userVolume >= feeStructure.volumeThreshold) {
      const discount = fee * (feeStructure.volumeDiscountRate / 100);
      this.logger.debug(`Applied volume discount: ${discount} for volume: ${userVolume}`);
      return fee - discount;
    }

    return fee;
  }

  /**
   * Get tier range with proper boundaries
   */
  private getTierRange(tier: TierRange): { min: number; max: number } {
    const min = tier.min || 0;
    const max = tier.max !== undefined ? tier.max : Infinity;
    return { min, max };
  }

  /**
   * Check if fee structure is currently valid (promotional period)
   */
  isValidPeriod(feeStructure: FeeStructure): boolean {
    const now = new Date();

    if (feeStructure.validFrom && now < feeStructure.validFrom) {
      return false;
    }

    if (feeStructure.validUntil && now > feeStructure.validUntil) {
      return false;
    }

    return true;
  }
}
