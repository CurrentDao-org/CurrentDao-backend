export declare enum RiskType {
    MARKET = "market",
    CREDIT = "credit",
    OPERATIONAL = "operational",
    LIQUIDITY = "liquidity",
    REGULATORY = "regulatory"
}
export declare enum RiskLevel {
    LOW = 1,
    MEDIUM = 2,
    HIGH = 3,
    CRITICAL = 4
}
export declare class RiskAssessmentDto {
    portfolioId: string;
    riskType: RiskType;
    portfolioValue: number;
    marketData?: object;
    historicalData?: object;
    assessmentNotes?: string;
}
export declare class RiskMonitoringDto {
    portfolioId: string;
    varConfidence?: number;
    timeHorizon?: number;
    enableRealTimeAlerts?: boolean;
}
export declare class HedgingStrategyDto {
    portfolioId: string;
    hedgeRatio: number;
    instrument: string;
    maturity: number;
    customParameters?: object;
}
export declare class StressTestDto {
    portfolioId: string;
    scenarios: string[];
    shockMagnitude?: number;
    customScenario?: object;
}
export declare class VarCalculationDto {
    portfolioId: string;
    confidence: number;
    timeHorizon: number;
    method: 'historical' | 'parametric' | 'monte_carlo';
    simulations?: number;
}
export declare class RiskReportDto {
    portfolioId: string;
    reportType: 'daily' | 'weekly' | 'monthly' | 'on_demand';
    includeMetrics?: string[];
    format?: 'json' | 'pdf' | 'csv';
}
