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
var StressTestService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StressTestService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const risk_data_entity_1 = require("../entities/risk-data.entity");
let StressTestService = StressTestService_1 = class StressTestService {
    constructor(riskDataRepository) {
        this.riskDataRepository = riskDataRepository;
        this.logger = new common_1.Logger(StressTestService_1.name);
    }
    async runStressTest(stressTestDto) {
        this.logger.log(`Running stress test for portfolio: ${stressTestDto.portfolioId}`);
        const results = {
            portfolioId: stressTestDto.portfolioId,
            scenarios: {},
            summary: {},
            recommendations: [],
            timestamp: new Date(),
        };
        for (const scenario of stressTestDto.scenarios) {
            results.scenarios[scenario] = await this.runScenario(stressTestDto.portfolioId, scenario, stressTestDto.shockMagnitude);
        }
        if (stressTestDto.customScenario) {
            results.scenarios['custom'] = await this.runCustomScenario(stressTestDto.portfolioId, stressTestDto.customScenario);
        }
        results.summary = await this.generateStressTestSummary(results.scenarios);
        results.recommendations = await this.generateStressTestRecommendations(results.scenarios);
        await this.updateRiskDataWithStressTest(stressTestDto.portfolioId, results);
        this.logger.log(`Stress test completed for portfolio: ${stressTestDto.portfolioId}, Scenarios: ${stressTestDto.scenarios.length}`);
        return results;
    }
    async runScenario(portfolioId, scenario, shockMagnitude) {
        const portfolioValue = await this.getPortfolioValue(portfolioId);
        const baseRisk = await this.getBaseRiskMetrics(portfolioId);
        let scenarioResult;
        switch (scenario) {
            case 'market_crash':
                scenarioResult = await this.simulateMarketCrash(portfolioValue, baseRisk, shockMagnitude);
                break;
            case 'interest_rate_shock':
                scenarioResult = await this.simulateInterestRateShock(portfolioValue, baseRisk, shockMagnitude);
                break;
            case 'currency_crisis':
                scenarioResult = await this.simulateCurrencyCrisis(portfolioValue, baseRisk, shockMagnitude);
                break;
            case 'commodity_price_shock':
                scenarioResult = await this.simulateCommodityPriceShock(portfolioValue, baseRisk, shockMagnitude);
                break;
            case 'credit_crisis':
                scenarioResult = await this.simulateCreditCrisis(portfolioValue, baseRisk, shockMagnitude);
                break;
            case 'liquidity_crisis':
                scenarioResult = await this.simulateLiquidityCrisis(portfolioValue, baseRisk, shockMagnitude);
                break;
            case 'operational_failure':
                scenarioResult = await this.simulateOperationalFailure(portfolioValue, baseRisk, shockMagnitude);
                break;
            case 'regulatory_change':
                scenarioResult = await this.simulateRegulatoryChange(portfolioValue, baseRisk, shockMagnitude);
                break;
            case 'geopolitical_crisis':
                scenarioResult = await this.simulateGeopoliticalCrisis(portfolioValue, baseRisk, shockMagnitude);
                break;
            case 'pandemic':
                scenarioResult = await this.simulatePandemic(portfolioValue, baseRisk, shockMagnitude);
                break;
            default:
                scenarioResult = await this.simulateGenericShock(portfolioValue, baseRisk, scenario, shockMagnitude);
        }
        return {
            scenario,
            ...scenarioResult,
            severity: this.calculateScenarioSeverity(scenarioResult),
            recoveryTime: this.estimateRecoveryTime(scenarioResult),
        };
    }
    async runCustomScenario(portfolioId, customScenario) {
        const portfolioValue = await this.getPortfolioValue(portfolioId);
        const baseRisk = await this.getBaseRiskMetrics(portfolioId);
        const marketShock = customScenario['marketShock'] || 0;
        const interestRateShock = customScenario['interestRateShock'] || 0;
        const currencyShock = customScenario['currencyShock'] || 0;
        const commodityShock = customScenario['commodityShock'] || 0;
        const creditShock = customScenario['creditShock'] || 0;
        const totalImpact = this.calculateTotalImpact(portfolioValue, {
            marketShock,
            interestRateShock,
            currencyShock,
            commodityShock,
            creditShock,
        });
        return {
            scenario: 'custom',
            portfolioImpact: totalImpact,
            riskIncrease: this.calculateRiskIncrease(baseRisk, totalImpact),
            customParameters: customScenario,
            severity: this.calculateScenarioSeverity({
                portfolioImpact: totalImpact,
            }),
            recoveryTime: this.estimateRecoveryTime({ portfolioImpact: totalImpact }),
        };
    }
    async simulateMarketCrash(portfolioValue, baseRisk, shockMagnitude) {
        const magnitude = shockMagnitude || -30;
        const portfolioImpact = portfolioValue * (magnitude / 100);
        const sectorImpacts = {
            energy: portfolioValue * 0.4 * (magnitude / 100) * 1.2,
            technology: portfolioValue * 0.3 * (magnitude / 100) * 1.5,
            utilities: portfolioValue * 0.2 * (magnitude / 100) * 0.8,
            other: portfolioValue * 0.1 * (magnitude / 100),
        };
        return {
            portfolioImpact,
            sectorImpacts,
            riskIncrease: Math.abs(magnitude) / 10,
            correlationIncrease: 0.3,
            liquidityDecrease: Math.abs(magnitude) / 20,
        };
    }
    async simulateInterestRateShock(portfolioValue, baseRisk, shockMagnitude) {
        const magnitude = shockMagnitude || 200;
        const duration = 5;
        const bondImpact = -duration * (magnitude / 10000) * portfolioValue * 0.6;
        const equityImpact = portfolioValue * 0.4 * (magnitude / 10000) * -2;
        const portfolioImpact = bondImpact + equityImpact;
        return {
            portfolioImpact,
            bondImpact,
            equityImpact,
            riskIncrease: Math.abs(magnitude) / 100,
            yieldCurveShift: magnitude,
            durationImpact: bondImpact,
        };
    }
    async simulateCurrencyCrisis(portfolioValue, baseRisk, shockMagnitude) {
        const magnitude = shockMagnitude || -20;
        const currencyExposure = portfolioValue * 0.3;
        const portfolioImpact = currencyExposure * (magnitude / 100);
        const currencyImpacts = {
            EUR: currencyExposure * 0.4 * (magnitude / 100),
            GBP: currencyExposure * 0.3 * (magnitude / 100) * 1.1,
            JPY: currencyExposure * 0.2 * (magnitude / 100) * 0.9,
            other: currencyExposure * 0.1 * (magnitude / 100),
        };
        return {
            portfolioImpact,
            currencyImpacts,
            riskIncrease: Math.abs(magnitude) / 15,
            hedgeEffectiveness: 0.7,
        };
    }
    async simulateCommodityPriceShock(portfolioValue, baseRisk, shockMagnitude) {
        const magnitude = shockMagnitude || -40;
        const commodityExposure = portfolioValue * 0.25;
        const portfolioImpact = commodityExposure * (magnitude / 100);
        const commodityImpacts = {
            oil: commodityExposure * 0.5 * (magnitude / 100),
            gas: commodityExposure * 0.3 * (magnitude / 100) * 1.2,
            renewables: commodityExposure * 0.2 * (magnitude / 100) * -0.5,
        };
        return {
            portfolioImpact,
            commodityImpacts,
            riskIncrease: Math.abs(magnitude) / 12,
            correlationWithEnergy: 0.8,
        };
    }
    async simulateCreditCrisis(portfolioValue, baseRisk, shockMagnitude) {
        const magnitude = shockMagnitude || 300;
        const creditExposure = portfolioValue * 0.35;
        const portfolioImpact = creditExposure * (magnitude / 10000);
        const creditImpacts = {
            aaa: creditExposure * 0.2 * (magnitude / 10000) * 0.5,
            aa: creditExposure * 0.3 * (magnitude / 10000) * 0.7,
            a: creditExposure * 0.3 * (magnitude / 10000) * 1.0,
            bbb: creditExposure * 0.2 * (magnitude / 10000) * 1.5,
        };
        return {
            portfolioImpact,
            creditImpacts,
            riskIncrease: Math.abs(magnitude) / 150,
            defaultRateIncrease: magnitude / 500,
            liquidityImpact: magnitude / 200,
        };
    }
    async simulateLiquidityCrisis(portfolioValue, baseRisk, shockMagnitude) {
        const magnitude = shockMagnitude || 50;
        const illiquidAssets = portfolioValue * 0.4;
        const portfolioImpact = illiquidAssets * (magnitude / 100) * 0.3;
        return {
            portfolioImpact,
            liquidityReduction: magnitude,
            fireSaleDiscount: magnitude / 2,
            fundingCostIncrease: magnitude / 10,
            riskIncrease: magnitude / 25,
        };
    }
    async simulateOperationalFailure(portfolioValue, baseRisk, shockMagnitude) {
        const magnitude = shockMagnitude || 10;
        const operationalRisk = portfolioValue * 0.05;
        const portfolioImpact = operationalRisk * (magnitude / 100);
        return {
            portfolioImpact,
            systemDowntime: magnitude * 24,
            remediationCost: portfolioImpact * 0.5,
            regulatoryFines: portfolioImpact * 0.2,
            reputationalImpact: portfolioImpact * 0.3,
            riskIncrease: magnitude / 20,
        };
    }
    async simulateRegulatoryChange(portfolioValue, baseRisk, shockMagnitude) {
        const magnitude = shockMagnitude || 15;
        const regulatoryCapital = portfolioValue * 0.08;
        const portfolioImpact = regulatoryCapital * (magnitude / 100);
        return {
            portfolioImpact,
            capitalRequirementIncrease: magnitude,
            complianceCost: portfolioImpact * 0.6,
            businessRestriction: portfolioImpact * 0.4,
            riskIncrease: magnitude / 30,
        };
    }
    async simulateGeopoliticalCrisis(portfolioValue, baseRisk, shockMagnitude) {
        const magnitude = shockMagnitude || -25;
        const portfolioImpact = portfolioValue * (magnitude / 100);
        return {
            portfolioImpact,
            regionalImpacts: {
                europe: portfolioValue * 0.3 * (magnitude / 100) * 1.2,
                asia: portfolioValue * 0.4 * (magnitude / 100) * 0.8,
                americas: portfolioValue * 0.3 * (magnitude / 100) * 1.0,
            },
            riskIncrease: Math.abs(magnitude) / 10,
            volatilityIncrease: Math.abs(magnitude) / 5,
        };
    }
    async simulatePandemic(portfolioValue, baseRisk, shockMagnitude) {
        const magnitude = shockMagnitude || -35;
        const portfolioImpact = portfolioValue * (magnitude / 100);
        return {
            portfolioImpact,
            sectorImpacts: {
                energy: portfolioValue * 0.2 * (magnitude / 100) * 1.5,
                travel: portfolioValue * 0.1 * (magnitude / 100) * 2.0,
                technology: portfolioValue * 0.3 * (magnitude / 100) * -0.5,
                healthcare: portfolioValue * 0.2 * (magnitude / 100) * -0.8,
                utilities: portfolioValue * 0.2 * (magnitude / 100) * 0.3,
            },
            riskIncrease: Math.abs(magnitude) / 8,
            supplyChainDisruption: magnitude / 2,
        };
    }
    async simulateGenericShock(portfolioValue, baseRisk, scenario, shockMagnitude) {
        const magnitude = shockMagnitude || -20;
        const portfolioImpact = portfolioValue * (magnitude / 100);
        return {
            portfolioImpact,
            scenario,
            riskIncrease: Math.abs(magnitude) / 10,
            customScenario: true,
        };
    }
    calculateTotalImpact(portfolioValue, shocks) {
        let totalImpact = 0;
        for (const [key, value] of Object.entries(shocks)) {
            if (typeof value === 'number') {
                totalImpact += Math.abs(portfolioValue * (value / 100));
            }
        }
        return totalImpact;
    }
    calculateRiskIncrease(baseRisk, portfolioImpact) {
        const baseRiskLevel = baseRisk['riskLevel'] || 2;
        const riskIncrease = Math.abs(portfolioImpact) / 100000;
        return Math.min(4, baseRiskLevel + riskIncrease);
    }
    calculateScenarioSeverity(scenarioResult) {
        const impact = Math.abs(scenarioResult['portfolioImpact'] || 0);
        if (impact > 500000)
            return 'critical';
        if (impact > 200000)
            return 'high';
        if (impact > 100000)
            return 'medium';
        return 'low';
    }
    estimateRecoveryTime(scenarioResult) {
        const severity = this.calculateScenarioSeverity(scenarioResult);
        const recoveryTimes = {
            critical: '12-24 months',
            high: '6-12 months',
            medium: '3-6 months',
            low: '1-3 months',
        };
        return recoveryTimes[severity] || '3-6 months';
    }
    async generateStressTestSummary(scenarios) {
        const scenarioResults = Object.values(scenarios);
        const impacts = scenarioResults.map((s) => Math.abs(s['portfolioImpact'] || 0));
        const riskIncreases = scenarioResults.map((s) => s['riskIncrease'] || 0);
        return {
            worstCaseScenario: Math.max(...impacts),
            averageImpact: impacts.reduce((sum, impact) => sum + impact, 0) / impacts.length,
            maxRiskIncrease: Math.max(...riskIncreases),
            scenariosTested: scenarioResults.length,
            criticalScenarios: scenarioResults.filter((s) => this.calculateScenarioSeverity(s) === 'critical').length,
            highScenarios: scenarioResults.filter((s) => this.calculateScenarioSeverity(s) === 'high').length,
            overallResilience: this.calculateOverallResilience(impacts),
        };
    }
    calculateOverallResilience(impacts) {
        const maxImpact = Math.max(...impacts);
        const avgImpact = impacts.reduce((sum, impact) => sum + impact, 0) / impacts.length;
        const resilienceScore = Math.max(0, 100 - maxImpact / 10000 - avgImpact / 20000);
        return Math.round(resilienceScore);
    }
    async generateStressTestRecommendations(scenarios) {
        const recommendations = [];
        const scenarioResults = Object.entries(scenarios);
        const criticalScenarios = scenarioResults.filter(([, result]) => this.calculateScenarioSeverity(result) === 'critical');
        if (criticalScenarios.length > 0) {
            recommendations.push('Implement immediate risk mitigation for critical scenarios');
            recommendations.push('Increase capital reserves to cover worst-case losses');
        }
        const highScenarios = scenarioResults.filter(([, result]) => this.calculateScenarioSeverity(result) === 'high');
        if (highScenarios.length > 2) {
            recommendations.push('Diversify portfolio to reduce concentration risk');
            recommendations.push('Enhance hedging strategies for high-impact scenarios');
        }
        const hasMarketRisk = scenarioResults.some(([name]) => name.includes('market') || name.includes('crash'));
        const hasCreditRisk = scenarioResults.some(([name]) => name.includes('credit'));
        const hasLiquidityRisk = scenarioResults.some(([name]) => name.includes('liquidity'));
        if (hasMarketRisk) {
            recommendations.push('Consider market-neutral strategies');
            recommendations.push('Implement dynamic asset allocation');
        }
        if (hasCreditRisk) {
            recommendations.push('Enhance credit quality monitoring');
            recommendations.push('Increase credit diversification');
        }
        if (hasLiquidityRisk) {
            recommendations.push('Maintain higher liquidity buffers');
            recommendations.push('Establish contingency funding lines');
        }
        return recommendations;
    }
    async getPortfolioValue(portfolioId) {
        return 1000000;
    }
    async getBaseRiskMetrics(portfolioId) {
        return {
            riskLevel: 2,
            volatility: 0.2,
            var: 50000,
            beta: 1.0,
        };
    }
    async updateRiskDataWithStressTest(portfolioId, stressTestResults) {
        const latestRiskData = await this.riskDataRepository.findOne({
            where: { portfolioId },
            order: { createdAt: 'DESC' },
        });
        if (!latestRiskData) {
            return;
        }
        await this.riskDataRepository.update(latestRiskData.id, {
            stressTestResult: stressTestResults,
        });
    }
    async getStressTestLibrary() {
        return {
            predefinedScenarios: [
                {
                    name: 'market_crash',
                    description: 'Sudden market decline of 30% or more',
                    parameters: { magnitude: -30 },
                    frequency: 'rare',
                },
                {
                    name: 'interest_rate_shock',
                    description: 'Rapid interest rate changes of 200+ bps',
                    parameters: { magnitude: 200 },
                    frequency: 'occasional',
                },
                {
                    name: 'currency_crisis',
                    description: 'Major currency devaluation of 20%+',
                    parameters: { magnitude: -20 },
                    frequency: 'rare',
                },
                {
                    name: 'commodity_price_shock',
                    description: 'Commodity price volatility of 40%+',
                    parameters: { magnitude: -40 },
                    frequency: 'occasional',
                },
                {
                    name: 'credit_crisis',
                    description: 'Credit spread widening of 300+ bps',
                    parameters: { magnitude: 300 },
                    frequency: 'rare',
                },
                {
                    name: 'liquidity_crisis',
                    description: 'Market liquidity reduction of 50%+',
                    parameters: { magnitude: 50 },
                    frequency: 'occasional',
                },
                {
                    name: 'operational_failure',
                    description: 'System or operational breakdown',
                    parameters: { magnitude: 10 },
                    frequency: 'possible',
                },
                {
                    name: 'regulatory_change',
                    description: 'Significant regulatory changes',
                    parameters: { magnitude: 15 },
                    frequency: 'occasional',
                },
                {
                    name: 'geopolitical_crisis',
                    description: 'Geopolitical events affecting markets',
                    parameters: { magnitude: -25 },
                    frequency: 'rare',
                },
                {
                    name: 'pandemic',
                    description: 'Global health crisis',
                    parameters: { magnitude: -35 },
                    frequency: 'very rare',
                },
            ],
            customScenarios: {
                description: 'Create custom stress scenarios with specific parameters',
                parameters: [
                    'marketShock',
                    'interestRateShock',
                    'currencyShock',
                    'commodityShock',
                    'creditShock',
                ],
            },
        };
    }
};
exports.StressTestService = StressTestService;
exports.StressTestService = StressTestService = StressTestService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(risk_data_entity_1.RiskDataEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], StressTestService);
//# sourceMappingURL=stress-test.service.js.map