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
var EconomicIndicatorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EconomicIndicatorService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let EconomicIndicatorService = EconomicIndicatorService_1 = class EconomicIndicatorService {
    constructor(httpService) {
        this.httpService = httpService;
        this.logger = new common_1.Logger(EconomicIndicatorService_1.name);
        this.fredApiKey = process.env.FRED_API_KEY;
        this.alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY;
    }
    async getGDPData(region = 'US', startDate, endDate) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get('https://api.stlouisfed.org/fred/series/observations', {
                params: {
                    series_id: this.getGDPSeriesId(region),
                    api_key: this.fredApiKey,
                    observation_start: startDate.toISOString().split('T')[0],
                    observation_end: endDate.toISOString().split('T')[0],
                    file_type: 'json',
                },
            }));
            return response.data.observations.map((obs) => ({
                name: 'GDP',
                value: parseFloat(obs.value) || 0,
                unit: 'Billions USD',
                timestamp: new Date(obs.date),
                source: 'FRED',
                region,
            }));
        }
        catch (error) {
            this.logger.error('Failed to fetch GDP data', error);
            return this.getMockGDPData(region, startDate, endDate);
        }
    }
    async getInflationData(region = 'US', startDate, endDate) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get('https://api.stlouisfed.org/fred/series/observations', {
                params: {
                    series_id: this.getInflationSeriesId(region),
                    api_key: this.fredApiKey,
                    observation_start: startDate.toISOString().split('T')[0],
                    observation_end: endDate.toISOString().split('T')[0],
                    file_type: 'json',
                },
            }));
            return response.data.observations.map((obs) => ({
                name: 'Inflation',
                value: parseFloat(obs.value) || 0,
                unit: 'Percent',
                timestamp: new Date(obs.date),
                source: 'FRED',
                region,
            }));
        }
        catch (error) {
            this.logger.error('Failed to fetch inflation data', error);
            return this.getMockInflationData(region, startDate, endDate);
        }
    }
    async getUnemploymentData(region = 'US', startDate, endDate) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get('https://api.stlouisfed.org/fred/series/observations', {
                params: {
                    series_id: this.getUnemploymentSeriesId(region),
                    api_key: this.fredApiKey,
                    observation_start: startDate.toISOString().split('T')[0],
                    observation_end: endDate.toISOString().split('T')[0],
                    file_type: 'json',
                },
            }));
            return response.data.observations.map((obs) => ({
                name: 'Unemployment',
                value: parseFloat(obs.value) || 0,
                unit: 'Percent',
                timestamp: new Date(obs.date),
                source: 'FRED',
                region,
            }));
        }
        catch (error) {
            this.logger.error('Failed to fetch unemployment data', error);
            return this.getMockUnemploymentData(region, startDate, endDate);
        }
    }
    async getInterestRateData(region = 'US', startDate, endDate) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get('https://api.stlouisfed.org/fred/series/observations', {
                params: {
                    series_id: this.getInterestRateSeriesId(region),
                    api_key: this.fredApiKey,
                    observation_start: startDate.toISOString().split('T')[0],
                    observation_end: endDate.toISOString().split('T')[0],
                    file_type: 'json',
                },
            }));
            return response.data.observations.map((obs) => ({
                name: 'Interest Rate',
                value: parseFloat(obs.value) || 0,
                unit: 'Percent',
                timestamp: new Date(obs.date),
                source: 'FRED',
                region,
            }));
        }
        catch (error) {
            this.logger.error('Failed to fetch interest rate data', error);
            return this.getMockInterestRateData(region, startDate, endDate);
        }
    }
    async getEnergyPrices(region = 'US', startDate, endDate) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get('https://www.alphavantage.co/query', {
                params: {
                    function: 'GLOBAL_QUOTE',
                    symbol: this.getEnergySymbol(region),
                    apikey: this.alphaVantageApiKey,
                },
            }));
            const data = response.data['Global Quote'];
            return [
                {
                    name: 'Energy Prices',
                    value: parseFloat(data['05. price']) || 0,
                    unit: 'USD',
                    timestamp: new Date(),
                    source: 'Alpha Vantage',
                    region,
                },
            ];
        }
        catch (error) {
            this.logger.error('Failed to fetch energy prices', error);
            return this.getMockEnergyPrices(region, startDate, endDate);
        }
    }
    async getEconomicSnapshot(region = 'US') {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 12);
        const [gdpData, inflationData, unemploymentData, interestRateData, energyPricesData,] = await Promise.all([
            this.getGDPData(region, startDate, endDate),
            this.getInflationData(region, startDate, endDate),
            this.getUnemploymentData(region, startDate, endDate),
            this.getInterestRateData(region, startDate, endDate),
            this.getEnergyPrices(region, startDate, endDate),
        ]);
        return {
            gdp: this.getLatestValue(gdpData),
            inflation: this.getLatestValue(inflationData),
            unemployment: this.getLatestValue(unemploymentData),
            interestRate: this.getLatestValue(interestRateData),
            industrialProduction: this.getMockIndustrialProduction(),
            consumerConfidence: this.getMockConsumerConfidence(),
            manufacturingIndex: this.getMockManufacturingIndex(),
            retailSales: this.getMockRetailSales(),
            energyPrices: this.getLatestValue(energyPricesData),
            currencyExchange: this.getMockCurrencyExchange(),
        };
    }
    async analyzeEconomicImpact(economicData, historicalEnergyData) {
        const impacts = [];
        impacts.push({
            indicator: 'GDP',
            correlation: this.calculateCorrelation(historicalEnergyData.map((d) => d.demand), [economicData.gdp]),
            impact: this.calculateGDPImpact(economicData.gdp),
            trend: this.getTrend(economicData.gdp, 20000),
            significance: 'high',
        });
        impacts.push({
            indicator: 'Inflation',
            correlation: this.calculateCorrelation(historicalEnergyData.map((d) => d.price), [economicData.inflation]),
            impact: this.calculateInflationImpact(economicData.inflation),
            trend: this.getTrend(economicData.inflation, 2),
            significance: 'medium',
        });
        impacts.push({
            indicator: 'Interest Rate',
            correlation: this.calculateCorrelation(historicalEnergyData.map((d) => d.price), [economicData.interestRate]),
            impact: this.calculateInterestRateImpact(economicData.interestRate),
            trend: this.getTrend(economicData.interestRate, 3),
            significance: 'medium',
        });
        impacts.push({
            indicator: 'Unemployment',
            correlation: this.calculateCorrelation(historicalEnergyData.map((d) => d.demand), [economicData.unemployment]),
            impact: this.calculateUnemploymentImpact(economicData.unemployment),
            trend: this.getTrend(economicData.unemployment, 5),
            significance: 'medium',
        });
        impacts.push({
            indicator: 'Energy Prices',
            correlation: this.calculateCorrelation(historicalEnergyData.map((d) => d.price), [economicData.energyPrices]),
            impact: this.calculateEnergyPriceImpact(economicData.energyPrices),
            trend: this.getTrend(economicData.energyPrices, 100),
            significance: 'high',
        });
        return impacts;
    }
    async predictEconomicTrends(economicData) {
        const trends = {};
        const indicators = [
            'gdp',
            'inflation',
            'unemployment',
            'interestRate',
            'industrialProduction',
            'consumerConfidence',
            'manufacturingIndex',
            'retailSales',
            'energyPrices',
            'currencyExchange',
        ];
        indicators.forEach((indicator) => {
            const values = economicData.map((d) => d[indicator]);
            trends[indicator] = this.predictNextValue(values);
        });
        return trends;
    }
    getGDPSeriesId(region) {
        const seriesMap = {
            US: 'GDP',
            EU: 'CLVMNACSCAB1GQEU',
            UK: 'UKNGDP',
            JP: 'JPNRGDPEXP',
            CN: 'NGDP_CN',
        };
        return seriesMap[region] || 'GDP';
    }
    getInflationSeriesId(region) {
        const seriesMap = {
            US: 'CPIAUCSL',
            EU: 'CP0000EZ19M086NEST',
            UK: 'GBRCPIALLMINMEI',
            JP: 'JPNCPIALLMINMEI',
            CN: 'CHNCPIALLMINMEI',
        };
        return seriesMap[region] || 'CPIAUCSL';
    }
    getUnemploymentSeriesId(region) {
        const seriesMap = {
            US: 'UNRATE',
            EU: 'LRUN64TTZQEU',
            UK: 'LRUN64TTGBM',
            JP: 'LRUN64TTJPQ156S',
            CN: 'LMUNRRTTCHM156S',
        };
        return seriesMap[region] || 'UNRATE';
    }
    getInterestRateSeriesId(region) {
        const seriesMap = {
            US: 'FEDFUNDS',
            EU: 'ESTBC',
            UK: 'BOEBGCR',
            JP: 'INTSRJPM193N',
            CN: 'INTSRJPM193N',
        };
        return seriesMap[region] || 'FEDFUNDS';
    }
    getEnergySymbol(region) {
        const symbolMap = {
            US: 'CL=F',
            EU: 'BZ=F',
            UK: 'BZ=F',
            JP: 'CL=F',
            CN: 'CL=F',
        };
        return symbolMap[region] || 'CL=F';
    }
    getLatestValue(indicators) {
        return indicators.length > 0 ? indicators[indicators.length - 1].value : 0;
    }
    calculateCorrelation(x, y) {
        if (x.length !== y.length || x.length === 0)
            return 0;
        const n = x.length;
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
        const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        return denominator === 0 ? 0 : numerator / denominator;
    }
    calculateGDPImpact(gdp) {
        const baseline = 20000;
        return ((gdp - baseline) / baseline) * 0.3;
    }
    calculateInflationImpact(inflation) {
        const target = 2;
        return (inflation - target) * 0.05;
    }
    calculateInterestRateImpact(rate) {
        const baseline = 3;
        return (rate - baseline) * -0.02;
    }
    calculateUnemploymentImpact(unemployment) {
        const naturalRate = 5;
        return (unemployment - naturalRate) * -0.03;
    }
    calculateEnergyPriceImpact(price) {
        const baseline = 100;
        return (price - baseline) / baseline;
    }
    getTrend(current, baseline) {
        const diff = (current - baseline) / baseline;
        if (diff > 0.05)
            return 'increasing';
        if (diff < -0.05)
            return 'decreasing';
        return 'stable';
    }
    predictNextValue(values) {
        if (values.length < 2)
            return values[0] || 0;
        const n = values.length;
        const sumX = values.reduce((sum, _, i) => sum + i, 0);
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
        const sumX2 = values.reduce((sum, _, i) => sum + i * i, 0);
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        return slope * n + intercept;
    }
    getMockGDPData(region, startDate, endDate) {
        const data = [];
        const current = new Date(startDate);
        while (current <= endDate) {
            data.push({
                name: 'GDP',
                value: 20000 + Math.random() * 2000,
                unit: 'Billions USD',
                timestamp: new Date(current),
                source: 'Mock',
                region,
            });
            current.setMonth(current.getMonth() + 1);
        }
        return data;
    }
    getMockInflationData(region, startDate, endDate) {
        const data = [];
        const current = new Date(startDate);
        while (current <= endDate) {
            data.push({
                name: 'Inflation',
                value: 2 + Math.random() * 3,
                unit: 'Percent',
                timestamp: new Date(current),
                source: 'Mock',
                region,
            });
            current.setMonth(current.getMonth() + 1);
        }
        return data;
    }
    getMockUnemploymentData(region, startDate, endDate) {
        const data = [];
        const current = new Date(startDate);
        while (current <= endDate) {
            data.push({
                name: 'Unemployment',
                value: 3 + Math.random() * 4,
                unit: 'Percent',
                timestamp: new Date(current),
                source: 'Mock',
                region,
            });
            current.setMonth(current.getMonth() + 1);
        }
        return data;
    }
    getMockInterestRateData(region, startDate, endDate) {
        const data = [];
        const current = new Date(startDate);
        while (current <= endDate) {
            data.push({
                name: 'Interest Rate',
                value: 2 + Math.random() * 4,
                unit: 'Percent',
                timestamp: new Date(current),
                source: 'Mock',
                region,
            });
            current.setMonth(current.getMonth() + 1);
        }
        return data;
    }
    getMockEnergyPrices(region, startDate, endDate) {
        const data = [];
        const current = new Date(startDate);
        while (current <= endDate) {
            data.push({
                name: 'Energy Prices',
                value: 80 + Math.random() * 40,
                unit: 'USD',
                timestamp: new Date(current),
                source: 'Mock',
                region,
            });
            current.setMonth(current.getMonth() + 1);
        }
        return data;
    }
    getMockIndustrialProduction() {
        return 100 + Math.random() * 20;
    }
    getMockConsumerConfidence() {
        return 80 + Math.random() * 40;
    }
    getMockManufacturingIndex() {
        return 50 + Math.random() * 20;
    }
    getMockRetailSales() {
        return 500000 + Math.random() * 100000;
    }
    getMockCurrencyExchange() {
        return 1 + Math.random() * 0.2;
    }
};
exports.EconomicIndicatorService = EconomicIndicatorService;
exports.EconomicIndicatorService = EconomicIndicatorService = EconomicIndicatorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], EconomicIndicatorService);
//# sourceMappingURL=economic-indicator.service.js.map