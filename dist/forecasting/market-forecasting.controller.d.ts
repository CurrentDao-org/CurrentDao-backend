import { ForecastQueryDto, EnsembleConfigDto } from './dto/forecast-query.dto';
import { TimeSeriesService, ForecastResult } from './models/time-series.service';
import { WeatherDataService, WeatherData } from './integrations/weather-data.service';
import { EconomicIndicatorService, EconomicData } from './analysis/economic-indicator.service';
import { TrendPredictionService, TrendPrediction, MarketSignal, PatternRecognition } from './prediction/trend-prediction.service';
import { EnsembleMethodsService, EnsembleConfig, EnsembleResult } from './ensemble/ensemble-methods.service';
export declare class MarketForecastingController {
    private readonly timeSeriesService;
    private readonly weatherDataService;
    private readonly economicIndicatorService;
    private readonly trendPredictionService;
    private readonly ensembleMethodsService;
    private readonly logger;
    constructor(timeSeriesService: TimeSeriesService, weatherDataService: WeatherDataService, economicIndicatorService: EconomicIndicatorService, trendPredictionService: TrendPredictionService, ensembleMethodsService: EnsembleMethodsService);
    generateForecast(query: ForecastQueryDto): Promise<ForecastResult>;
    generateEnsembleForecast(body: {
        query: ForecastQueryDto;
        config: EnsembleConfigDto;
    }): Promise<EnsembleResult>;
    optimizeEnsemble(query: ForecastQueryDto): Promise<EnsembleConfig>;
    predictTrend(query: ForecastQueryDto): Promise<TrendPrediction>;
    generateMarketSignals(body: {
        query: ForecastQueryDto;
        currentPosition?: 'long' | 'short' | 'neutral';
    }): Promise<MarketSignal[]>;
    recognizePatterns(query: ForecastQueryDto): Promise<PatternRecognition[]>;
    calculateVolatility(marketType: string, windowSize?: number): Promise<any>;
    getWeatherDataEndpoint(location: string, startDate?: string, endDate?: string): Promise<WeatherData[]>;
    getEconomicIndicators(region?: string, startDate?: string, endDate?: string): Promise<EconomicData>;
    getAvailableModels(): {
        name: string;
        description: string;
        suitableFor: string[];
    }[];
    getAvailableHorizons(): {
        value: string;
        label: string;
        description: string;
    }[];
    getModelPerformance(marketType: string): Promise<any>;
    private getHistoricalData;
    private getWeatherDataFromQuery;
    private getEconomicData;
    private runModel;
}
