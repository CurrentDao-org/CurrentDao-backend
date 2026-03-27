export declare enum ForecastHorizon {
    ONE_HOUR = "1h",
    SIX_HOURS = "6h",
    TWENTY_FOUR_HOURS = "24h",
    ONE_WEEK = "1w",
    ONE_MONTH = "1m",
    THREE_MONTHS = "3m",
    SIX_MONTHS = "6m",
    ONE_YEAR = "1y"
}
export declare enum ForecastStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed"
}
export declare class ForecastData {
    id: string;
    marketType: string;
    forecastHorizon: ForecastHorizon;
    predictedValue: number;
    confidenceIntervalLower: number;
    confidenceIntervalUpper: number;
    accuracy: number;
    modelWeights: Record<string, number>;
    inputData: Record<string, any>;
    status: ForecastStatus;
    errorMessage: string;
    targetDate: Date;
    createdAt: Date;
    updatedAt: Date;
}
