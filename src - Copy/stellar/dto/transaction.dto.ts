/**
 * Transaction DTO
 * 
 * DTO for Stellar transaction operations.
 */

import { IsString, IsEnum, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NetworkType {
  TESTNET = 'testnet',
  MAINNET = 'mainnet',
}

export class SignTransactionDto {
  @ApiProperty({ example: 'GABC...XYZ', description: 'User public key' })
  @IsString()
  @Length(56, 56)
  publicKey: string;

  @ApiProperty({ example: 'AAAAAgAAA...', description: 'Transaction XDR to sign' })
  @IsString()
  transactionXdr: string;

  @ApiPropertyOptional({ description: 'Network passphrase' })
  @IsOptional()
  @IsString()
  networkPassphrase?: string;
}

export class SubmitTransactionDto {
  @ApiProperty({ example: 'signed_transaction_xdr_here', description: 'Signed transaction XDR' })
  @IsString()
  signedTransactionXdr: string;

  @ApiPropertyOptional({ enum: NetworkType, example: NetworkType.TESTNET, description: 'Network type' })
  @IsOptional()
  @IsEnum(NetworkType)
  network?: NetworkType;
}

export class CheckBalanceDto {
  @ApiProperty({ example: 'GABC...XYZ', description: 'Stellar public key' })
  @IsString()
  @Length(56, 56)
  publicKey: string;

  @ApiPropertyOptional({ example: 'USD', description: 'Asset code' })
  @IsOptional()
  @IsString()
  @Length(1, 12)
  assetCode?: string;

  @ApiPropertyOptional({ example: 'GXXX...YYY', description: 'Asset issuer' })
  @IsOptional()
  @IsString()
  @Length(56, 56)
  assetIssuer?: string;
}
