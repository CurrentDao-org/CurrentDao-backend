import { TimeSeriesService, ForecastResult, TimeSeriesData } from '../models/time-series.service';
import { WeatherData } from '../integrations/weather-data.service';
import { EconomicData } from '../analysis/economic-indicator.service';
import { ForecastHorizon } from '../entities/forecast-data.entity';
export interface EnsembleConfig {
    models: string[];
    weights?: number[];
    diversityThreshold?: number;
    votingMethod?: 'weighted' | 'majority' | 'ranked';
    errorReductionMethod?: 'bagging' | 'boosting' | 'stacking';
}
export interface EnsembleResult {
    forecast: ForecastResult;
    individualForecasts: ForecastResult[];
    ensembleWeights: Record<string, number>;
    diversity: number;
    errorReduction: number;
    confidence: number;
    metadata: {
        method: string;
        modelCount: number;
        agreement: number;
        variance: number;
    };
}
export interface ModelPerformance {
    model: string;
    accuracy: number;
    mae: number;
    rmse: number;
    mape: number;
    bias: number;
    variance: number;
    consistency: number;
}
export declare class EnsembleMethodsService {
    private readonly timeSeriesService;
    private readonly logger;
    constructor(timeSeriesService: TimeSeriesService);
    createEnsembleForecast(data: TimeSeriesData[], horizon: ForecastHorizon, config: EnsembleConfig, weatherData?: WeatherData[], economicData?: EconomicData[]): Promise<EnsembleResult>;
    optimizeEnsemble(data: TimeSeriesData[], horizon: ForecastHorizon, candidateModels: string[], validationSplit?: number): Promise<EnsembleConfig>;
    baggingEnsemble(data: TimeSeriesData[], horizon: ForecastHorizon, models: string[], numBootstrap?: number): Promise<EnsembleResult>;
    boostingEnsemble(data: TimeSeriesData[], horizon: ForecastHorizon, models: string[], numIterations?: number): Promise<EnsembleResult>;
    stackingEnsemble(data: TimeSeriesData[], horizon: ForecastHorizon, baseModels: string[], metaModel?: string): Promise<EnsembleResult>;
    evaluateEnsemblePerformance(ensembleResults: EnsembleResult[], actualData: TimeSeriesData[]): Promise<{
        overallAccuracy: number;
        errorReduction: number;
        consistency: number;
        reliability: number;
    }>;
    private generateIndividualForecasts;
    private enhanceForecastWithExternalData;
    private calculateOptimalWeights;
    private applyEnsembleMethod;
    private weightedAverage;
    private majorityVoting;
    private rankedVoting;
    private calculateDiversity;
    private calculateErrorReduction;
    private calculateEnsembleConfidence;
    private calculateAgreement;
    private calculateForecastVariance;
    private calculateVariance;
    private evaluateModels;
    private selectBestModels;
    private calculateWeightsFromPerformance;
    private createBootstrapSample;
    private aggregateBootstrapForecasts;
    private calculateBootstrapWeights;
    private calculateBootstrapErrorReduction;
    private calculateBootstrapConfidence;
    private calculateResiduals;
    private updateDataWeights;
    private createBoostedForecast;
    private createWeightMap;
    private calculateBoostingErrorReduction;
    private calculateBoostingConfidence;
    private createCrossValidationFolds;
    private trainMetaModel;
    private trainLinearRegression;
    private trainRidgeRegression;
    private trainLassoRegression;
    private applyMetaModel;
    private calculateStackingErrorReduction;
    private calculateStackingConfidence;
    private calculateReliability;
    private calculateCorrelation;
}
