/**
 * Fee Structure Entity
 * 
 * Defines different fee structures including fixed, percentage, and tiered fees.
 */

export enum FeeType {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE',
  TIERED = 'TIERED',
  HYBRID = 'HYBRID',
}

export enum FeeCategory {
  TRANSACTION = 'TRANSACTION',
  WITHDRAWAL = 'WITHDRAWAL',
  DEPOSIT = 'DEPOSIT',
  TRADING = 'TRADING',
  PLATFORM = 'PLATFORM',
  NETWORK = 'NETWORK',
}

export interface TierRange {
  min: number;
  max?: number;
  feeRate: number;
  fixedFee?: number;
}

/**
 * Fee structure configuration
 */
export class FeeStructure {
  /** Unique identifier for the fee structure */
  id: string;

  /** Name of the fee structure */
  name: string;

  /** Description of the fee structure */
  description?: string;

  /** Type of fee calculation */
  feeType: FeeType;

  /** Category of the fee */
  category: FeeCategory;

  /** Fixed fee amount (for FIXED type) */
  fixedAmount?: number;

  /** Percentage rate (for PERCENTAGE type) */
  percentageRate?: number;

  /** Minimum fee amount */
  minimumFee?: number;

  /** Maximum fee cap */
  maximumFee?: number;

  /** Tier ranges for TIERED type */
  tiers?: TierRange[];

  /** Currency for the fee */
  currency: string;

  /** Whether the fee is active */
  isActive: boolean;

  /** Start date for promotional periods */
  validFrom?: Date;

  /** End date for promotional periods */
  validUntil?: Date;

  /** Volume threshold for discounts */
  volumeThreshold?: number;

  /** Discount rate for high volume */
  volumeDiscountRate?: number;

  /** Metadata for additional configuration */
  metadata?: Record<string, any>;

  /** Timestamp when created */
  createdAt: Date;

  /** Timestamp when last updated */
  updatedAt: Date;
}
