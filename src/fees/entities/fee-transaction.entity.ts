/**
 * Fee Transaction Entity
 * 
 * Represents a fee transaction record with calculation details.
 */

export enum FeeStatus {
  PENDING = 'PENDING',
  CALCULATED = 'CALCULATED',
  COLLECTED = 'COLLECTED',
  SETTLED = 'SETTLED',
  WAIVED = 'WAIVED',
  REFUNDED = 'REFUNDED',
}

export enum FeeCollectionMethod {
  AUTOMATIC = 'AUTOMATIC',
  MANUAL = 'MANUAL',
  DEDUCTED = 'DEDUCTED',
  INVOICED = 'INVOICED',
}

/**
 * Fee breakdown for transparency
 */
export interface FeeBreakdown {
  baseFee: number;
  platformFee?: number;
  networkFee?: number;
  serviceFee?: number;
  discount?: number;
  promotionalDiscount?: number;
  volumeDiscount?: number;
  totalFee: number;
}

/**
 * Fee transaction record
 */
export class FeeTransaction {
  /** Unique transaction identifier */
  id: string;

  /** Reference to the related transaction (e.g., trade ID) */
  transactionId: string;

  /** Type of transaction */
  transactionType: string;

  /** User ID who paid the fee */
  userId: string;

  /** Wallet address used for payment */
  walletAddress?: string;

  /** Transaction amount */
  amount: number;

  /** Calculated fee amount */
  feeAmount: number;

  /** Fee structure ID used for calculation */
  feeStructureId: string;

  /** Breakdown of fee components */
  breakdown?: FeeBreakdown;

  /** Currency of the fee */
  currency: string;

  /** Status of fee collection */
  status: FeeStatus;

  /** Method of fee collection */
  collectionMethod: FeeCollectionMethod;

  /** Whether this is a promotional period */
  isPromotional: boolean;

  /** Applied discount rate */
  appliedDiscountRate?: number;

  /** Volume-based discount applied */
  volumeDiscountApplied?: number;

  /** Timestamp when fee was calculated */
  calculatedAt: Date;

  /** Timestamp when fee was collected */
  collectedAt?: Date;

  /** Timestamp when fee was settled */
  settledAt?: Date;

  /** Payment hash/transaction ID on blockchain */
  paymentHash?: string;

  /** Notes or comments */
  notes?: string;

  /** Metadata for additional information */
  metadata?: Record<string, any>;

  /** Audit trail - who created this record */
  createdBy?: string;

  /** Timestamp when created */
  createdAt: Date;

  /** Timestamp when last updated */
  updatedAt: Date;
}
