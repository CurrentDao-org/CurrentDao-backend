export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  VALIDATING = 'validating',
  SETTLING = 'settling',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RECONCILING = 'reconciling',
}

export enum TransactionType {
  ENERGY_TRADE = 'energy_trade',
  CROSS_BORDER = 'cross_border',
  DOMESTIC = 'domestic',
  FUTURES = 'futures',
  SPOT = 'spot',
  OPTIONS = 'options',
}

export enum SettlementStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERSED = 'reversed',
}

export enum ReconciliationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DISCREPANCIES_FOUND = 'discrepancies_found',
}

export enum ComplianceLevel {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PENDING_REVIEW = 'pending_review',
  FLAGGED = 'flagged',
}
