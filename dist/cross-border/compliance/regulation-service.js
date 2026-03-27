"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RegulationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegulationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let RegulationService = RegulationService_1 = class RegulationService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(RegulationService_1.name);
        this.regulations = new Map();
        this.initializeRegulations();
    }
    initializeRegulations() {
        const regulations = [
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
                description: 'Federal Energy Regulatory Commission compliance for US energy trading',
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
        this.logger.log(`Initialized ${regulations.length} international energy regulations`);
    }
    async checkCompliance(sourceCountry, targetCountry, energyType, amount, transactionType) {
        this.logger.log(`Checking compliance for ${sourceCountry} -> ${targetCountry} transaction: ${energyType}, $${amount}`);
        const applicableRegulations = this.getApplicableRegulations(sourceCountry, targetCountry, energyType);
        const checks = [];
        const requiredDocuments = [];
        const warnings = [];
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
    getApplicableRegulations(sourceCountry, targetCountry, energyType) {
        const applicable = [];
        for (const regulation of this.regulations.values()) {
            const isCountryApplicable = regulation.applicableCountries.includes('*') ||
                regulation.applicableCountries.includes(sourceCountry) ||
                regulation.applicableCountries.includes(targetCountry);
            const isEnergyTypeApplicable = regulation.energyTypes.includes('*') ||
                regulation.energyTypes.includes(energyType);
            if (isCountryApplicable && isEnergyTypeApplicable) {
                applicable.push(regulation);
            }
        }
        return applicable;
    }
    async performComplianceCheck(regulation, transactionData) {
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
        let status = 'pass';
        let details = `Compliance check passed for ${regulation.name}`;
        if (randomCheck < 0.1) {
            status = 'fail';
            details = `Compliance check failed for ${regulation.name}`;
        }
        else if (randomCheck < 0.2) {
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
    determineOverallStatus(checks) {
        const hasFailures = checks.some((check) => check.status === 'fail');
        const hasWarnings = checks.some((check) => check.status === 'warning');
        if (hasFailures) {
            return 'non_compliant';
        }
        else if (hasWarnings) {
            return 'pending_review';
        }
        else {
            return 'compliant';
        }
    }
    calculateNextReviewDate(regulations) {
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
    calculateDeadline(frequency) {
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
    getRegulationByCode(code) {
        return this.regulations.get(code);
    }
    getAllRegulations() {
        return Array.from(this.regulations.values());
    }
    getRegulationsByCountry(country) {
        return Array.from(this.regulations.values()).filter((regulation) => regulation.applicableCountries.includes('*') ||
            regulation.applicableCountries.includes(country));
    }
};
exports.RegulationService = RegulationService;
exports.RegulationService = RegulationService = RegulationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RegulationService);
//# sourceMappingURL=regulation-service.js.map