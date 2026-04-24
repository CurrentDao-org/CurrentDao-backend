import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface TariffRate {
  hsCode: string;
  description: string;
  rate: number;
  unit: 'percentage' | 'fixed';
  minAmount?: number;
  maxAmount?: number;
  effectiveDate: Date;
  expiryDate?: Date;
}

export interface CustomsCalculation {
  hsCode: string;
  productCategory: string;
  customsValue: number;
  tariffRate: number;
  tariff: number;
  taxes: TaxCalculation[];
  totalFees: number;
  regulatoryFees: number;
  approved: boolean;
  restrictions: string[];
  requiredDocuments: string[];
  processingTime: number;
}

export interface TaxCalculation {
  type: string;
  rate: number;
  amount: number;
  description: string;
}

export interface CustomsRule {
  sourceCountry: string;
  targetCountry: string;
  productCategory: string;
  hsCode: string;
  tariffRate: number;
  additionalTaxes: TaxRate[];
  restrictions: string[];
  requiredDocuments: string[];
  specialConditions: string[];
}

export interface TaxRate {
  type: string;
  rate: number;
  description: string;
  applicableRange?: {
    min: number;
    max: number;
  };
}

@Injectable()
export class CustomsService {
  private readonly logger = new Logger(CustomsService.name);
  private readonly tariffRates: Map<string, TariffRate[]> = new Map();
  private readonly customsRules: Map<string, CustomsRule[]> = new Map();
  private readonly supportedEnergyTypes = [
    'electricity',
    'natural_gas',
    'oil',
    'coal',
    'nuclear',
    'solar',
    'wind',
    'hydro',
    'biomass',
    'geothermal',
  ];

  constructor(private configService: ConfigService) {
    this.initializeTariffRates();
    this.initializeCustomsRules();
  }

  private initializeTariffRates(): void {
    const energyTariffs: Record<string, TariffRate[]> = {
      electricity: [
        {
          hsCode: '27160000',
          description: 'Electrical energy',
          rate: 0.05,
          unit: 'percentage',
          effectiveDate: new Date('2024-01-01'),
        },
      ],
      natural_gas: [
        {
          hsCode: '27111100',
          description: 'Natural gas',
          rate: 0.08,
          unit: 'percentage',
          effectiveDate: new Date('2024-01-01'),
        },
      ],
      oil: [
        {
          hsCode: '27090000',
          description: 'Petroleum oils',
          rate: 0.12,
          unit: 'percentage',
          effectiveDate: new Date('2024-01-01'),
        },
      ],
      coal: [
        {
          hsCode: '27010000',
          description: 'Coal',
          rate: 0.15,
          unit: 'percentage',
          effectiveDate: new Date('2024-01-01'),
        },
      ],
      solar: [
        {
          hsCode: '85414000',
          description: 'Solar cells',
          rate: 0.02,
          unit: 'percentage',
          effectiveDate: new Date('2024-01-01'),
        },
      ],
      wind: [
        {
          hsCode: '85023100',
          description: 'Wind turbines',
          rate: 0.03,
          unit: 'percentage',
          effectiveDate: new Date('2024-01-01'),
        },
      ],
    };

    for (const [energyType, tariffs] of Object.entries(energyTariffs)) {
      this.tariffRates.set(energyType, tariffs);
    }

    this.logger.log(
      `Initialized tariff rates for ${Object.keys(energyTariffs).length} energy types`,
    );
  }

