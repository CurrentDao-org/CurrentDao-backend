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
var VarCalculatorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VarCalculatorService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const risk_data_entity_1 = require("../entities/risk-data.entity");
let VarCalculatorService = VarCalculatorService_1 = class VarCalculatorService {
    constructor(riskDataRepository) {
        this.riskDataRepository = riskDataRepository;
        this.logger = new common_1.Logger(VarCalculatorService_1.name);
    }
    async calculateVar(varDto) {
        this.logger.log(`Calculating VaR for portfolio: ${varDto.portfolioId}, Method: ${varDto.method}`);
        const startTime = Date.now();
        let varResult;
        switch (varDto.method) {
            case 'historical':
                varResult = await this.calculateHistoricalVaR(varDto);
                break;
            case 'parametric':
                varResult = await this.calculateParametricVaR(varDto);
                break;
            case 'monte_carlo':
                varResult = await this.calculateMonteCarloVaR(varDto);
                break;
            default:
                throw new Error(`Unsupported VaR method: ${varDto.method}`);
        }
        const processingTime = Date.now() - startTime;
        if (processingTime > 200) {
            this.logger.warn(`VaR calculation exceeded 200ms threshold: ${processingTime}ms`);
        }
        await this.updateRiskDataWithVar(varDto.portfolioId, varResult);
        this.logger.log(`VaR calculation completed for ${varDto.portfolioId}: ${varResult.varValue} (${varDto.confidence * 100}% confidence)`);
        return {
            ...varResult,
            processingTime,
            accuracy: await this.calculateVarAccuracy(varDto.portfolioId, varResult),
        };
    }
    async calculateHistoricalVaR(varDto) {
        const { portfolioId, confidence, timeHorizon } = varDto;
        const historicalReturns = await this.getHistoricalReturns(portfolioId);
        const horizonReturns = this.calculateHorizonReturns(historicalReturns, timeHorizon);
        horizonReturns.sort((a, b) => a - b);
        const percentileIndex = Math.floor((1 - confidence) * horizonReturns.length);
        const varReturn = horizonReturns[percentileIndex];
        const portfolioValue = await this.getPortfolioValue(portfolioId);
        const varValue = Math.abs(varReturn * portfolioValue);
        return {
            method: 'historical',
            varValue,
            varReturn,
            confidence,
            timeHorizon,
            dataPoints: historicalReturns.length,
            assumptions: {
                distribution: 'empirical',
                stationarity: true,
                sufficientHistory: historicalReturns.length >= 252,
            },
            metrics: {
                mean: this.calculateMean(historicalReturns),
                volatility: this.calculateVolatility(historicalReturns),
                skewness: this.calculateSkewness(historicalReturns),
                kurtosis: this.calculateKurtosis(historicalReturns),
            },
        };
    }
    async calculateParametricVaR(varDto) {
        const { portfolioId, confidence, timeHorizon } = varDto;
        const returns = await this.getHistoricalReturns(portfolioId);
        const mean = this.calculateMean(returns);
        const volatility = this.calculateVolatility(returns);
        const zScore = this.getZScore(confidence);
        const timeAdjustedVolatility = volatility * Math.sqrt(timeHorizon);
        const timeAdjustedMean = mean * timeHorizon;
        const varReturn = timeAdjustedMean - zScore * timeAdjustedVolatility;
        const portfolioValue = await this.getPortfolioValue(portfolioId);
        const varValue = Math.abs(varReturn * portfolioValue);
        return {
            method: 'parametric',
            varValue,
            varReturn,
            confidence,
            timeHorizon,
            parameters: {
                mean,
                volatility,
                zScore,
                timeAdjustedVolatility,
                timeAdjustedMean,
            },
            assumptions: {
                distribution: 'normal',
                iidReturns: true,
                constantParameters: true,
            },
            metrics: {
                mean,
                volatility,
                sharpeRatio: mean / volatility,
                maxDrawdown: this.calculateMaxDrawdown(returns),
            },
        };
    }
    async calculateMonteCarloVaR(varDto) {
        const { portfolioId, confidence, timeHorizon, simulations = 10000, } = varDto;
        const returns = await this.getHistoricalReturns(portfolioId);
        const mean = this.calculateMean(returns);
        const volatility = this.calculateVolatility(returns);
        const simulatedReturns = this.runMonteCarloSimulation(mean, volatility, timeHorizon, simulations);
        simulatedReturns.sort((a, b) => a - b);
        const percentileIndex = Math.floor((1 - confidence) * simulatedReturns.length);
        const varReturn = simulatedReturns[percentileIndex];
        const portfolioValue = await this.getPortfolioValue(portfolioId);
        const varValue = Math.abs(varReturn * portfolioValue);
        return {
            method: 'monte_carlo',
            varValue,
            varReturn,
            confidence,
            timeHorizon,
            simulations,
            parameters: {
                mean,
                volatility,
                simulationCount: simulations,
                randomSeed: Date.now(),
            },
            assumptions: {
                distribution: 'normal',
                geometricBrownianMotion: true,
                riskNeutral: false,
            },
            metrics: {
                mean: this.calculateMean(simulatedReturns),
                volatility: this.calculateVolatility(simulatedReturns),
                percentiles: this.calculatePercentiles(simulatedReturns),
                convergence: this.checkConvergence(simulatedReturns),
            },
        };
    }
    async getHistoricalReturns(portfolioId) {
        const returns = [];
        for (let i = 0; i < 252; i++) {
            returns.push(this.generateRandomReturn(0.0005, 0.02));
        }
        return returns;
    }
    generateRandomReturn(mean, volatility) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + volatility * z;
    }
    calculateHorizonReturns(returns, timeHorizon) {
        const horizonReturns = [];
        for (let i = 0; i <= returns.length - timeHorizon; i++) {
            let horizonReturn = 0;
            for (let j = 0; j < timeHorizon; j++) {
                horizonReturn += returns[i + j];
            }
            horizonReturns.push(horizonReturn);
        }
        return horizonReturns;
    }
    getZScore(confidence) {
        const zScores = {
            0.9: 1.282,
            0.95: 1.645,
            0.96: 1.751,
            0.97: 1.881,
            0.98: 2.054,
            0.99: 2.326,
            0.995: 2.576,
        };
        return zScores[confidence] || 1.645;
    }
    runMonteCarloSimulation(mean, volatility, timeHorizon, simulations) {
        const simulatedReturns = [];
        for (let i = 0; i < simulations; i++) {
            let totalReturn = 0;
            for (let j = 0; j < timeHorizon; j++) {
                totalReturn += this.generateRandomReturn(mean, volatility);
            }
            simulatedReturns.push(totalReturn);
        }
        return simulatedReturns;
    }
    async getPortfolioValue(portfolioId) {
        return 1000000;
    }
    calculateMean(returns) {
        return returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    }
    calculateVolatility(returns) {
        const mean = this.calculateMean(returns);
        const squaredDiffs = returns.map((ret) => Math.pow(ret - mean, 2));
        const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / returns.length;
        return Math.sqrt(variance);
    }
    calculateSkewness(returns) {
        const mean = this.calculateMean(returns);
        const volatility = this.calculateVolatility(returns);
        const cubedDiffs = returns.map((ret) => Math.pow((ret - mean) / volatility, 3));
        return cubedDiffs.reduce((sum, diff) => sum + diff, 0) / returns.length;
    }
    calculateKurtosis(returns) {
        const mean = this.calculateMean(returns);
        const volatility = this.calculateVolatility(returns);
        const fourthPowerDiffs = returns.map((ret) => Math.pow((ret - mean) / volatility, 4));
        return (fourthPowerDiffs.reduce((sum, diff) => sum + diff, 0) / returns.length);
    }
    calculateMaxDrawdown(returns) {
        let maxDrawdown = 0;
        let peak = 0;
        let cumulativeReturn = 0;
        for (const ret of returns) {
            cumulativeReturn += ret;
            peak = Math.max(peak, cumulativeReturn);
            const drawdown = peak - cumulativeReturn;
            maxDrawdown = Math.max(maxDrawdown, drawdown);
        }
        return maxDrawdown;
    }
    calculatePercentiles(returns) {
        const sortedReturns = [...returns].sort((a, b) => a - b);
        return {
            p1: sortedReturns[Math.floor(0.01 * sortedReturns.length)],
            p5: sortedReturns[Math.floor(0.05 * sortedReturns.length)],
            p25: sortedReturns[Math.floor(0.25 * sortedReturns.length)],
            p50: sortedReturns[Math.floor(0.5 * sortedReturns.length)],
            p75: sortedReturns[Math.floor(0.75 * sortedReturns.length)],
            p95: sortedReturns[Math.floor(0.95 * sortedReturns.length)],
            p99: sortedReturns[Math.floor(0.99 * sortedReturns.length)],
        };
    }
    checkConvergence(returns) {
        const sampleSize = Math.min(1000, returns.length);
        const firstHalf = returns.slice(0, sampleSize / 2);
        const secondHalf = returns.slice(sampleSize / 2, sampleSize);
        const firstMean = this.calculateMean(firstHalf);
        const secondMean = this.calculateMean(secondHalf);
        const difference = Math.abs(firstMean - secondMean);
        const average = (firstMean + secondMean) / 2;
        return difference / Math.abs(average) < 0.05;
    }
    async calculateVarAccuracy(portfolioId, varResult) {
        const backtestResults = await this.backtestVar(portfolioId, varResult);
        const expectedBreachRate = 1 - varResult['confidence'];
        const actualBreachRate = backtestResults.breachRate;
        return Math.max(0, 1 - Math.abs(expectedBreachRate - actualBreachRate));
    }
    async backtestVar(portfolioId, varResult) {
        const historicalReturns = await this.getHistoricalReturns(portfolioId);
        const varThreshold = varResult['varReturn'];
        let breaches = 0;
        for (const ret of historicalReturns) {
            if (ret < varThreshold) {
                breaches++;
            }
        }
        const breachRate = breaches / historicalReturns.length;
        return {
            breaches,
            totalObservations: historicalReturns.length,
            breachRate,
            expectedBreachRate: 1 - varResult['confidence'],
            kupiecPValue: this.calculateKupiecPValue(breaches, historicalReturns.length, 1 - varResult['confidence']),
        };
    }
    calculateKupiecPValue(breaches, observations, expectedBreachRate) {
        const actualBreachRate = breaches / observations;
        if (breaches === 0)
            return 1;
        const lr = 2 *
            (breaches * Math.log(actualBreachRate / expectedBreachRate) +
                (observations - breaches) *
                    Math.log((1 - actualBreachRate) / (1 - expectedBreachRate)));
        return 1 - this.chiSquareCDF(lr, 1);
    }
    chiSquareCDF(x, df) {
        return Math.min(1, x / (df + Math.sqrt(2 * df)));
    }
    async updateRiskDataWithVar(portfolioId, varResult) {
        const latestRiskData = await this.riskDataRepository.findOne({
            where: { portfolioId },
            order: { createdAt: 'DESC' },
        });
        if (!latestRiskData) {
            return;
        }
        await this.riskDataRepository.update(latestRiskData.id, {
            varValue: varResult['varValue'],
            varConfidence: varResult['confidence'],
        });
    }
    async compareVarMethods(portfolioId, confidence, timeHorizon) {
        this.logger.log(`Comparing VaR methods for portfolio: ${portfolioId}`);
        const methods = ['historical', 'parametric', 'monte_carlo'];
        const results = {};
        for (const method of methods) {
            const varDto = {
                portfolioId,
                confidence,
                timeHorizon,
                method,
                simulations: method === 'monte_carlo' ? 10000 : undefined,
            };
            results[method] = await this.calculateVar(varDto);
        }
        return {
            portfolioId,
            confidence,
            timeHorizon,
            results,
            comparison: {
                lowestVar: Math.min(...Object.values(results).map((r) => r.varValue)),
                highestVar: Math.max(...Object.values(results).map((r) => r.varValue)),
                variance: this.calculateVariance(Object.values(results).map((r) => r.varValue)),
                recommendation: this.getVarRecommendation(results),
            },
        };
    }
    calculateVariance(values) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
        return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
    }
    getVarRecommendation(results) {
        const historical = results['historical'];
        const parametric = results['parametric'];
        const monteCarlo = results['monte_carlo'];
        const accuracyScores = {
            historical: historical.accuracy,
            parametric: parametric.accuracy,
            monte_carlo: monteCarlo.accuracy,
        };
        const bestMethod = Object.entries(accuracyScores).sort(([, a], [, b]) => b - a)[0][0];
        return `Use ${bestMethod} method - highest accuracy: ${accuracyScores[bestMethod]}`;
    }
};
exports.VarCalculatorService = VarCalculatorService;
exports.VarCalculatorService = VarCalculatorService = VarCalculatorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(risk_data_entity_1.RiskDataEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], VarCalculatorService);
//# sourceMappingURL=var-calculator.service.js.map