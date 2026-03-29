import {
  IsString,
  IsArray,
  IsNumber,
  IsEnum,
  IsOptional,
  IsJSON,
  Min,
  Max,
  Length,
  ValidateNested,
  IsDecimal,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WalletStatus } from '../entities/multisig-wallet.entity';
import { TransactionType, SignatureStatus } from '../entities/signature.entity';

export class CreateMultisigWalletDto {
  @IsString()
  @Length(3, 100)
  name: string;

  @IsString()
  @Length(10, 500)
  description: string;

  @IsArray()
  @IsString({ each: true })
  signers: string[];

  @IsNumber()
  @Min(2)
  @Max(15)
  threshold: number;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(15)
  recoveryThreshold?: number;

  @IsOptional()
  @IsJSON()
  metadata?: Record<string, any>;
}

export class SignTransactionDto {
  @IsString()
  transactionHash: string;

  @IsString()
  signature: string;

  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @IsJSON()
  transactionData: Record<string, any>;

  @IsOptional()
  @IsDecimal()
  amount?: string;

  @IsOptional()
  @IsString()
  recipient?: string;

  @IsOptional()
  @IsJSON()
  auditData?: {
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    location?: string;
  };
}

export class RevokeSignatureDto {
  @IsString()
  transactionHash: string;

  @IsString()
  @Length(5, 200)
  reason: string;
}

export class InitiateRecoveryDto {
  @IsString()
  walletId: string;

  @IsString()
  @Length(5, 200)
  reason: string;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(15)
  newThreshold?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  newSigners?: string[];
}

export class ExecuteTransactionDto {
  @IsString()
  transactionHash: string;

  @IsOptional()
  @IsJSON()
  executionData?: Record<string, any>;
}

export class UpdateWalletDto {
  @IsOptional()
  @IsString()
  @Length(3, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(10, 500)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  signers?: string[];

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(15)
  threshold?: string;

  @IsOptional()
  @IsEnum(WalletStatus)
  status?: WalletStatus;

  @IsOptional()
  @IsJSON()
  metadata?: Record<string, any>;
}

export class MultisigWalletResponseDto {
  id: string;
  address: string;
  name: string;
  description: string;
  creatorId: string;
  signers: string[];
  threshold: number;
  status: WalletStatus;
  nonce: number;
  metadata?: Record<string, any>;
  recoveryThreshold?: number;
  recoveryInitiatedAt?: Date;
  recoveryInitiatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  lastTransactionAt?: Date;
  transactionCount: number;
  isRecoveryMode: boolean;
  requiredSignatures: number;
}

export class SignatureResponseDto {
  id: string;
  walletId: string;
  transactionHash: string;
  signerId: string;
  status: SignatureStatus;
  transactionType: TransactionType;
  transactionData: Record<string, any>;
  amount?: string;
  recipient?: string;
  expiresAt: Date;
  signedAt?: Date;
  revokedAt?: Date;
  executedAt?: Date;
  executionTxHash?: string;
  auditData?: {
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    location?: string;
  };
  revocationReason?: string;
  createdAt: Date;
  processedAt?: Date;
  isExpired: boolean;
  isValid: boolean;
  canRevoke: boolean;
  timeToExpiry: number;
}

export class TransactionStatusDto {
  @IsString()
  transactionHash: string;

  @IsString()
  walletId: string;

  @IsNumber()
  totalSigners: number;

  @IsNumber()
  requiredSignatures: number;

  @IsNumber()
  collectedSignatures: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SignatureResponseDto)
  signatures: SignatureResponseDto[];

  @IsString()
  status: 'pending' | 'ready' | 'executed' | 'expired' | 'failed';

  @IsString()
  canExecute: boolean;

  @IsNumber()
  timeToExpiry: number;
}

export class RecoveryStatusDto {
  @IsString()
  walletId: string;

  @IsEnum(WalletStatus)
  status: WalletStatus;

  @IsNumber()
  recoveryProgress: number;

  @IsNumber()
  requiredRecoverySignatures: number;

  @IsNumber()
  collectedRecoverySignatures: number;

  @IsString()
  recoveryInitiatedBy: string;

  @IsString()
  recoveryInitiatedAt: Date;

  @IsOptional()
  @IsString()
  completedAt?: Date;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SignatureResponseDto)
  recoverySignatures?: SignatureResponseDto[];
}

export class MultisigQueryDto {
  @IsOptional()
  @IsString()
  walletId?: string;

  @IsOptional()
  @IsEnum(WalletStatus)
  status?: WalletStatus;

  @IsOptional()
  @IsString()
  signerId?: string;

  @IsOptional()
  @IsEnum(TransactionType)
  transactionType?: TransactionType;

  @IsOptional()
  @IsEnum(SignatureStatus)
  signatureStatus?: SignatureStatus;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}
