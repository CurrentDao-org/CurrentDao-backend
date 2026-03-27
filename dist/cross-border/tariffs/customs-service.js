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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var CustomsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
let CustomsService = CustomsService_1 = class CustomsService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(CustomsService_1.name);
        this.tariffRates = new Map();
        this.customsRules = new Map();
        this.supportedEnergyTypes = [
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
        this.initializeTariffRates();
        this.initializeCustomsRules();
    }
    initializeTariffRates() {
        const energyTariffs = {
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
        this.logger.log(`Initialized tariff rates for ${Object.keys(energyTariffs).length} energy types`);
    }
    initializeCustomsRules() {
        const rules = [
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
        this.logger.log(`Initialized customs rules for ${rules.length} country pairs`);
    }
    async calculateCustomsAndTariffs(sourceCountry, targetCountry, amount, currency, energyType, customsData) {
        const startTime = Date.now();
        this.logger.log(`Calculating customs for ${sourceCountry} -> ${targetCountry}: ${energyType}, ${amount} ${currency}`);
        try {
            const hsCode = customsData?.hsCode || this.getDefaultHSCode(energyType);
            const productCategory = customsData?.productCategory || energyType;
            const customsValue = await this.convertToUSD(amount, currency);
            const tariffRate = await this.getTariffRate(hsCode, sourceCountry, targetCountry);
            const tariff = customsValue * tariffRate.rate;
            const taxes = await this.calculateTaxes(customsValue, sourceCountry, targetCountry, energyType);
            const totalTaxes = taxes.reduce((sum, tax) => sum + tax.amount, 0);
            const regulatoryFees = await this.calculateRegulatoryFees(customsValue, sourceCountry, targetCountry, energyType);
            const restrictions = await this.checkRestrictions(sourceCountry, targetCountry, energyType);
            const requiredDocuments = await this.getRequiredDocuments(sourceCountry, targetCountry, energyType);
            const approved = restrictions.length === 0 && tariffRate.rate > 0;
            const result = {
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
            this.logger.log(`Customs calculation completed in ${result.processingTime}ms`);
            return result;
        }
        catch (error) {
            this.logger.error('Customs calculation failed:', error);
            throw error;
        }
    }
    getDefaultHSCode(energyType) {
        const hsCodes = {
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
    async convertToUSD(amount, currency) {
        if (currency === 'USD') {
            return amount;
        }
        try {
            const apiKey = this.configService.get('EXCHANGE_RATE_API_KEY');
            if (apiKey) {
                const response = await axios_1.default.get(`https://open.er-api.com/v6/latest/USD?apikey=${apiKey}`);
                const rate = response.data.rates[currency];
                if (rate) {
                    return amount / rate;
                }
            }
        }
        catch (error) {
            this.logger.warn('Failed to get exchange rate, using mock conversion');
        }
        const mockRates = {
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
    async getTariffRate(hsCode, sourceCountry, targetCountry) {
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
    async calculateTaxes(customsValue, sourceCountry, targetCountry, energyType) {
        const key = `${sourceCountry}-${targetCountry}`;
        const rules = this.customsRules.get(key);
        if (!rules || rules.length === 0) {
            return this.getDefaultTaxes(targetCountry);
        }
        const taxes = [];
        const rule = rules[0];
        for (const taxRate of rule.additionalTaxes) {
            const amount = customsValue * taxRate.rate;
            if (taxRate.applicableRange) {
                if (customsValue < taxRate.applicableRange.min ||
                    customsValue > taxRate.applicableRange.max) {
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
    getDefaultTaxes(targetCountry) {
        const defaultTaxes = {
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
    async calculateRegulatoryFees(customsValue, sourceCountry, targetCountry, energyType) {
        let fees = 0;
        if (sourceCountry === 'US' || targetCountry === 'US') {
            fees += 50;
        }
        if (sourceCountry === 'EU' || targetCountry === 'EU') {
            fees += 75;
        }
        if (['solar', 'wind', 'hydro'].includes(energyType)) {
            fees *= 0.5;
        }
        return Math.max(fees, 25);
    }
    async checkRestrictions(sourceCountry, targetCountry, energyType) {
        const key = `${sourceCountry}-${targetCountry}`;
        const rules = this.customsRules.get(key);
        if (!rules || rules.length === 0) {
            return [];
        }
        const restrictions = [];
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
    async getRequiredDocuments(sourceCountry, targetCountry, energyType) {
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
        if (['solar', 'wind', 'hydro', 'biomass', 'geothermal'].includes(energyType)) {
            documents.push('renewable_energy_certificate');
        }
        if (energyType === 'nuclear') {
            documents.push('nuclear_safety_certificate', 'material_handling_procedures');
        }
        return [...new Set(documents)];
    }
    getTariffRatesByEnergyType(energyType) {
        return this.tariffRates.get(energyType) || [];
    }
    getCustomsRulesByCountryPair(sourceCountry, targetCountry) {
        const key = `${sourceCountry}-${targetCountry}`;
        return this.customsRules.get(key) || [];
    }
    async validateCustomsData(customsData) {
        if (!customsData.hsCode || !customsData.productCategory) {
            return false;
        }
        const hsCodePattern = /^\d{8}$/;
        if (!hsCodePattern.test(customsData.hsCode)) {
            return false;
        }
        return true;
    }
    getSupportedEnergyTypes() {
        return [...this.supportedEnergyTypes];
    }
    async estimateProcessingTime(sourceCountry, targetCountry, energyType) {
        let baseTime = 30 * 60 * 1000;
        if (sourceCountry === 'US' || targetCountry === 'US') {
            baseTime += 15 * 60 * 1000;
        }
        if (sourceCountry === 'EU' || targetCountry === 'EU') {
            baseTime += 10 * 60 * 1000;
        }
        if (energyType === 'nuclear') {
            baseTime *= 2;
        }
        if (['solar', 'wind', 'hydro'].includes(energyType)) {
            baseTime *= 0.7;
        }
        return baseTime;
    }
};
exports.CustomsService = CustomsService;
exports.CustomsService = CustomsService = CustomsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CustomsService);
//# sourceMappingURL=customs-service.js.map