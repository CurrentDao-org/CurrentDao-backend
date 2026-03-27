import { ForecastHorizon } from '../entities/forecast-data.entity';
export interface TimeSeriesData {
    timestamp: Date;
    value: number;
    volume?: number;
    metadata?: Record<string, any>;
}
export interface ForecastResult {
    predictedValue: number;
    confidenceInterval: {
        lower: number;
        upper: number;
    };
    accuracy: number;
    model: string;
    horizon: ForecastHorizon;
    metadata?: Record<string, any>;
}
export interface ModelMetrics {
    mae: number;
    rmse: number;
    mape: number;
    r2: number;
}
export declare class TimeSeriesService {
    private readonly logger;
    arimaForecast(data: TimeSeriesData[], horizon: ForecastHorizon): Promise<ForecastResult>;
    exponentialSmoothingForecast(data: TimeSeriesData[], horizon: ForecastHorizon): Promise<ForecastResult>;
    lstmForecast(data: TimeSeriesData[], horizon: ForecastHorizon): Promise<ForecastResult>;
    prophetForecast(data: TimeSeriesData[], horizon: ForecastHorizon): Promise<ForecastResult>;
    evaluateModel(data: TimeSeriesData[], model: string): Promise<ModelMetrics>;
    private runModel;
    private optimizeARIMAParams;
    private fitARIMA;
    private optimizeExponentialSmoothingParams;
    private fitExponentialSmoothing;
    private fitLSTM;
    private fitProphet;
    private calculateTrend;
    private getHorizonPeriods;
    private calculateAccuracy;
    private calculateMetrics;
    preprocessData(data: TimeSeriesData[]): TimeSeriesData[];
    private outlierDetection;
    private percentile;
    private ensureSufficientData;
}
