import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export const SUPPORTED_CHAINS = ['stellar', 'ethereum', 'polygon'] as const;
export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];

export enum BridgeTransactionStatus {
  INITIATED = 'initiated',
  ROUTING = 'routing',
  VALIDATING = 'validating',
  FUNDING = 'funding',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

export class CreateBridgeTransactionDto {
  @IsString()
  sourceChain: SupportedChain;

  @IsString()
  targetChain: SupportedChain;

  @IsString()
  sourceAsset: string;

  @IsString()
  targetAsset: string;

  @IsNumber()
  @Min(0.00000001)
  amount: number;

  @IsString()
  fromAddress: string;

  @IsString()
  toAddress: string;

  @IsOptional()
  @IsString()
  memo?: string;
}

export class BridgeTransactionResponse {
  id: string;
  transactionId: string;
  sourceChain: SupportedChain;
  targetChain: SupportedChain;
  sourceAsset: string;
  targetAsset: string;
  amount: number;
  estimatedFee: number;
  status: BridgeTransactionStatus;
  message?: string;
}
