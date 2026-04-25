import { IsString, IsNumber, IsArray, IsOptional, IsEnum, Min, Max } from 'class-validator';

export enum SettlementStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
  TRANSFER = 'TRANSFER',
}

export interface Party {
  id: string;
  name: string;
  accountNumber: string;
  collateralBalance: number;
  creditLimit: number;
}

export interface Transaction {
  id: string;
  fromPartyId: string;
  toPartyId: string;
  amount: number;
  currency: string;
  transactionType: TransactionType;
  timestamp: Date;
  metadata?: any;
}

export class SettlementRequestDto {
  @IsArray()
  parties: Party[];

  @IsArray()
  transactions: Transaction[];

  @IsString()
  @IsOptional()
  settlementType?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  nettingThreshold?: number;
}

export class NettingRequestDto {
  @IsArray()
  transactions: Transaction[];

  @IsString()
  @IsOptional()
  nettingAlgorithm?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  efficiencyThreshold?: number;
}

export class MarginCallDto {
  @IsString()
  partyId: string;

  @IsNumber()
  @Min(0)
  requiredMargin: number;

  @IsNumber()
  @Min(0)
  currentMargin: number;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsNumber()
  @IsOptional()
  deadlineHours?: number;
}

export class SettlementResponseDto {
  @IsString()
  settlementId: string;

  @IsEnum(SettlementStatus)
  status: SettlementStatus;

  @IsArray()
  nettedTransactions: Transaction[];

  @IsNumber()
  totalAmount: number;

  @IsNumber()
  nettingEfficiency: number;

  @IsString()
  @IsOptional()
  message?: string;

  @IsNumber()
  @IsOptional()
  processingTimeMs?: number;
}

export class SettlementStatusDto {
  @IsString()
  settlementId: string;

  @IsEnum(SettlementStatus)
  status: SettlementStatus;

  @IsNumber()
  progressPercentage: number;

  @IsString()
  @IsOptional()
  currentStep?: string;

  @IsNumber()
  @IsOptional()
  estimatedCompletionTime?: number;

  @IsArray()
  @IsOptional()
  errors?: string[];

  @IsString()
  @IsOptional()
  lastUpdated?: string;
}

export class RiskAssessmentDto {
  @IsString()
  partyId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  riskScore: number;

  @IsString()
  riskLevel: string;

  @IsNumber()
  @Min(0)
  collateralRequirement: number;

  @IsNumber()
  @Min(0)
  availableCollateral: number;

  @IsString()
  @IsOptional()
  recommendation?: string;

  @IsArray()
  @IsOptional()
  riskFactors?: string[];
}

export class BankingIntegrationDto {
  @IsString()
  bankName: string;

  @IsString()
  accountNumber: string;

  @IsString()
  routingNumber: string;

  @IsString()
  @IsOptional()
  swiftCode?: string;

  @IsEnum(['ACH', 'WIRE', 'SEPA', 'SWIFT'])
  transferMethod: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  currency: string;
}
