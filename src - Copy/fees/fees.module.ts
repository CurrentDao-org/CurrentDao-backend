/**
 * Fees Module
 * 
 * Module for fee calculation and management functionality.
 */

import { Module, forwardRef } from '@nestjs/common';
import { FeesService } from './fees.service';
import { FeesController } from './fees.controller';
import { FeeCalculatorService } from './calculators/fee-calculator.service';

@Module({
  imports: [],
  controllers: [FeesController],
  providers: [FeesService, FeeCalculatorService],
  exports: [FeesService, FeeCalculatorService],
})
export class FeesModule {}
