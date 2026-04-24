/**
 * Connect Wallet DTO
 * 
 * DTO for wallet connection requests.
 */

import { IsString, IsEnum, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WalletType } from '../entities/wallet.entity';

export class ConnectWalletDto {
  @ApiProperty({ example: 'FREIGHTER', enum: WalletType, description: 'Type of wallet to connect' })
  @IsEnum(WalletType)
  walletType: WalletType;

  @ApiProperty({ example: 'testnet', description: 'Network to connect to' })
  @IsString()
  @Length(1, 20)
  network: string;

  @ApiPropertyOptional({ example: 'My Trading Wallet', description: 'Optional wallet name/label' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;
}

export class WalletConnectionResponse {
  success: boolean;
  publicKey?: string;
  walletType?: WalletType;
  network?: string;
  error?: string;
  errorCode?: string;
}
