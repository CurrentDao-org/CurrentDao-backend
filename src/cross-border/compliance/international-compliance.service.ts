import { Injectable } from '@nestjs/common';

@Injectable()
export class InternationalComplianceService {
  private readonly countryRegulations = new Map<string, any>();

  constructor() {
    this.initializeRegulations();
  }

  private initializeRegulations() {
    this.countryRegulations.set('US', {
      maxTradeAmount: 1000000,
      requiredDocuments: ['passport', 'tax_id', 'bank_statement'],
      restrictedCountries: ['IR', 'KP', 'CU'],
      taxRate: 0.30,
      regulatoryBody: 'SEC',
      complianceLevel: 'high',
    });

    this.countryRegulations.set('EU', {
      maxTradeAmount: 500000,
      requiredDocuments: ['passport', 'eu_residence', 'tax_id'],
      restrictedCountries: ['RU', 'BY'],
      taxRate: 0.25,
      regulatoryBody: 'ESMA',
      complianceLevel: 'high',
    });

    this.countryRegulations.set('UK', {
      maxTradeAmount: 750000,
      requiredDocuments: ['passport', 'uk_residence', 'tax_id'],
      restrictedCountries: ['IR', 'KP'],
      taxRate: 0.28,
      regulatoryBody: 'FCA',
      complianceLevel: 'high',
    });

    this.countryRegulations.set('JP', {
      maxTradeAmount: 2000000,
      requiredDocuments: ['passport', 'residence_card', 'tax_id'],
      restrictedCountries: ['KP'],
      taxRate: 0.23,
      regulatoryBody: 'FSA',
      complianceLevel: 'medium',
    });

    this.countryRegulations.set('SG', {
      maxTradeAmount: 1500000,
      requiredDocuments: ['passport', 'work_permit', 'tax_id'],
      restrictedCountries: [],
      taxRate: 0.22,
      regulatoryBody: 'MAS',
      complianceLevel: 'medium',
    });
  }

  async validateTrade(tradeData: any): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    const { buyerCountry, sellerCountry, amount, traderCountry } = tradeData;

    // Check geographic restrictions
    const buyerRestrictions = this.getCountryRegulations(buyerCountry);
    const sellerRestrictions = this.getCountryRegulations(sellerCountry);

    if (buyerRestrictions.restrictedCountries.includes(sellerCountry)) {
      issues.push(`Trading from ${sellerCountry} to ${buyerCountry} is restricted`);
    }

    if (sellerRestrictions.restrictedCountries.includes(buyerCountry)) {
      issues.push(`Trading from ${buyerCountry} to ${sellerCountry} is restricted`);
    }

    // Check trade amount limits
    const traderRegulations = this.getCountryRegulations(traderCountry);
    if (amount > traderRegulations.maxTradeAmount) {
      issues.push(`Trade amount exceeds maximum allowed for ${traderCountry}`);
    }

    // Validate required documents
    const missingDocs = this.validateRequiredDocuments(tradeData.documents, traderCountry);
    if (missingDocs.length > 0) {
      issues.push(`Missing required documents: ${missingDocs.join(', ')}`);
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  getCountryRequirements(country: string): any {
    return this.getCountryRegulations(country);
  }

  async checkComplianceLevel(country: string): Promise<string> {
    const regulations = this.getCountryRegulations(country);
    return regulations.complianceLevel;
  }

  async getRequiredDocuments(country: string): Promise<string[]> {
    const regulations = this.getCountryRegulations(country);
    return regulations.requiredDocuments;
  }

  async isCountryRestricted(fromCountry: string, toCountry: string): Promise<boolean> {
    const fromRegulations = this.getCountryRegulations(fromCountry);
    return fromRegulations.restrictedCountries.includes(toCountry);
  }

  private getCountryRegulations(country: string): any {
    const regulations = this.countryRegulations.get(country);
    if (!regulations) {
      // Default regulations for unknown countries
      return {
        maxTradeAmount: 100000,
        requiredDocuments: ['passport', 'tax_id'],
        restrictedCountries: [],
        taxRate: 0.20,
        regulatoryBody: 'Local Authority',
        complianceLevel: 'low',
      };
    }
    return regulations;
  }

  private validateRequiredDocuments(documents: string[], country: string): string[] {
    const requiredDocs = this.getCountryRegulations(country).requiredDocuments;
    return requiredDocs.filter(doc => !documents.includes(doc));
  }
}
