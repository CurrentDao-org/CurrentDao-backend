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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var HedgingStrategyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HedgingStrategyService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const risk_data_entity_1 = require("../entities/risk-data.entity");
let HedgingStrategyService = HedgingStrategyService_1 = class HedgingStrategyService {
    constructor(riskDataRepository) {
        this.riskDataRepository = riskDataRepository;
        this.logger = new common_1.Logger(HedgingStrategyService_1.name);
    }
    async createHedgingStrategy(hedgingDto) {
        this.logger.log(`Creating hedging strategy for portfolio: ${hedgingDto.portfolioId}`);
        const strategy = await this.generateOptimalHedgingStrategy(hedgingDto);
        const effectiveness = await this.calculateHedgingEffectiveness(hedgingDto, strategy);
        const cost = await this.calculateHedgingCost(strategy);
        const hedgingStrategy = {
            portfolioId: hedgingDto.portfolioId,
            strategy,
            effectiveness,
            cost,
            riskReduction: effectiveness * 0.3,
            implementation: await this.generateImplementationPlan(strategy),
            monitoring: await this.generateMonitoringPlan(strategy),
        };
        await this.updateRiskDataWithHedgingStrategy(hedgingDto.portfolioId, hedgingStrategy);
        this.logger.log(`Hedging strategy created for portfolio: ${hedgingDto.portfolioId}, Expected risk reduction: ${hedgingStrategy.riskReduction * 100}%`);
        return hedgingStrategy;
    }
    async generateOptimalHedgingStrategy(hedgingDto) {
        const { portfolioId, hedgeRatio, instrument, maturity, customParameters } = hedgingDto;
        const portfolioProfile = await this.getPortfolioProfile(portfolioId);
        const strategy = {
            primaryInstrument: instrument || this.selectOptimalInstrument(portfolioProfile),
            hedgeRatio: hedgeRatio || this.calculateOptimalHedgeRatio(portfolioProfile),
            maturity: maturity || this.selectOptimalMaturity(portfolioProfile),
            secondaryInstruments: await this.selectSecondaryInstruments(portfolioProfile),
            dynamicAdjustment: true,
            rebalancingFrequency: this.calculateRebalancingFrequency(portfolioProfile),
            customParameters: customParameters || {},
        };
        return strategy;
    }
    async getPortfolioProfile(portfolioId) {
        return {
            size: 1000000,
            duration: 5,
            convexity: 0.1,
            volatility: 0.2,
            liquidity: 'high',
            currencyExposure: ['USD', 'EUR'],
            commodityExposure: ['oil', 'gas'],
        };
    }
    selectOptimalInstrument(portfolioProfile) {
        const volatility = portfolioProfile['volatility'];
        const liquidity = portfolioProfile['liquidity'];
        if (volatility > 0.25) {
            return 'options';
        }
        else if (liquidity === 'high') {
            return 'futures';
        }
        else {
            return 'forwards';
        }
    }
    calculateOptimalHedgeRatio(portfolioProfile) {
        const volatility = portfolioProfile['volatility'];
        const size = portfolioProfile['size'];
        const baseRatio = 0.5;
        const volatilityAdjustment = Math.min(volatility * 2, 0.3);
        const sizeAdjustment = Math.min(Math.log(size / 1000000) / 10, 0.2);
        return Math.min(0.95, baseRatio + volatilityAdjustment + sizeAdjustment);
    }
    selectOptimalMaturity(portfolioProfile) {
        const duration = portfolioProfile['duration'];
        return Math.max(30, Math.min(365, duration * 30));
    }
    async selectSecondaryInstruments(portfolioProfile) {
        const instruments = [];
        if (portfolioProfile['currencyExposure'].length > 1) {
            instruments.push('currency forwards');
        }
        if (portfolioProfile['commodityExposure'].includes('oil')) {
            instruments.push('commodity swaps');
        }
        if (portfolioProfile['volatility'] > 0.3) {
            instruments.push('volatility swaps');
        }
        return instruments;
    }
    calculateRebalancingFrequency(portfolioProfile) {
        const volatility = portfolioProfile['volatility'];
        if (volatility > 0.3)
            return 'daily';
        if (volatility > 0.2)
            return 'weekly';
        return 'monthly';
    }
    async calculateHedgingEffectiveness(hedgingDto, strategy) {
        const baseEffectiveness = 0.7;
        const instrumentBonus = this.getInstrumentEffectivenessBonus(strategy['primaryInstrument']);
        const maturityBonus = this.getMaturityEffectivenessBonus(strategy['maturity']);
        const diversificationBonus = Math.min(strategy['secondaryInstruments'].length * 0.05, 0.15);
        const totalEffectiveness = baseEffectiveness +
            instrumentBonus +
            maturityBonus +
            diversificationBonus;
        return Math.min(0.95, totalEffectiveness);
    }
    getInstrumentEffectivenessBonus(instrument) {
        const bonuses = {
            futures: 0.1,
            options: 0.15,
            forwards: 0.12,
            swaps: 0.08,
        };
        return bonuses[instrument] || 0.05;
    }
    getMaturityEffectivenessBonus(maturity) {
        if (maturity >= 90 && maturity <= 180)
            return 0.05;
        if (maturity >= 30 && maturity <= 365)
            return 0.02;
        return 0;
    }
    async calculateHedgingCost(strategy) {
        const transactionCosts = this.calculateTransactionCosts(strategy);
        const ongoingCosts = this.calculateOngoingCosts(strategy);
        const opportunityCost = this.calculateOpportunityCost(strategy);
        return {
            transactionCosts,
            ongoingCosts,
            opportunityCost,
            totalCost: transactionCosts + ongoingCosts + opportunityCost,
            costAsPercentage: ((transactionCosts + ongoingCosts + opportunityCost) / 1000000) * 100,
        };
    }
    calculateTransactionCosts(strategy) {
        const instrument = strategy['primaryInstrument'];
        const hedgeRatio = strategy['hedgeRatio'];
        const baseCosts = {
            futures: 0.001,
            options: 0.02,
            forwards: 0.002,
            swaps: 0.005,
        };
        return (baseCosts[instrument] || 0.005) * hedgeRatio * 1000000;
    }
    calculateOngoingCosts(strategy) {
        const rebalancingFrequency = strategy['rebalancingFrequency'];
        const instrument = strategy['primaryInstrument'];
        const frequencyMultiplier = {
            daily: 252,
            weekly: 52,
            monthly: 12,
        };
        const perRebalancingCost = {
            futures: 10,
            options: 50,
            forwards: 25,
            swaps: 100,
        };
        return (frequencyMultiplier[rebalancingFrequency] *
            (perRebalancingCost[instrument] || 25));
    }
    calculateOpportunityCost(strategy) {
        const hedgeRatio = strategy['hedgeRatio'];
        const portfolioValue = 1000000;
        const riskFreeRate = 0.03;
        return portfolioValue * hedgeRatio * riskFreeRate;
    }
    async generateImplementationPlan(strategy) {
        return {
            phases: [
                {
                    phase: 'Setup',
                    duration: '1-2 days',
                    tasks: [
                        'Open trading accounts',
                        'Set up risk management systems',
                        'Configure monitoring alerts',
                    ],
                },
                {
                    phase: 'Initial Hedge',
                    duration: '1 day',
                    tasks: [
                        'Execute primary hedge transactions',
                        'Set up secondary hedges',
                        'Confirm hedge ratios',
                    ],
                },
                {
                    phase: 'Monitoring',
                    duration: 'Ongoing',
                    tasks: [
                        'Daily hedge effectiveness monitoring',
                        'Weekly performance review',
                        'Monthly strategy adjustment',
                    ],
                },
            ],
            resources: [
                'Risk management team',
                'Trading desk',
                'Compliance officer',
                'Technology support',
            ],
            risks: [
                'Counterparty risk',
                'Liquidity risk',
                'Model risk',
                'Operational risk',
            ],
        };
    }
    async generateMonitoringPlan(strategy) {
        return {
            frequency: strategy['rebalancingFrequency'],
            metrics: [
                'Hedge effectiveness',
                'Cost tracking',
                'Risk reduction',
                'Counterparty exposure',
                'Liquidity metrics',
            ],
            alerts: [
                'Hedge effectiveness below 60%',
                'Cost increase over 20%',
                'Counterparty rating downgrade',
                'Liquidity deterioration',
            ],
            reporting: {
                daily: ['Hedge effectiveness', 'P&L impact'],
                weekly: ['Cost analysis', 'Risk metrics'],
                monthly: ['Strategy review', 'Performance attribution'],
            },
        };
    }
    async updateRiskDataWithHedgingStrategy(portfolioId, hedgingStrategy) {
        const latestRiskData = await this.riskDataRepository.findOne({
            where: { portfolioId },
            order: { createdAt: 'DESC' },
        });
        if (!latestRiskData) {
            return;
        }
        await this.riskDataRepository.update(latestRiskData.id, {
            hedgingStrategy,
        });
    }
    async evaluateHedgingPerformance(portfolioId) {
        this.logger.log(`Evaluating hedging performance for portfolio: ${portfolioId}`);
        const riskData = await this.riskDataRepository.findOne({
            where: { portfolioId },
            order: { createdAt: 'DESC' },
        });
        if (!riskData || !riskData.hedgingStrategy) {
            throw new Error('No hedging strategy found for portfolio');
        }
        const actualEffectiveness = await this.calculateActualEffectiveness(portfolioId);
        const expectedEffectiveness = riskData.hedgingStrategy['effectiveness'];
        const performanceRatio = actualEffectiveness / expectedEffectiveness;
        return {
            portfolioId,
            actualEffectiveness,
            expectedEffectiveness,
            performanceRatio,
            recommendation: this.getPerformanceRecommendation(performanceRatio),
            lastUpdated: new Date(),
        };
    }
    async calculateActualEffectiveness(portfolioId) {
        return 0.75;
    }
    getPerformanceRecommendation(performanceRatio) {
        if (performanceRatio >= 0.9)
            return 'Continue current strategy';
        if (performanceRatio >= 0.7)
            return 'Minor adjustments recommended';
        if (performanceRatio >= 0.5)
            return 'Strategy revision required';
        return 'Immediate strategy change needed';
    }
    async adjustHedgingStrategy(portfolioId, adjustments) {
        this.logger.log(`Adjusting hedging strategy for portfolio: ${portfolioId}`);
        const currentStrategy = await this.getCurrentHedgingStrategy(portfolioId);
        const adjustedStrategy = await this.applyAdjustments(currentStrategy, adjustments);
        await this.updateRiskDataWithHedgingStrategy(portfolioId, adjustedStrategy);
        return {
            portfolioId,
            previousStrategy: currentStrategy,
            adjustedStrategy,
            adjustments,
            timestamp: new Date(),
        };
    }
    async getCurrentHedgingStrategy(portfolioId) {
        const riskData = await this.riskDataRepository.findOne({
            where: { portfolioId },
            order: { createdAt: 'DESC' },
        });
        return riskData?.hedgingStrategy || {};
    }
    async applyAdjustments(currentStrategy, adjustments) {
        return {
            ...currentStrategy,
            ...adjustments,
            lastAdjusted: new Date(),
            adjustmentHistory: [
                ...(currentStrategy['adjustmentHistory'] || []),
                {
                    timestamp: new Date(),
                    adjustments,
                },
            ],
        };
    }
};
exports.HedgingStrategyService = HedgingStrategyService;
exports.HedgingStrategyService = HedgingStrategyService = HedgingStrategyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(risk_data_entity_1.RiskDataEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], HedgingStrategyService);
//# sourceMappingURL=hedging-strategy.service.js.map