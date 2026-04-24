import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ContractNetwork, ContractType } from '../entities/contract.entity';

export enum ContractInvocationMode {
  READ_ONLY = 'read_only',
  SIGNED = 'signed',
}

export class ContractCallDto {
  @IsEnum(ContractType)
  contractType: ContractType;

  @IsString()
  method: string;

  @IsArray()
  @IsOptional()
  args?: unknown[];

  @IsEnum(ContractInvocationMode)
  @IsOptional()
  mode?: ContractInvocationMode;

  @IsEnum(ContractNetwork)
  @IsOptional()
  network?: ContractNetwork;

  @IsBoolean()
  @IsOptional()
  simulateOnly?: boolean;

  @IsString()
  @IsOptional()
  signerSecretKey?: string;

  @IsString()
  @IsOptional()
  sourcePublicKey?: string;

  @IsString()
  @IsOptional()
  correlationId?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsBoolean()
  @IsOptional()
  useCache?: boolean;

  @IsNumber()
  @Min(1)
  @IsOptional()
  timeoutInSeconds?: number;
}

export class ContractEventListenerDto {
  @IsEnum(ContractType)
  contractType: ContractType;

  @IsEnum(ContractNetwork)
  @IsOptional()
  network?: ContractNetwork;

  @IsNumber()
  @Min(0)
  @IsOptional()
  startLedger?: number;
}

export class ContractDeploymentDto {
  @IsEnum(ContractType)
  contractType: ContractType;

  @IsEnum(ContractNetwork)
  @IsOptional()
  network?: ContractNetwork;

  @IsString()
  @IsOptional()
  alias?: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsString()
  @IsOptional()
  contractId?: string;

  @IsString()
  @IsOptional()
  prebuiltTransactionXdr?: string;

  @IsString()
  @IsOptional()
  deploymentTxHash?: string;

  @IsString()
  @IsOptional()
  signerSecretKey?: string;

  @IsObject()
  @IsOptional()
  abi?: Record<string, any>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsObject()
  @IsOptional()
  deploymentMetadata?: Record<string, any>;
}

export class ContractUpgradeDto extends ContractDeploymentDto {
  @IsString()
  previousContractId: string;

  @IsBoolean()
  @IsOptional()
  activate?: boolean;
}
