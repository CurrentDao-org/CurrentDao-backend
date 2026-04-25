import { Injectable } from '@nestjs/common';

@Injectable()
export class InternationalTaxService {
  private readonly countryTaxRates = new Map<string, any>();
  private readonly taxTreaties = new Map<string, any>();

  constructor() {
    this.initializeTaxRates();
    this.initializeTaxTreaties();
  }

  private initializeTaxRates() {
    this.countryTaxRates.set('US', {
      incomeTax: 0.30,
      capitalGainsTax: 0.20,
      withholdingTax: 0.30,
      vatTax: 0,
      transactionTax: 0.0001,
    });

    this.countryTaxRates.set('EU', {
      incomeTax: 0.25,
      capitalGainsTax: 0.15,
      withholdingTax: 0.25,
      vatTax: 0.21,
      transactionTax: 0.0002,
    });

    this.countryTaxRates.set('UK', {
      incomeTax: 0.28,
      capitalGainsTax: 0.18,
      withholdingTax: 0.28,
      vatTax: 0.20,
      transactionTax: 0.0001,
    });

    this.countryTaxRates.set('JP', {
      incomeTax: 0.23,
      capitalGainsTax: 0.15,
      withholdingTax: 0.23,
      vatTax: 0.10,
      transactionTax: 0.0003,
    });

    this.countryTaxRates.set('SG', {
      incomeTax: 0.22,
      capitalGainsTax: 0,
      withholdingTax: 0.22,
      vatTax: 0.07,
      transactionTax: 0.0001,
    });
  }

  private initializeTaxTreaties() {
    // Tax treaties to avoid double taxation
    this.taxTreaties.set('US-EU', {
      withholdingTaxReduction: 0.15,
      taxCreditAllowed: true,
      treatyBenefits: true,
    });

    this.taxTreaties.set('US-UK', {
      withholdingTaxReduction: 0.20,
      taxCreditAllowed: true,
      treatyBenefits: true,
    });

    this.taxTreaties.set('EU-JP', {
      withholdingTaxReduction: 0.10,
      taxCreditAllowed: true,
      treatyBenefits: true,
    });
  }

  async calculateInternationalTax(tradeData: any, convertedAmount: number): Promise<any> {
    const { buyerCountry, sellerCountry, tradeType, assetType } = tradeData;

    try {
      // Get tax rates for both countries
      const buyerTaxRates = this.getCountryTaxRates(buyerCountry);
      const sellerTaxRates = this.getCountryTaxRates(sellerCountry);

      // Check for tax treaty benefits
      const treatyKey = this.getTreatyKey(buyerCountry, sellerCountry);
      const treaty = this.taxTreaties.get(treatyKey);

      // Calculate different tax components
      const incomeTax = this.calculateIncomeTax(convertedAmount, buyerTaxRates, sellerTaxRates, treaty);
      const capitalGainsTax = this.calculateCapitalGainsTax(convertedAmount, buyerTaxRates, sellerTaxRates, tradeType);
      const withholdingTax = this.calculateWithholdingTax(convertedAmount, buyerTaxRates, sellerTaxRates, treaty);
      const vatTax = this.calculateVAT(convertedAmount, buyerTaxRates, sellerTaxRates, assetType);
      const transactionTax = this.calculateTransactionTax(convertedAmount, buyerTaxRates, sellerTaxRates);

      // Calculate total tax with treaty benefits
      const totalTax = incomeTax + capitalGainsTax + withholdingTax + vatTax + transactionTax;

      return {
        totalTax,
        breakdown: {
          incomeTax,
          capitalGainsTax,
          withholdingTax,
          vatTax,
          transactionTax,
        },
        treatyBenefits: treaty ? treaty.treatyBenefits : false,
        taxJurisdiction: this.determineTaxJurisdiction(buyerCountry, sellerCountry, convertedAmount),
        currency: tradeData.toCurrency || 'USD',
        effectiveTaxRate: totalTax / convertedAmount,
      };

    } catch (error) {
      throw new Error(`Tax calculation failed: ${error.message}`);
    }
  }

  async getTaxRates(country: string): Promise<any> {
    return this.getCountryTaxRates(country);
  }

  async getTaxTreatyBenefits(country1: string, country2: string): Promise<any> {
    const treatyKey = this.getTreatyKey(country1, country2);
    return this.taxTreaties.get(treatyKey) || { treatyBenefits: false };
  }

  private calculateIncomeTax(amount: number, buyerRates: any, sellerRates: any, treaty?: any): number {
    let taxRate = Math.max(buyerRates.incomeTax, sellerRates.incomeTax);
    
    if (treaty && treaty.treatyBenefits) {
      taxRate = Math.min(buyerRates.incomeTax, sellerRates.incomeTax);
    }

    return amount * taxRate;
  }

  private calculateCapitalGainsTax(amount: number, buyerRates: any, sellerRates: any, tradeType: string): number {
    if (tradeType === 'capital_gain') {
      const taxRate = Math.max(buyerRates.capitalGainsTax, sellerRates.capitalGainsTax);
      return amount * taxRate;
    }
    return 0;
  }

  private calculateWithholdingTax(amount: number, buyerRates: any, sellerRates: any, treaty?: any): number {
    let taxRate = Math.max(buyerRates.withholdingTax, sellerRates.withholdingTax);
    
    if (treaty && treaty.treatyBenefits && treaty.withholdingTaxReduction) {
      taxRate = Math.min(taxRate, treaty.withholdingTaxReduction);
    }

    return amount * taxRate;
  }

  private calculateVAT(amount: number, buyerRates: any, sellerRates: any, assetType: string): number {
    // VAT typically applies to goods and services, not financial instruments
    if (assetType === 'goods' || assetType === 'services') {
      const vatRate = Math.max(buyerRates.vatTax, sellerRates.vatTax);
      return amount * vatRate;
    }
    return 0;
  }

  private calculateTransactionTax(amount: number, buyerRates: any, sellerRates: any): number {
    const transactionTax = buyerRates.transactionTax + sellerRates.transactionTax;
    return amount * transactionTax;
  }

  private determineTaxJurisdiction(buyerCountry: string, sellerCountry: string, amount: number): string {
    // Determine primary tax jurisdiction based on amount and country
    const buyerRates = this.getCountryTaxRates(buyerCountry);
    const sellerRates = this.getCountryTaxRates(sellerCountry);

    if (buyerRates.incomeTax > sellerRates.incomeTax) {
      return buyerCountry;
    } else {
      return sellerCountry;
    }
  }

  private getCountryTaxRates(country: string): any {
    const rates = this.countryTaxRates.get(country);
    if (!rates) {
      // Default tax rates for unknown countries
      return {
        incomeTax: 0.20,
        capitalGainsTax: 0.15,
        withholdingTax: 0.20,
        vatTax: 0.15,
        transactionTax: 0.0001,
      };
    }
    return rates;
  }

  private getTreatyKey(country1: string, country2: string): string {
    return [country1, country2].sort().join('-');
  }
}
