"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TrendPredictionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrendPredictionService = exports.TrendStrength = exports.TrendDirection = void 0;
const common_1 = require("@nestjs/common");
var TrendDirection;
(function (TrendDirection) {
    TrendDirection["UP"] = "up";
    TrendDirection["DOWN"] = "down";
    TrendDirection["SIDEWAYS"] = "sideways";
    TrendDirection["VOLATILE"] = "volatile";
})(TrendDirection || (exports.TrendDirection = TrendDirection = {}));
var TrendStrength;
(function (TrendStrength) {
    TrendStrength["WEAK"] = "weak";
    TrendStrength["MODERATE"] = "moderate";
    TrendStrength["STRONG"] = "strong";
    TrendStrength["VERY_STRONG"] = "very_strong";
})(TrendStrength || (exports.TrendStrength = TrendStrength = {}));
let TrendPredictionService = TrendPredictionService_1 = class TrendPredictionService {
    constructor() {
        this.logger = new common_1.Logger(TrendPredictionService_1.name);
    }
    async predictMarketTrend(timeSeriesData, weatherData, economicData) {
        try {
            await Promise.resolve();
            const technicalSignals = this.analyzeTechnicalIndicators(timeSeriesData);
            const weatherSignals = weatherData
                ? this.analyzeWeatherImpact(weatherData)
                : null;
            const economicSignals = economicData
                ? this.analyzeEconomicImpact(economicData)
                : null;
            const combinedSignals = this.combineSignals(technicalSignals, weatherSignals, economicSignals);
            const patterns = this.identifyPatterns(timeSeriesData);
            return {
                direction: combinedSignals.direction,
                strength: combinedSignals.strength,
                confidence: combinedSignals.confidence,
                timeframe: this.determineTimeframe(timeSeriesData),
                expectedChange: combinedSignals.expectedChange,
                riskFactors: this.identifyRiskFactors(combinedSignals, patterns),
                keyDrivers: this.identifyKeyDrivers(technicalSignals, weatherSignals, economicSignals),
                reversalPoints: this.predictReversalPoints(timeSeriesData, combinedSignals),
                supportLevels: this.calculateSupportLevels(timeSeriesData),
                resistanceLevels: this.calculateResistanceLevels(timeSeriesData),
            };
        }
        catch (error) {
            this.logger.error('Failed to predict market trend', error);
            throw error;
        }
    }
    async detectMajorShifts(historicalData, windowSize = 30) {
        await Promise.resolve();
        const shifts = [];
        for (let i = windowSize; i < historicalData.length; i++) {
            const window = historicalData.slice(i - windowSize, i);
            const previousWindow = historicalData.slice(i - windowSize * 2, i - windowSize);
            const shift = this.detectShift(window, previousWindow);
            if (shift.magnitude > 0.1) {
                shifts.push({
                    timestamp: historicalData[i].timestamp,
                    shiftType: shift.type,
                    magnitude: shift.magnitude,
                    confidence: shift.confidence,
                });
            }
        }
        return shifts;
    }
    async generateMarketSignals(trendPrediction, currentPosition) {
        await Promise.resolve();
        const signals = [];
        const primarySignal = this.generatePrimarySignal(trendPrediction, currentPosition);
        signals.push(primarySignal);
        const riskSignals = this.generateRiskSignals(trendPrediction);
        signals.push(...riskSignals);
        const levelSignals = this.generateLevelSignals(trendPrediction);
        signals.push(...levelSignals);
        return signals;
    }
    async recognizePatterns(timeSeriesData) {
        await Promise.resolve();
        const patterns = [];
        const headAndShoulders = this.detectHeadAndShoulders(timeSeriesData);
        if (headAndShoulders)
            patterns.push(headAndShoulders);
        const doublePattern = this.detectDoublePattern(timeSeriesData);
        if (doublePattern)
            patterns.push(doublePattern);
        const trianglePattern = this.detectTrianglePattern(timeSeriesData);
        if (trianglePattern)
            patterns.push(trianglePattern);
        const channelPattern = this.detectChannelPattern(timeSeriesData);
        if (channelPattern)
            patterns.push(channelPattern);
        const breakoutPattern = this.detectBreakoutPattern(timeSeriesData);
        if (breakoutPattern)
            patterns.push(breakoutPattern);
        return patterns;
    }
    async calculateVolatility(timeSeriesData, windowSize = 20) {
        await Promise.resolve();
        if (timeSeriesData.length < windowSize) {
            return { current: 0, average: 0, trend: 'stable' };
        }
        const returns = this.calculateReturns(timeSeriesData);
        const rollingVolatility = this.calculateRollingVolatility(returns, windowSize);
        const current = rollingVolatility[rollingVolatility.length - 1];
        const average = rollingVolatility.reduce((sum, vol) => sum + vol, 0) /
            rollingVolatility.length;
        const trend = this.determineVolatilityTrend(rollingVolatility.slice(-10));
        return { current, average, trend };
    }
    analyzeTechnicalIndicators(data) {
        const prices = data.map((d) => d.value);
        const volumes = data.map((d) => d.volume || 0);
        return {
            sma20: this.calculateSMA(prices, 20),
            sma50: this.calculateSMA(prices, 50),
            sma200: this.calculateSMA(prices, 200),
            rsi: this.calculateRSI(prices, 14),
            macd: this.calculateMACD(prices),
            bollinger: this.calculateBollingerBands(prices, 20, 2),
            volumeTrend: this.analyzeVolumeTrend(volumes),
            momentum: this.calculateMomentum(prices, 10),
        };
    }
    analyzeWeatherImpact(weatherData) {
        if (weatherData.length === 0)
            return null;
        const recentWeather = weatherData.slice(-7);
        const avgTemp = recentWeather.reduce((sum, d) => sum + d.temperature, 0) /
            recentWeather.length;
        const avgWindSpeed = recentWeather.reduce((sum, d) => sum + d.windSpeed, 0) /
            recentWeather.length;
        const totalPrecipitation = recentWeather.reduce((sum, d) => sum + d.precipitation, 0);
        return {
            temperatureImpact: this.calculateTemperatureImpact(avgTemp),
            windImpact: this.calculateWindImpact(avgWindSpeed),
            precipitationImpact: this.calculatePrecipitationImpact(totalPrecipitation),
            overallImpact: this.calculateOverallWeatherImpact(recentWeather),
        };
    }
    analyzeEconomicImpact(economicData) {
        if (economicData.length === 0)
            return null;
        const latest = economicData[economicData.length - 1];
        const previous = economicData[economicData.length - 2] || latest;
        return {
            gdpImpact: this.calculateGDPImpact(latest.gdp, previous.gdp),
            inflationImpact: this.calculateInflationImpact(latest.inflation, previous.inflation),
            interestImpact: this.calculateInterestImpact(latest.interestRate, previous.interestRate),
            unemploymentImpact: this.calculateUnemploymentImpact(latest.unemployment, previous.unemployment),
            overallImpact: this.calculateOverallEconomicImpact(latest, previous),
        };
    }
    combineSignals(technical, weather, economic) {
        const weights = {
            technical: 0.6,
            weather: 0.2,
            economic: 0.2,
        };
        const directionScore = this.calculateDirectionScore(technical, weather, economic, weights);
        const strengthScore = this.calculateStrengthScore(technical, weather, economic, weights);
        const confidenceScore = this.calculateConfidenceScore(technical, weather, economic);
        return {
            direction: this.scoreToDirection(directionScore),
            strength: this.scoreToStrength(strengthScore),
            confidence: confidenceScore,
            expectedChange: this.calculateExpectedChange(directionScore, strengthScore),
        };
    }
    identifyPatterns(data) {
        void data;
        return [];
    }
    determineTimeframe(data) {
        const timeSpan = data[data.length - 1].timestamp.getTime() - data[0].timestamp.getTime();
        const days = timeSpan / (1000 * 60 * 60 * 24);
        if (days < 7)
            return 'intraday';
        if (days < 30)
            return 'short-term';
        if (days < 90)
            return 'medium-term';
        return 'long-term';
    }
    identifyRiskFactors(signals, patterns) {
        const risks = [];
        if (signals.confidence < 0.7)
            risks.push('Low confidence in prediction');
        if (signals.strength === TrendStrength.WEAK)
            risks.push('Weak trend strength');
        patterns.forEach((pattern) => {
            if (pattern.pattern.includes('reversal')) {
                risks.push('Potential trend reversal');
            }
        });
        return risks;
    }
    identifyKeyDrivers(technical, weather, economic) {
        const drivers = [];
        if (technical && Math.abs(technical.rsi - 50) > 20) {
            drivers.push('Momentum (RSI)');
        }
        if (weather && Math.abs(weather.overallImpact) > 0.1) {
            drivers.push('Weather conditions');
        }
        if (economic && Math.abs(economic.overallImpact) > 0.1) {
            drivers.push('Economic indicators');
        }
        return drivers;
    }
    predictReversalPoints(data, signals) {
        void signals;
        const reversals = [];
        const prices = data.map((d) => d.value);
        for (let i = 20; i < prices.length - 5; i++) {
            const window = prices.slice(i - 20, i + 5);
            const isExtremum = this.isLocalExtremum(window, 10);
            if (isExtremum) {
                reversals.push(data[i].timestamp);
            }
        }
        return reversals;
    }
    calculateSupportLevels(data) {
        const prices = data.map((d) => d.value);
        const supports = [];
        for (let i = 10; i < prices.length - 10; i++) {
            const window = prices.slice(i - 10, i + 10);
            if (prices[i] === Math.min(...window)) {
                supports.push(prices[i]);
            }
        }
        return [...new Set(supports)].sort((a, b) => b - a).slice(0, 3);
    }
    calculateResistanceLevels(data) {
        const prices = data.map((d) => d.value);
        const resistances = [];
        for (let i = 10; i < prices.length - 10; i++) {
            const window = prices.slice(i - 10, i + 10);
            if (prices[i] === Math.max(...window)) {
                resistances.push(prices[i]);
            }
        }
        return [...new Set(resistances)].sort((a, b) => a - b).slice(0, 3);
    }
    detectShift(window, previousWindow) {
        const windowAvg = window.reduce((sum, d) => sum + d.value, 0) / window.length;
        const previousAvg = previousWindow.reduce((sum, d) => sum + d.value, 0) /
            previousWindow.length;
        const change = (windowAvg - previousAvg) / previousAvg;
        return {
            type: change > 0 ? 'increase' : 'decrease',
            magnitude: Math.abs(change),
            confidence: Math.min(1, Math.abs(change) * 10),
        };
    }
    generatePrimarySignal(trend, currentPosition) {
        let type;
        let reason;
        if (trend.direction === TrendDirection.UP &&
            trend.strength !== TrendStrength.WEAK) {
            type = currentPosition === 'short' ? 'buy' : 'hold';
            reason = 'Upward trend detected';
        }
        else if (trend.direction === TrendDirection.DOWN &&
            trend.strength !== TrendStrength.WEAK) {
            type = currentPosition === 'long' ? 'sell' : 'hold';
            reason = 'Downward trend detected';
        }
        else {
            type = 'hold';
            reason = 'Sideways or weak trend';
        }
        return {
            type,
            strength: trend.confidence,
            reason,
            timeframe: trend.timeframe,
            confidence: trend.confidence,
        };
    }
    generateRiskSignals(trend) {
        const signals = [];
        if (trend.confidence < 0.6) {
            signals.push({
                type: 'hold',
                strength: 0.8,
                reason: 'Low confidence - reduce position size',
                timeframe: trend.timeframe,
                confidence: 0.8,
            });
        }
        if (trend.riskFactors.length > 2) {
            signals.push({
                type: 'hold',
                strength: 0.7,
                reason: 'Multiple risk factors identified',
                timeframe: trend.timeframe,
                confidence: 0.7,
            });
        }
        return signals;
    }
    generateLevelSignals(trend) {
        const signals = [];
        trend.supportLevels.forEach((level) => {
            signals.push({
                type: 'buy',
                strength: 0.6,
                reason: `Near support level at ${level}`,
                timeframe: 'short-term',
                confidence: 0.6,
            });
        });
        trend.resistanceLevels.forEach((level) => {
            signals.push({
                type: 'sell',
                strength: 0.6,
                reason: `Near resistance level at ${level}`,
                timeframe: 'short-term',
                confidence: 0.6,
            });
        });
        return signals;
    }
    calculateSMA(prices, period) {
        if (prices.length < period)
            return 0;
        const sum = prices.slice(-period).reduce((sum, price) => sum + price, 0);
        return sum / period;
    }
    calculateRSI(prices, period) {
        if (prices.length < period + 1)
            return 50;
        const returns = this.calculateReturns(prices.map((price) => ({ timestamp: new Date(), value: price })));
        const gains = returns.filter((r) => r > 0).slice(-period);
        const losses = returns
            .filter((r) => r < 0)
            .map((r) => Math.abs(r))
            .slice(-period);
        const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / gains.length || 0;
        const avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / losses.length || 0;
        if (avgLoss === 0)
            return 100;
        const rs = avgGain / avgLoss;
        return 100 - 100 / (1 + rs);
    }
    calculateMACD(prices) {
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        const macdLine = ema12 - ema26;
        const signalLine = this.calculateEMA([macdLine], 9);
        return {
            macd: macdLine,
            signal: signalLine,
            histogram: macdLine - signalLine,
        };
    }
    calculateEMA(prices, period) {
        if (prices.length === 0)
            return 0;
        if (prices.length === 1)
            return prices[0];
        const multiplier = 2 / (period + 1);
        let ema = prices[0];
        for (let i = 1; i < prices.length; i++) {
            ema = prices[i] * multiplier + ema * (1 - multiplier);
        }
        return ema;
    }
    calculateBollingerBands(prices, period, stdDev) {
        if (prices.length < period)
            return { upper: 0, middle: 0, lower: 0 };
        const middle = this.calculateSMA(prices, period);
        const recentPrices = prices.slice(-period);
        const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / period;
        const standardDeviation = Math.sqrt(variance);
        return {
            upper: middle + standardDeviation * stdDev,
            middle,
            lower: middle - standardDeviation * stdDev,
        };
    }
    analyzeVolumeTrend(volumes) {
        const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
        const recentVolume = volumes.slice(-5).reduce((sum, vol) => sum + vol, 0) / 5;
        return {
            current: recentVolume,
            average: avgVolume,
            trend: recentVolume > avgVolume * 1.2 ? 'increasing' : 'normal',
        };
    }
    calculateMomentum(prices, period) {
        if (prices.length < period + 1)
            return 0;
        const current = prices[prices.length - 1];
        const previous = prices[prices.length - 1 - period];
        return ((current - previous) / previous) * 100;
    }
    calculateReturns(data) {
        const returns = [];
        for (let i = 1; i < data.length; i++) {
            const returnValue = (data[i].value - data[i - 1].value) / data[i - 1].value;
            returns.push(returnValue);
        }
        return returns;
    }
    calculateRollingVolatility(returns, windowSize) {
        const volatilities = [];
        for (let i = windowSize; i < returns.length; i++) {
            const window = returns.slice(i - windowSize, i);
            const mean = window.reduce((sum, ret) => sum + ret, 0) / window.length;
            const variance = window.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
                window.length;
            volatilities.push(Math.sqrt(variance) * Math.sqrt(252));
        }
        return volatilities;
    }
    determineVolatilityTrend(recentVolatility) {
        if (recentVolatility.length < 2)
            return 'stable';
        const first = recentVolatility[0];
        const last = recentVolatility[recentVolatility.length - 1];
        const change = (last - first) / first;
        if (change > 0.1)
            return 'increasing';
        if (change < -0.1)
            return 'decreasing';
        return 'stable';
    }
    detectHeadAndShoulders(data) {
        const prices = data.map((d) => d.value);
        if (prices.length < 20)
            return null;
        const recent = prices.slice(-20);
        const leftShoulder = Math.max(...recent.slice(0, 5));
        const head = Math.max(...recent.slice(5, 10));
        const rightShoulder = Math.max(...recent.slice(10, 15));
        if (head > leftShoulder &&
            head > rightShoulder &&
            Math.abs(leftShoulder - rightShoulder) / leftShoulder < 0.1) {
            return {
                pattern: 'Head and Shoulders',
                confidence: 0.7,
                description: 'Bearish reversal pattern detected',
                implications: 'Potential downward movement',
                timeframe: 'medium-term',
            };
        }
        return null;
    }
    detectDoublePattern(data) {
        const prices = data.map((d) => d.value);
        if (prices.length < 20)
            return null;
        const recent = prices.slice(-20);
        const peaks = this.findPeaks(recent);
        if (peaks.length >= 2) {
            const firstPeak = peaks[peaks.length - 2];
            const secondPeak = peaks[peaks.length - 1];
            if (Math.abs(firstPeak.value - secondPeak.value) / firstPeak.value <
                0.05) {
                return {
                    pattern: 'Double Top',
                    confidence: 0.6,
                    description: 'Bearish reversal pattern',
                    implications: 'Potential downward break',
                    timeframe: 'short-term',
                };
            }
        }
        return null;
    }
    detectTrianglePattern(data) {
        void data;
        return null;
    }
    detectChannelPattern(data) {
        void data;
        return null;
    }
    detectBreakoutPattern(data) {
        void data;
        return null;
    }
    findPeaks(prices) {
        const peaks = [];
        for (let i = 1; i < prices.length - 1; i++) {
            if (prices[i] > prices[i - 1] && prices[i] > prices[i + 1]) {
                peaks.push({ index: i, value: prices[i] });
            }
        }
        return peaks;
    }
    isLocalExtremum(window, position) {
        const value = window[position];
        const left = window.slice(0, position);
        const right = window.slice(position + 1);
        const isMax = left.every((v) => v <= value) && right.every((v) => v <= value);
        const isMin = left.every((v) => v >= value) && right.every((v) => v >= value);
        return isMax || isMin;
    }
    calculateDirectionScore(technical, weather, economic, weights) {
        let score = 0;
        if (technical) {
            score += (technical.rsi > 50 ? 1 : -1) * weights.technical;
        }
        if (weather) {
            score += weather.overallImpact * weights.weather;
        }
        if (economic) {
            score += economic.overallImpact * weights.economic;
        }
        return Math.max(-1, Math.min(1, score));
    }
    calculateStrengthScore(technical, weather, economic, weights) {
        let strength = 0;
        if (technical) {
            strength += (Math.abs(technical.rsi - 50) / 50) * weights.technical;
        }
        if (weather) {
            strength += Math.abs(weather.overallImpact) * weights.weather;
        }
        if (economic) {
            strength += Math.abs(economic.overallImpact) * weights.economic;
        }
        return Math.max(0, Math.min(1, strength));
    }
    calculateConfidenceScore(technical, weather, economic) {
        let confidence = 0.5;
        let factors = 1;
        if (technical) {
            confidence += 0.2;
            factors++;
        }
        if (weather) {
            confidence += 0.1;
            factors++;
        }
        if (economic) {
            confidence += 0.2;
            factors++;
        }
        return Math.max(0.3, Math.min(0.95, confidence / factors));
    }
    scoreToDirection(score) {
        if (score > 0.3)
            return TrendDirection.UP;
        if (score < -0.3)
            return TrendDirection.DOWN;
        if (Math.abs(score) < 0.1)
            return TrendDirection.SIDEWAYS;
        return TrendDirection.VOLATILE;
    }
    scoreToStrength(score) {
        if (score > 0.8)
            return TrendStrength.VERY_STRONG;
        if (score > 0.6)
            return TrendStrength.STRONG;
        if (score > 0.4)
            return TrendStrength.MODERATE;
        return TrendStrength.WEAK;
    }
    calculateExpectedChange(directionScore, strengthScore) {
        return directionScore * strengthScore * 0.15;
    }
    calculateTemperatureImpact(temp) {
        const optimal = 20;
        const deviation = Math.abs(temp - optimal);
        return -deviation * 0.01;
    }
    calculateWindImpact(windSpeed) {
        if (windSpeed >= 3 && windSpeed <= 25) {
            return windSpeed * 0.002;
        }
        return 0;
    }
    calculatePrecipitationImpact(precipitation) {
        return precipitation * 0.001;
    }
    calculateOverallWeatherImpact(weatherData) {
        const impacts = weatherData.map((d) => this.calculateTemperatureImpact(d.temperature) +
            this.calculateWindImpact(d.windSpeed) +
            this.calculatePrecipitationImpact(d.precipitation));
        return impacts.reduce((sum, impact) => sum + impact, 0) / impacts.length;
    }
    calculateGDPImpact(current, previous) {
        const growth = (current - previous) / previous;
        return growth * 0.3;
    }
    calculateInflationImpact(current, previous) {
        const change = current - previous;
        return change * 0.05;
    }
    calculateInterestImpact(current, previous) {
        const change = current - previous;
        return -change * 0.02;
    }
    calculateUnemploymentImpact(current, previous) {
        const change = current - previous;
        return -change * 0.03;
    }
    calculateOverallEconomicImpact(current, previous) {
        const impacts = [
            this.calculateGDPImpact(current.gdp, previous.gdp),
            this.calculateInflationImpact(current.inflation, previous.inflation),
            this.calculateInterestImpact(current.interestRate, previous.interestRate),
            this.calculateUnemploymentImpact(current.unemployment, previous.unemployment),
        ];
        return impacts.reduce((sum, impact) => sum + impact, 0) / impacts.length;
    }
};
exports.TrendPredictionService = TrendPredictionService;
exports.TrendPredictionService = TrendPredictionService = TrendPredictionService_1 = __decorate([
    (0, common_1.Injectable)()
], TrendPredictionService);
//# sourceMappingURL=trend-prediction.service.js.map