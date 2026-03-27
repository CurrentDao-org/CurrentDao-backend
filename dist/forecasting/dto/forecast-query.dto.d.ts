import { ForecastHorizon } from '../entities/forecast-data.entity';
export declare class ForecastQueryDto {
    marketType: string;
    forecastHorizon: ForecastHorizon;
    startDate?: string;
    endDate?: string;
    confidenceLevel?: number;
    models?: string[];
    ensembleSize?: number;
}
export declare class HistoricalDataQueryDto {
    marketType: string;
    startDate: string;
    endDate: string;
    limit?: number;
}
export declare class EnsembleConfigDto {
    models: string[];
    weights?: number[];
    diversityThreshold?: number;
    votingMethod?: string;
}
export declare class WeatherIntegrationDto {
    location: string;
    startDate: string;
    endDate: string;
    parameters?: string[];
}
export declare class EconomicIndicatorDto {
    indicators: string[];
    startDate: string;
    endDate: string;
    region?: string;
}
