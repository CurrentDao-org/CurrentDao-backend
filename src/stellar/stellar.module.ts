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
import { ContractInteractionService } from './contracts/contract-interaction.service';
import { TransactionProcessorService } from './transactions/transaction-processor.service';
import { EventListenerService } from './events/event-listener.service';
import { SorobanContractService } from './soroban/soroban-contract.service';
import { BlockchainMonitorService } from './monitoring/blockchain-monitor.service';

@Module({
  imports: [ConfigModule],
  controllers: [StellarController],
  providers: [
    StellarService,
    FreighterWalletService,
    AlbedoWalletService,
    ContractInteractionService,
    TransactionProcessorService,
    EventListenerService,
    SorobanContractService,
    BlockchainMonitorService,
  ],
  exports: [
    StellarService,
    ContractInteractionService,
    TransactionProcessorService,
    EventListenerService,
    SorobanContractService,
    BlockchainMonitorService,
  ],
})
export class StellarModule {}