  private initializeCustomsRules(): void {
    const rules: CustomsRule[] = [
      {
        sourceCountry: 'US',
        targetCountry: 'EU',
        productCategory: 'energy',
        hsCode: '27160000',
        tariffRate: 0.05,
        additionalTaxes: [
          { type: 'VAT', rate: 0.21, description: 'Value Added Tax' },
          { type: 'Excise', rate: 0.02, description: 'Energy Excise Tax' },
        ],
        restrictions: ['export_license_required'],
        requiredDocuments: [
          'certificate_of_origin',
          'quality_certificate',
          'export_license',
        ],
        specialConditions: ['renewable_energy_preferred'],
      },
      {
        sourceCountry: 'EU',
        targetCountry: 'US',
        productCategory: 'energy',
        hsCode: '27160000',
        tariffRate: 0.06,
        additionalTaxes: [
          { type: 'Import', rate: 0.025, description: 'Import Duty' },
          { type: 'Excise', rate: 0.01, description: 'Federal Excise Tax' },
        ],
        restrictions: ['ferc_approval_required'],
        requiredDocuments: [
          'certificate_of_origin',
          'ferc_approval',
          'quality_certificate',
        ],
        specialConditions: ['market_participant_verification'],
      },
      {
        sourceCountry: 'CN',
        targetCountry: 'EU',
        productCategory: 'energy',
        hsCode: '27160000',
        tariffRate: 0.08,
        additionalTaxes: [
          { type: 'VAT', rate: 0.21, description: 'Value Added Tax' },
          { type: 'AntiDumping', rate: 0.15, description: 'Anti-Dumping Duty' },
        ],
        restrictions: ['quota_limitations', 'quality_standards'],
        requiredDocuments: [
          'certificate_of_origin',
          'quality_certificate',
          'import_license',
        ],
        specialConditions: ['carbon_border_adjustment'],
      },
      {
        sourceCountry: 'EU',
        targetCountry: 'CN',
        productCategory: 'energy',
        hsCode: '27160000',
        tariffRate: 0.1,
        additionalTaxes: [
          { type: 'VAT', rate: 0.13, description: 'Value Added Tax' },
          { type: 'Consumption', rate: 0.05, description: 'Consumption Tax' },
        ],
        restrictions: ['foreign_exchange_approval'],
        requiredDocuments: [
          'certificate_of_origin',
          'foreign_exchange_approval',
          'quality_certificate',
        ],
        specialConditions: ['state_grid_compliance'],
      },
    ];

    for (const rule of rules) {
      const key = `${rule.sourceCountry}-${rule.targetCountry}`;
      if (!this.customsRules.has(key)) {
        this.customsRules.set(key, []);
      }
      this.customsRules.get(key).push(rule);
    }

    this.logger.log(
      `Initialized customs rules for ${rules.length} country pairs`,
    );
  }

  async calculateCustomsAndTariffs(
    sourceCountry: string,
    targetCountry: string,
    amount: number,
    currency: string,
    energyType: string,
    customsData?: any,
  ): Promise<CustomsCalculation> {
    const startTime = Date.now();
    this.logger.log(
      `Calculating customs for ${sourceCountry} -> ${targetCountry}: ${energyType}, ${amount} ${currency}`,
    );

    try {
      const hsCode = customsData?.hsCode || this.getDefaultHSCode(energyType);
      const productCategory = customsData?.productCategory || energyType;
      const customsValue = await this.convertToUSD(amount, currency);

      const tariffRate = await this.getTariffRate(
        hsCode,
        sourceCountry,
        targetCountry,
      );
      const tariff = customsValue * tariffRate.rate;

      const taxes = await this.calculateTaxes(
        customsValue,
        sourceCountry,
        targetCountry,
        energyType,
      );
      const totalTaxes = taxes.reduce((sum, tax) => sum + tax.amount, 0);

      const regulatoryFees = await this.calculateRegulatoryFees(
        customsValue,
        sourceCountry,
        targetCountry,
        energyType,
      );

      const restrictions = await this.checkRestrictions(
        sourceCountry,
        targetCountry,
        energyType,
      );
      const requiredDocuments = await this.getRequiredDocuments(
        sourceCountry,
        targetCountry,
        energyType,
      );

      const approved = restrictions.length === 0 && tariffRate.rate > 0;

      const result: CustomsCalculation = {
        hsCode,
        productCategory,
        customsValue,
        tariffRate: tariffRate.rate,
        tariff,
        taxes,
        totalFees: tariff + totalTaxes + regulatoryFees,
        regulatoryFees,
        approved,
        restrictions,
        requiredDocuments,
        processingTime: Date.now() - startTime,
      };

      this.logger.log(
        `Customs calculation completed in ${result.processingTime}ms`,
      );
      return result;
    } catch (error) {
      this.logger.error('Customs calculation failed:', error);
      throw error;
    }
  }

