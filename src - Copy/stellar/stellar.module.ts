/**
 * Stellar Module
 * 
 * Module for Stellar blockchain integration.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StellarService } from './stellar.service';
import { StellarController } from './stellar.controller';
import { FreighterWalletService } from './wallets/freighter.wallet';
import { AlbedoWalletService } from './wallets/albedo.wallet';

@Module({
  imports: [ConfigModule],
  controllers: [StellarController],
  providers: [StellarService, FreighterWalletService, AlbedoWalletService],
  exports: [StellarService],
})
export class StellarModule {}
