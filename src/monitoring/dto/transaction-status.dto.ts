import { IsString, IsEnum, IsOptional, IsNumber, IsDateString, IsObject, IsBoolean, IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionStatus, TransactionPriority } from '../entities/transaction-status.entity';

export class CreateTransactionStatusDto {
  @IsString()
  transactionHash: string;

  @IsOptional()
  @IsEnum(TransactionPriority)
  priority?: TransactionPriority;

  @IsOptional()
  @IsString()
  sourceAccount?: string;

  @IsOptional()
  @IsString()
  destinationAccount?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  assetCode?: string;

  @IsOptional()
  @IsString()
  assetIssuer?: string;

  @IsOptional()
  @IsString()
  memo?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  maxRetries?: number;

  @IsOptional()
  @IsDateString()
  timeoutAt?: string;
}

export class UpdateTransactionStatusDto {
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  retryCount?: number;

  @IsOptional()
  @IsNumber()
  ledgerSequence?: number;

  @IsOptional()
  @IsDateString()
  confirmedAt?: string;

  @IsOptional()
  @IsDateString()
  lastRetryAt?: string;

  @IsOptional()
  @IsDateString()
  timeoutAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}

export class TransactionStatusQueryDto {
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsEnum(TransactionPriority)
  priority?: TransactionPriority;

  @IsOptional()
  @IsString()
  sourceAccount?: string;

  @IsOptional()
  @IsString()
  destinationAccount?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  maxAmount?: number;

  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  limit?: number = 50;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class TransactionAlertDto {
  @IsString()
  type: string;

  @IsString()
  message: string;

  @IsString()
  severity: string;

  @IsDateString()
  sentAt: string;
}

export class TransactionStatusResponseDto {
  @IsUUID()
  id: string;

  @IsString()
  transactionHash: string;

  @IsEnum(TransactionStatus)
  status: TransactionStatus;

  @IsEnum(TransactionPriority)
  priority: TransactionPriority;

  @IsOptional()
  @IsString()
  sourceAccount?: string;

  @IsOptional()
  @IsString()
  destinationAccount?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  assetCode?: string;

  @IsOptional()
  @IsString()
  assetIssuer?: string;

  @IsOptional()
  @IsString()
  memo?: string;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsNumber()
  retryCount: number;

  @IsNumber()
  maxRetries: number;

  @IsOptional()
  @IsNumber()
  ledgerSequence?: number;

  @IsOptional()
  @IsDateString()
  confirmedAt?: string;

  @IsOptional()
  @IsDateString()
  lastRetryAt?: string;

  @IsOptional()
  @IsDateString()
  timeoutAt?: string;

  @IsDateString()
  createdAt: string;

  @IsDateString()
  updatedAt: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsBoolean()
  isArchived: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionAlertDto)
  alerts?: TransactionAlertDto[];
}

export class TransactionAnalyticsDto {
  @IsNumber()
  totalTransactions: number;

  @IsNumber()
  pendingTransactions: number;

  @IsNumber()
  confirmedTransactions: number;

  @IsNumber()
  failedTransactions: number;

  @IsNumber()
  retryingTransactions: number;

  @IsNumber()
  timeoutTransactions: number;

  @IsNumber()
  successRate: number;

  @IsNumber()
  averageConfirmationTime: number;

  @IsNumber()
  averageRetryCount: number;

  @IsObject()
  statusBreakdown: Record<TransactionStatus, number>;

  @IsObject()
  priorityBreakdown: Record<TransactionPriority, number>;

  @IsObject()
  hourlyStats: Record<string, {
    count: number;
    successRate: number;
    averageTime: number;
  }>;
}

export class RetryTransactionDto {
  @IsUUID()
  transactionId: string;

  @IsOptional()
  @IsEnum(TransactionPriority)
  priority?: TransactionPriority;

  @IsOptional()
  @IsNumber()
  maxRetries?: number;

  @IsOptional()
  @IsNumber()
  retryDelay?: number;
}
