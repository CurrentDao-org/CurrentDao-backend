import { Injectable } from '@nestjs/common';
import { CurrencyConversionService } from './currency/currency-conversion.service';
import { InternationalComplianceService } from './compliance/international-compliance.service';
import { CrossBorderSettlementService } from './settlement/cross-border-settlement.service';
import { InternationalTaxService } from './tax/international-tax.service';
import { GlobalExchangeService } from './integration/global-exchange.service';

@Injectable()
export class CrossBorderService {
  constructor(
    private readonly currencyConversionService: CurrencyConversionService,
    private readonly complianceService: InternationalComplianceService,
    private readonly settlementService: CrossBorderSettlementService,
    private readonly taxService: InternationalTaxService,
    private readonly exchangeService: GlobalExchangeService,
  ) {}

  async executeTrade(tradeData: any) {
    // Validate compliance
    await this.complianceService.validateTrade(tradeData);
    
    // Convert currency if needed
    const convertedAmount = await this.currencyConversionService.convert(
      tradeData.amount,
      tradeData.fromCurrency,
      tradeData.toCurrency,
    );
    
    // Calculate taxes
    const taxCalculation = await this.taxService.calculateInternationalTax(
      tradeData,
      convertedAmount,
    );
    
    // Execute on global exchange
    const exchangeResult = await this.exchangeService.executeTrade(
      tradeData.exchangeId,
      {
        ...tradeData,
        amount: convertedAmount,
        tax: taxCalculation,
      },
    );
    
    return {
      success: true,
      tradeId: exchangeResult.tradeId,
      convertedAmount,
      tax: taxCalculation,
      exchange: exchangeResult,
    };
  }

  async getSupportedCurrencies() {
    return this.currencyConversionService.getSupportedCurrencies();
  }

  async getFXRates(base: string, target?: string) {
    return this.currencyConversionService.getRealTimeRates(base, target);
  }

  async processSettlement(settlementData: any) {
    return this.settlementService.processCrossBorderSettlement(settlementData);
  }

  async getComplianceRequirements(country: string) {
    return this.complianceService.getCountryRequirements(country);
  }

  async createRiskHedge(hedgeData: any) {
    return this.currencyConversionService.createHedge(hedgeData);
  }

  async getGlobalExchanges() {
    return this.exchangeService.getAvailableExchanges();
  }
}