  private getDefaultHSCode(energyType: string): string {
    const hsCodes: Record<string, string> = {
      electricity: '27160000',
      natural_gas: '27111100',
      oil: '27090000',
      coal: '27010000',
      solar: '85414000',
      wind: '85023100',
      hydro: '85023900',
      biomass: '44013000',
      geothermal: '85024000',
      nuclear: '84012000',
    };

    return hsCodes[energyType] || '27160000';
  }

  private async convertToUSD(
    amount: number,
    currency: string,
  ): Promise<number> {
    if (currency === 'USD') {
      return amount;
    }

    try {
      const apiKey = this.configService.get<string>('EXCHANGE_RATE_API_KEY');
      if (apiKey) {
        const response = await axios.get(
          `https://open.er-api.com/v6/latest/USD?apikey=${apiKey}`,
        );
        const rate = response.data.rates[currency];
        if (rate) {
          return amount / rate;
        }
      }
    } catch (error) {
      this.logger.warn('Failed to get exchange rate, using mock conversion');
    }

    const mockRates: Record<string, number> = {
      EUR: 0.92,
      GBP: 0.79,
      JPY: 149.5,
      CNY: 7.24,
      INR: 83.12,
      AUD: 1.53,
      CAD: 1.36,
      CHF: 0.88,
    };

    const rate = mockRates[currency] || 1;
    return amount / rate;
  }

  private async getTariffRate(
    hsCode: string,
    sourceCountry: string,
    targetCountry: string,
  ): Promise<TariffRate> {
    const key = `${sourceCountry}-${targetCountry}`;
    const rules = this.customsRules.get(key);

    if (rules && rules.length > 0) {
      const rule = rules.find((r) => r.hsCode === hsCode);
      if (rule) {
        return {
          hsCode,
          description: `${rule.productCategory} tariff`,
          rate: rule.tariffRate,
          unit: 'percentage',
          effectiveDate: new Date(),
        };
      }
    }

    return {
      hsCode,
      description: 'Standard energy tariff',
      rate: 0.05,
      unit: 'percentage',
      effectiveDate: new Date(),
    };
  }

  private async calculateTaxes(
    customsValue: number,
    sourceCountry: string,
    targetCountry: string,
    energyType: string,
  ): Promise<TaxCalculation[]> {
    const key = `${sourceCountry}-${targetCountry}`;
    const rules = this.customsRules.get(key);

    if (!rules || rules.length === 0) {
      return this.getDefaultTaxes(targetCountry);
    }

    const taxes: TaxCalculation[] = [];
    const rule = rules[0];

    for (const taxRate of rule.additionalTaxes) {
      const amount = customsValue * taxRate.rate;

      if (taxRate.applicableRange) {
        if (
          customsValue < taxRate.applicableRange.min ||
          customsValue > taxRate.applicableRange.max
        ) {
          continue;
        }
      }

      taxes.push({
        type: taxRate.type,
        rate: taxRate.rate,
        amount,
        description: taxRate.description,
      });
    }

    return taxes;
  }

  private getDefaultTaxes(targetCountry: string): TaxCalculation[] {
    const defaultTaxes: Record<string, TaxCalculation[]> = {
      EU: [
        { type: 'VAT', rate: 0.21, amount: 0, description: 'Value Added Tax' },
      ],
      US: [
        { type: 'Import', rate: 0.025, amount: 0, description: 'Import Duty' },
      ],
      CN: [
        { type: 'VAT', rate: 0.13, amount: 0, description: 'Value Added Tax' },
      ],
    };

    return defaultTaxes[targetCountry] || [];
  }

