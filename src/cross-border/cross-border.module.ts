import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CrossBorderController } from './cross-border.controller';
import { CrossBorderService } from './cross-border.service';
import { CurrencyConversionService } from './currency/currency-conversion.service';
import { InternationalComplianceService } from './compliance/international-compliance.service';
import { CrossBorderSettlementService } from './settlement/cross-border-settlement.service';
import { InternationalTaxService } from './tax/international-tax.service';
import { GlobalExchangeService } from './integration/global-exchange.service';

@Module({
  imports: [ConfigModule, TypeOrmModule],
  controllers: [CrossBorderController],
  providers: [
    CrossBorderService,
    CurrencyConversionService,
    InternationalComplianceService,
    CrossBorderSettlementService,
    InternationalTaxService,
    GlobalExchangeService,
  ],
  exports: [
    CrossBorderService,
    CurrencyConversionService,
    InternationalComplianceService,
    CrossBorderSettlementService,
    InternationalTaxService,
    GlobalExchangeService,
  ],
})
export class CrossBorderModule {}
