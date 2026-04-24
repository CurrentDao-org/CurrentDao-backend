import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { RegulationService } from './compliance/regulation-service';
import { CurrencyService } from './currency/currency-service';
import { TransactionProcessorService } from './transactions/transaction-processor.service';
import { RegulatoryReportService } from './reporting/regulatory-report.service';
import { CustomsService } from './tariffs/customs-service';
import { CrossBorderTransaction } from './entities/cross-border-transaction.entity';
import { CrossBorderController } from './controller/cross-border.controller';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([CrossBorderTransaction])],
  controllers: [CrossBorderController],
  providers: [
    RegulationService,
    CurrencyService,
    TransactionProcessorService,
    RegulatoryReportService,
    CustomsService,
  ],
  exports: [
    RegulationService,
    CurrencyService,
    TransactionProcessorService,
    RegulatoryReportService,
    CustomsService,
  ],
})
export class CrossBorderModule {}
