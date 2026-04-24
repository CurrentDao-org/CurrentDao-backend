import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

// Entities
import { Currency } from './entities/currency.entity';
import { FxRate } from './entities/fx-rate.entity';
import { CurrencyAccount } from './entities/currency-account.entity';
import { CurrencyTransaction } from './entities/currency-transaction.entity';
import { CurrencyRisk } from './entities/currency-risk.entity';

// Services
import { CurrencyService } from './currency.service';
import { FxRateService } from './rates/fx-rate.service';
import { CurrencyConversionService } from './conversion/currency-conversion.service';
import { CurrencyRiskService } from './risk/currency-risk.service';
import { MultiCurrencyReportService } from './reporting/multi-currency-report.service';
import { PaymentProcessorService } from './integration/payment-processor.service';

// Controller
import { CurrencyController } from './currency.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Currency,
      FxRate,
      CurrencyAccount,
      CurrencyTransaction,
      CurrencyRisk,
    ]),
    HttpModule,
    ScheduleModule,
    ConfigModule,
  ],
  controllers: [CurrencyController],
  providers: [
    CurrencyService,
    FxRateService,
    CurrencyConversionService,
    CurrencyRiskService,
    MultiCurrencyReportService,
    PaymentProcessorService,
  ],
  exports: [
    CurrencyService,
    FxRateService,
    CurrencyConversionService,
    CurrencyRiskService,
    MultiCurrencyReportService,
    PaymentProcessorService,
  ],
})
export class CurrencyModule {}
