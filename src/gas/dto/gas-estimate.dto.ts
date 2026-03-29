import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContractNetwork } from '../../contracts/entities/contract.entity';

export enum GasPriorityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export class GasEstimateRequestDto {
  @ApiProperty({ description: 'Target Stellar network', enum: ContractNetwork })
  @IsEnum(ContractNetwork)
  network: ContractNetwork;

  @ApiPropertyOptional({
    description: 'Contract ID to estimate gas for',
    example: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  })
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiPropertyOptional({
    description: 'Contract method to invoke',
    example: 'transfer',
  })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({
    description: 'Priority level for fee optimization',
    enum: GasPriorityLevel,
    default: GasPriorityLevel.MEDIUM,
  })
  @IsOptional()
  @IsEnum(GasPriorityLevel)
  priority?: GasPriorityLevel = GasPriorityLevel.MEDIUM;

  @ApiPropertyOptional({
    description: 'Whether to include batching recommendations',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeBatchingRecommendation?: boolean = false;
}

export class BatchEstimateRequestDto {
  @ApiProperty({ description: 'Target Stellar network', enum: ContractNetwork })
  @IsEnum(ContractNetwork)
  network: ContractNetwork;

  @ApiProperty({
    description: 'Transaction IDs or operation descriptors to batch',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  operationIds: string[];

  @ApiPropertyOptional({
    description: 'Maximum transactions per batch',
    minimum: 2,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(2)
  @Max(100)
  maxBatchSize?: number = 10;
}

export class BatchingRecommendationDto {
  @ApiProperty({ description: 'Whether batching is recommended' })
  recommended: boolean;

  @ApiProperty({ description: 'Estimated savings in stroops when batching' })
  estimatedSavingsStroops: number;

  @ApiProperty({ description: 'Savings percentage versus individual txns' })
  savingsPercentage: number;

  @ApiProperty({ description: 'Recommended batch size' })
  recommendedBatchSize: number;
}

export class GasEstimateResponseDto {
  @ApiProperty({ description: 'Stellar network this estimate applies to' })
  network: ContractNetwork;

  @ApiProperty({ description: 'Estimated CPU instructions' })
  cpuInstructions: number;

  @ApiProperty({ description: 'Estimated read bytes' })
  readBytes: number;

  @ApiProperty({ description: 'Estimated write bytes' })
  writeBytes: number;

  @ApiProperty({ description: 'Minimum resource fee in stroops' })
  minResourceFee: string;

  @ApiProperty({ description: 'Recommended fee (min * multiplier) in stroops' })
  recommendedFee: string;

  @ApiProperty({ description: 'Optimized fee based on network conditions' })
  optimizedFee: string;

  @ApiProperty({ description: 'Priority level used for this estimate' })
  priority: GasPriorityLevel;

  @ApiProperty({ description: 'Estimated confirmation time in ledgers' })
  estimatedConfirmationLedgers: number;

  @ApiProperty({ description: 'Milliseconds taken to produce this estimate' })
  estimationDurationMs: number;

  @ApiPropertyOptional({ description: 'Batching recommendation if requested' })
  batchingRecommendation?: BatchingRecommendationDto;
}

export class GasAnalyticsResponseDto {
  @ApiProperty({ description: 'Network queried' })
  network: ContractNetwork;

  @ApiProperty({ description: 'Average fee charged over the period' })
  averageFeeStroops: number;

  @ApiProperty({ description: 'Median fee charged over the period' })
  medianFeeStroops: number;

  @ApiProperty({ description: 'Average CPU instructions consumed' })
  averageCpuInstructions: number;

  @ApiProperty({ description: 'Total transactions analyzed' })
  totalTransactions: number;

  @ApiProperty({ description: 'Total savings achieved through batching' })
  totalBatchingSavingsStroops: number;

  @ApiProperty({ description: 'Percentage of transactions that were batched' })
  batchingAdoptionRate: number;

  @ApiProperty({ description: 'Start of the analysis window' })
  periodStart: Date;

  @ApiProperty({ description: 'End of the analysis window' })
  periodEnd: Date;
}
