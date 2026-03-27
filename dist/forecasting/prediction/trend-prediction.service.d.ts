import { TimeSeriesData } from '../models/time-series.service';
import { WeatherData } from '../integrations/weather-data.service';
import { EconomicData } from '../analysis/economic-indicator.service';
export declare enum TrendDirection {
    UP = "up",
    DOWN = "down",
    SIDEWAYS = "sideways",
    VOLATILE = "volatile"
}
export declare enum TrendStrength {
    WEAK = "weak",
    MODERATE = "moderate",
    STRONG = "strong",
    VERY_STRONG = "very_strong"
}
export interface TrendPrediction {
    direction: TrendDirection;
    strength: TrendStrength;
    confidence: number;
    timeframe: string;
    expectedChange: number;
    riskFactors: string[];
    keyDrivers: string[];
    reversalPoints: Date[];
    supportLevels: number[];
    resistanceLevels: number[];
}
export interface MarketSignal {
    type: 'buy' | 'sell' | 'hold';
    strength: number;
    reason: string;
    timeframe: string;
    confidence: number;
}
export interface PatternRecognition {
    pattern: string;
    confidence: number;
    description: string;
    implications: string;
    timeframe: string;
}
export declare class TrendPredictionService {
    private readonly logger;
    predictMarketTrend(timeSeriesData: TimeSeriesData[], weatherData?: WeatherData[], economicData?: EconomicData[]): Promise<TrendPrediction>;
    detectMajorShifts(historicalData: TimeSeriesData[], windowSize?: number): Promise<{
        timestamp: Date;
        shiftType: string;
        magnitude: number;
        confidence: number;
    }[]>;
    generateMarketSignals(trendPrediction: TrendPrediction, currentPosition?: 'long' | 'short' | 'neutral'): Promise<MarketSignal[]>;
    recognizePatterns(timeSeriesData: TimeSeriesData[]): Promise<PatternRecognition[]>;
    calculateVolatility(timeSeriesData: TimeSeriesData[], windowSize?: number): Promise<{
        current: number;
        average: number;
        trend: 'increasing' | 'decreasing' | 'stable';
    }>;
    private analyzeTechnicalIndicators;
    private analyzeWeatherImpact;
    private analyzeEconomicImpact;
    private combineSignals;
    private identifyPatterns;
    private determineTimeframe;
    private identifyRiskFactors;
    private identifyKeyDrivers;
    private predictReversalPoints;
    private calculateSupportLevels;
    private calculateResistanceLevels;
    private detectShift;
    private generatePrimarySignal;
    private generateRiskSignals;
    private generateLevelSignals;
    private calculateSMA;
    private calculateRSI;
    private calculateMACD;
    private calculateEMA;
    private calculateBollingerBands;
    private analyzeVolumeTrend;
    private calculateMomentum;
    private calculateReturns;
    private calculateRollingVolatility;
    private determineVolatilityTrend;
    private detectHeadAndShoulders;
    private detectDoublePattern;
    private detectTrianglePattern;
    private detectChannelPattern;
    private detectBreakoutPattern;
    private findPeaks;
    private isLocalExtremum;
    private calculateDirectionScore;
    private calculateStrengthScore;
    private calculateConfidenceScore;
    private scoreToDirection;
    private scoreToStrength;
    private calculateExpectedChange;
    private calculateTemperatureImpact;
    private calculateWindImpact;
    private calculatePrecipitationImpact;
    private calculateOverallWeatherImpact;
    private calculateGDPImpact;
    private calculateInflationImpact;
    private calculateInterestImpact;
    private calculateUnemploymentImpact;
    private calculateOverallEconomicImpact;
}
