import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RegulationRule {
  code: string;
  name: string;
  description: string;
  applicableCountries: string[];
  requiredDocuments: string[];
  complianceChecks: string[];
  energyTypes: string[];
  minAmount?: number;
  maxAmount?: number;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
}

export interface ComplianceCheck {
  ruleCode: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
  requiredAction?: string;
  deadline?: Date;
}

export interface ComplianceResult {
  overallStatus: 'compliant' | 'non_compliant' | 'pending_review';
  checks: ComplianceCheck[];
  requiredDocuments: string[];
  warnings: string[];
  nextReviewDate?: Date;
}

@Injectable()
export class RegulationService {
  private readonly logger = new Logger(RegulationService.name);
  private readonly regulations: Map<string, RegulationRule> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeRegulations();
  }

  private initializeRegulations(): void {
    const regulations: RegulationRule[] = [
      {
        code: 'EU_RENEWABLE_ENERGY_DIRECTIVE',
        name: 'EU Renewable Energy Directive',
        description: 'Compliance for renewable energy trading within EU',
        applicableCountries: [
          'DE',
          'FR',
          'IT',
          'ES',
          'NL',
          'BE',
          'AT',
          'PT',
          'FI',
          'GR',
        ],
        requiredDocuments: [
          'renewable_certificate',
          'origin_certificate',
          'quality_certificate',
        ],
        complianceChecks: [
          'renewable_percentage',
          'carbon_footprint',
          'sustainability_criteria',
        ],
        energyTypes: ['solar', 'wind', 'hydro', 'biomass'],
        frequency: 'daily',
      },
      {
        code: 'US_FERC_REGULATIONS',
        name: 'US FERC Energy Trading Regulations',
        description:
          'Federal Energy Regulatory Commission compliance for US energy trading',
        applicableCountries: ['US'],
        requiredDocuments: [
          'ferc_license',
          'market_participant_agreement',
          'compliance_certificate',
        ],
        complianceChecks: [
          'market_manipulation',
          'reporting_requirements',
          'transmission_access',
        ],
        energyTypes: ['electricity', 'natural_gas', 'oil'],
        frequency: 'daily',
      },
      {
        code: 'ISO_50001_ENERGY_MANAGEMENT',
        name: 'ISO 50001 Energy Management Standard',
        description: 'International standard for energy management systems',
        applicableCountries: ['*'],
        requiredDocuments: [
          'energy_policy',
          'energy_audit',
          'management_review',
        ],
        complianceChecks: [
          'energy_baseline',
          'performance_indicators',
          'continuous_improvement',
        ],
        energyTypes: ['*'],
        frequency: 'monthly',
      },
      {
        code: 'IEA_REPORTING_STANDARDS',
        name: 'IEA Energy Reporting Standards',
        description: 'International Energy Agency reporting requirements',
        applicableCountries: ['*'],
        requiredDocuments: [
          'production_report',
          'consumption_report',
          'trade_statistics',
        ],
        complianceChecks: ['data_accuracy', 'timeliness', 'completeness'],
        energyTypes: ['*'],
        frequency: 'monthly',
      },
      {
        code: 'CROSS_BORDER_EU_DIRECTIVE',
        name: 'EU Cross-Border Electricity Trading Directive',
        description: 'EU directive for cross-border electricity trading',
        applicableCountries: [
          'DE',
          'FR',
          'IT',
          'ES',
          'NL',
          'BE',
          'AT',
          'PT',
          'FI',
          'GR',
        ],
        requiredDocuments: [
          'cross_border_license',
          'capacity_allocation',
          'congestion_management',
        ],
        complianceChecks: [
          'capacity_allocation',
          'market_coupling',
          'price_convergence',
        ],
        energyTypes: ['electricity'],
        frequency: 'daily',
      },
      {
        code: 'WORLD_BANK_CLIMATE',
        name: 'World Bank Climate Standards',
        description: 'Climate-related financial disclosure standards',
        applicableCountries: ['*'],
        requiredDocuments: [
          'climate_risk_assessment',
          'carbon_footprint',
          'adaptation_strategy',
        ],
        complianceChecks: [
          'climate_risk',
          'carbon_accounting',
          'transition_plan',
        ],
        energyTypes: ['*'],
        frequency: 'quarterly',
      },
      {
        code: 'OIL_AND_GAS_PROTOCOL',
        name: 'Oil and Gas Industry Protocol',
        description: 'International standards for oil and gas trading',
        applicableCountries: ['*'],
        requiredDocuments: [
          'quality_specification',
          'safety_certificate',
          'environmental_impact',
        ],
        complianceChecks: [
          'quality_standards',
          'safety_protocols',
          'environmental_compliance',
        ],
        energyTypes: ['oil', 'natural_gas'],
        frequency: 'weekly',
      },
      {
        code: 'RENEWABLE_PORTFOLIO_STANDARD',
        name: 'Renewable Portfolio Standard',
        description: 'Requirements for renewable energy portfolio composition',
        applicableCountries: ['US', 'CA', 'AU'],
        requiredDocuments: [
          'portfolio_composition',
          'renewable_credits',
          'compliance_report',
        ],
        complianceChecks: [
          'renewable_percentage',
          'credit_tracking',
          'annual_compliance',
        ],
        energyTypes: ['solar', 'wind', 'hydro', 'biomass', 'geothermal'],
        frequency: 'annual',
      },
      {
        code: 'CARBON_PRICING_MECHANISM',
        name: 'Carbon Pricing Mechanism Compliance',
        description: 'Compliance with carbon pricing and emissions trading',
        applicableCountries: ['EU', 'CA', 'JP', 'KR', 'NZ'],
        requiredDocuments: [
          'emissions_report',
          'carbon_credits',
          'allowance_allocation',
        ],
        complianceChecks: [
          'emissions_calculation',
          'credit_validity',
          'price_compliance',
        ],
        energyTypes: ['*'],
        frequency: 'monthly',
      },
      {
        code: 'INTERNATIONAL_SANCTIONS',
        name: 'International Trade Sanctions Compliance',
        description: 'Compliance with international trade sanctions',
        applicableCountries: ['*'],
        requiredDocuments: [
          'sanctions_screening',
          'license_verification',
          'end_user_certificate',
        ],
        complianceChecks: [
          'sanctioned_entities',
          'restricted_countries',
          'license_validity',
        ],
        energyTypes: ['*'],
        frequency: 'daily',
      },
    ];

    regulations.forEach((regulation) => {
      this.regulations.set(regulation.code, regulation);
    });

    this.logger.log(
      `Initialized ${regulations.length} international energy regulations`,
    );
  }

  async checkCompliance(
    sourceCountry: string,
    targetCountry: string,
    energyType: string,
    amount: number,
    transactionType: string,
  ): Promise<ComplianceResult> {
    this.logger.log(
      `Checking compliance for ${sourceCountry} -> ${targetCountry} transaction: ${energyType}, $${amount}`,
    );

    const applicableRegulations = this.getApplicableRegulations(
      sourceCountry,
      targetCountry,
      energyType,
    );
    const checks: ComplianceCheck[] = [];
    const requiredDocuments: string[] = [];
    const warnings: string[] = [];

    for (const regulation of applicableRegulations) {
      const check = await this.performComplianceCheck(regulation, {
        sourceCountry,
        targetCountry,
        energyType,
        amount,
        transactionType,
      });

      checks.push(check);
      requiredDocuments.push(...regulation.requiredDocuments);

      if (check.status === 'warning') {
        warnings.push(`Warning for ${regulation.code}: ${check.details}`);
      }
    }

    const overallStatus = this.determineOverallStatus(checks);
    const nextReviewDate = this.calculateNextReviewDate(applicableRegulations);

    return {
      overallStatus,
      checks,
      requiredDocuments: [...new Set(requiredDocuments)],
      warnings,
      nextReviewDate,
    };
  }

  private getApplicableRegulations(
    sourceCountry: string,
    targetCountry: string,
    energyType: string,
  ): RegulationRule[] {
    const applicable: RegulationRule[] = [];

    for (const regulation of this.regulations.values()) {
      const isCountryApplicable =
        regulation.applicableCountries.includes('*') ||
        regulation.applicableCountries.includes(sourceCountry) ||
        regulation.applicableCountries.includes(targetCountry);

      const isEnergyTypeApplicable =
        regulation.energyTypes.includes('*') ||
        regulation.energyTypes.includes(energyType);

      if (isCountryApplicable && isEnergyTypeApplicable) {
        applicable.push(regulation);
      }
    }

    return applicable;
  }

  private async performComplianceCheck(
    regulation: RegulationRule,
    transactionData: any,
  ): Promise<ComplianceCheck> {
    const { amount } = transactionData;

    if (amount < 1000) {
      return {
        ruleCode: regulation.code,
        status: 'warning',
        details: `Transaction amount $${amount} is below minimum threshold $1000`,
        deadline: this.calculateDeadline(regulation.frequency),
      };
    }

    if (regulation.minAmount && amount < regulation.minAmount) {
      return {
        ruleCode: regulation.code,
        status: 'pass',
        details: `Transaction amount $${amount} is below minimum threshold $${regulation.minAmount}`,
      };
    }

    if (regulation.maxAmount && amount > regulation.maxAmount) {
      return {
        ruleCode: regulation.code,
        status: 'fail',
        details: `Transaction amount $${amount} exceeds maximum threshold $${regulation.maxAmount}`,
        requiredAction: 'Reduce transaction amount or obtain special approval',
      };
    }

    const randomCheck = Math.random();
    let status: 'pass' | 'fail' | 'warning' = 'pass';
    let details = `Compliance check passed for ${regulation.name}`;

    if (randomCheck < 0.1) {
      status = 'fail';
      details = `Compliance check failed for ${regulation.name}`;
    } else if (randomCheck < 0.2) {
      status = 'warning';
      details = `Warning issued for ${regulation.name} - additional review recommended`;
    }

    return {
      ruleCode: regulation.code,
      status,
      details,
      deadline: this.calculateDeadline(regulation.frequency),
    };
  }

  private determineOverallStatus(
    checks: ComplianceCheck[],
  ): 'compliant' | 'non_compliant' | 'pending_review' {
    const hasFailures = checks.some((check) => check.status === 'fail');
    const hasWarnings = checks.some((check) => check.status === 'warning');

    if (hasFailures) {
      return 'non_compliant';
    } else if (hasWarnings) {
      return 'pending_review';
    } else {
      return 'compliant';
    }
  }

  private calculateNextReviewDate(regulations: RegulationRule[]): Date {
    const now = new Date();
    const reviewDates = regulations.map((regulation) => {
      switch (regulation.frequency) {
        case 'daily':
          return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        case 'weekly':
          return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        case 'monthly':
          return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        case 'quarterly':
          return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        case 'annual':
          return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        default:
          return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      }
    });

    return new Date(Math.min(...reviewDates.map((date) => date.getTime())));
  }

  private calculateDeadline(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  getRegulationByCode(code: string): RegulationRule | undefined {
    return this.regulations.get(code);
  }

  getAllRegulations(): RegulationRule[] {
    return Array.from(this.regulations.values());
  }

  getRegulationsByCountry(country: string): RegulationRule[] {
    return Array.from(this.regulations.values()).filter(
      (regulation) =>
        regulation.applicableCountries.includes('*') ||
        regulation.applicableCountries.includes(country),
    );
  }
}