  private async calculateRegulatoryFees(
    customsValue: number,
    sourceCountry: string,
    targetCountry: string,
    energyType: string,
  ): Promise<number> {
    let fees = 0;

    if (sourceCountry === 'US' || targetCountry === 'US') {
      fees += 50; // FERC processing fee
    }

    if (sourceCountry === 'EU' || targetCountry === 'EU') {
      fees += 75; // EU energy market fee
    }

    if (['solar', 'wind', 'hydro'].includes(energyType)) {
      fees *= 0.5; // 50% discount for renewable energy
    }

    return Math.max(fees, 25); // Minimum regulatory fee
  }

  private async checkRestrictions(
    sourceCountry: string,
    targetCountry: string,
    energyType: string,
  ): Promise<string[]> {
    const key = `${sourceCountry}-${targetCountry}`;
    const rules = this.customsRules.get(key);

    if (!rules || rules.length === 0) {
      return [];
    }

    const restrictions: string[] = [];
    const rule = rules[0];

    restrictions.push(...rule.restrictions);

    if (energyType === 'nuclear') {
      restrictions.push('nuclear_safety_approval', 'international_safeguards');
    }

    if (energyType === 'coal') {
      restrictions.push('environmental_impact_assessment');
    }

    return restrictions;
  }

  private async getRequiredDocuments(
    sourceCountry: string,
    targetCountry: string,
    energyType: string,
  ): Promise<string[]> {
    const key = `${sourceCountry}-${targetCountry}`;
    const rules = this.customsRules.get(key);

    const documents = [
      'certificate_of_origin',
      'commercial_invoice',
      'packing_list',
    ];

    if (rules && rules.length > 0) {
      documents.push(...rules[0].requiredDocuments);
    }

    if (
      ['solar', 'wind', 'hydro', 'biomass', 'geothermal'].includes(energyType)
    ) {
      documents.push('renewable_energy_certificate');
    }

    if (energyType === 'nuclear') {
      documents.push(
        'nuclear_safety_certificate',
        'material_handling_procedures',
      );
    }

    return [...new Set(documents)];
  }

  getTariffRatesByEnergyType(energyType: string): TariffRate[] {
    return this.tariffRates.get(energyType) || [];
  }

  getCustomsRulesByCountryPair(
    sourceCountry: string,
    targetCountry: string,
  ): CustomsRule[] {
    const key = `${sourceCountry}-${targetCountry}`;
    return this.customsRules.get(key) || [];
  }

  async validateCustomsData(customsData: any): Promise<boolean> {
    if (!customsData.hsCode || !customsData.productCategory) {
      return false;
    }

    const hsCodePattern = /^\d{8}$/;
    if (!hsCodePattern.test(customsData.hsCode)) {
      return false;
    }

    return true;
  }

  getSupportedEnergyTypes(): string[] {
    return [...this.supportedEnergyTypes];
  }

  async estimateProcessingTime(
    sourceCountry: string,
    targetCountry: string,
    energyType: string,
  ): Promise<number> {
    let baseTime = 30 * 60 * 1000; // 30 minutes base time

    if (sourceCountry === 'US' || targetCountry === 'US') {
      baseTime += 15 * 60 * 1000; // Additional 15 minutes for US processing
    }

    if (sourceCountry === 'EU' || targetCountry === 'EU') {
      baseTime += 10 * 60 * 1000; // Additional 10 minutes for EU processing
    }

    if (energyType === 'nuclear') {
      baseTime *= 2; // Double time for nuclear
    }

    if (['solar', 'wind', 'hydro'].includes(energyType)) {
      baseTime *= 0.7; // 30% faster for renewables
    }

    return baseTime;
  }
}
