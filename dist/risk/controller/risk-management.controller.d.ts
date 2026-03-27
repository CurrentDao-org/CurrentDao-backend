import { RiskAssessorService } from '../assessment/risk-assessor.service';
import { RealTimeMonitorService } from '../monitoring/real-time-monitor.service';
import { HedgingStrategyService } from '../hedging/hedging-strategy.service';
import { VarCalculatorService } from '../calculations/var-calculator.service';
import { StressTestService } from '../testing/stress-test.service';
import { RiskAssessmentDto, RiskMonitoringDto, HedgingStrategyDto, VarCalculationDto, StressTestDto, RiskReportDto } from '../dto/risk-assessment.dto';
export declare class RiskManagementController {
    private readonly riskAssessorService;
    private readonly realTimeMonitorService;
    private readonly hedgingStrategyService;
    private readonly varCalculatorService;
    private readonly stressTestService;
    constructor(riskAssessorService: RiskAssessorService, realTimeMonitorService: RealTimeMonitorService, hedgingStrategyService: HedgingStrategyService, varCalculatorService: VarCalculatorService, stressTestService: StressTestService);
    assessRisk(riskAssessmentDto: RiskAssessmentDto): Promise<import("../entities/risk-data.entity").RiskDataEntity>;
    getRiskAssessment(portfolioId: string): Promise<import("../entities/risk-data.entity").RiskDataEntity[]>;
    startMonitoring(monitoringDto: RiskMonitoringDto): Promise<{
        message: string;
        portfolioId: string;
    }>;
    stopMonitoring(portfolioId: string): Promise<{
        message: string;
        portfolioId: string;
    }>;
    createHedgingStrategy(hedgingDto: HedgingStrategyDto): Promise<object>;
    evaluateHedgingPerformance(portfolioId: string): Promise<object>;
    adjustHedgingStrategy(portfolioId: string, adjustments: object): Promise<object>;
    calculateVar(varDto: VarCalculationDto): Promise<object>;
    compareVarMethods(portfolioId: string, confidence?: number, timeHorizon?: number): Promise<Record<string, any>>;
    runStressTest(stressTestDto: StressTestDto): Promise<object>;
    getStressTestLibrary(): Promise<object>;
    generateRiskReport(reportDto: RiskReportDto): Promise<object>;
    getRiskDashboard(portfolioId: string): Promise<object>;
    getRiskAlerts(severity?: string, portfolioId?: string): Promise<object[]>;
    getRiskMetricsSummary(): Promise<object>;
    private generateReport;
    private getDashboardData;
    private getAlerts;
    private getMetricsSummary;
    private generateReportSummary;
    private getRiskTrendData;
}
