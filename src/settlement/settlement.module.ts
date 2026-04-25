import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettlementController } from './settlement.controller';
import { SettlementService } from './settlement.service';
import { NettingEngineService } from './netting/netting-engine.service';
import { MarginManagementService } from './margin/margin-management.service';
import { ClearingHouseService } from './clearing/clearing-house.service';
import { SettlementRiskService } from './risk/settlement-risk.service';
import { BankingIntegrationService } from './integration/banking-integration.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([]),
  ],
  controllers: [SettlementController],
  providers: [
    SettlementService,
    NettingEngineService,
    MarginManagementService,
    ClearingHouseService,
    SettlementRiskService,
    BankingIntegrationService,
  ],
  exports: [
    SettlementService,
    NettingEngineService,
    MarginManagementService,
    ClearingHouseService,
    SettlementRiskService,
    BankingIntegrationService,
  ],
})
export class SettlementModule {}
