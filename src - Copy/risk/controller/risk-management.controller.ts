import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RiskAssessorService } from '../assessment/risk-assessor.service';
import { RealTimeMonitorService } from '../monitoring/real-time-monitor.service';
import { HedgingStrategyService } from '../hedging/hedging-strategy.service';
import { VarCalculatorService } from '../calculations/var-calculator.service';
import { StressTestService } from '../testing/stress-test.service';
import {
  RiskAssessmentDto,
  RiskMonitoringDto,
  HedgingStrategyDto,
  VarCalculationDto,
  StressTestDto,
  RiskReportDto,
} from '../dto/risk-assessment.dto';

@ApiTags('Risk Management')
@Controller('risk')
export class RiskManagementController {
  constructor(
    private readonly riskAssessorService: RiskAssessorService,
    private readonly realTimeMonitorService: RealTimeMonitorService,
    private readonly hedgingStrategyService: HedgingStrategyService,
    private readonly varCalculatorService: VarCalculatorService,
    private readonly stressTestService: StressTestService,
  ) {}

  @Post('assessment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perform risk assessment for a portfolio' })
  @ApiResponse({
    status: 200,
    description: 'Risk assessment completed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid risk assessment data' })
  async assessRisk(@Body() riskAssessmentDto: RiskAssessmentDto) {
    return this.riskAssessorService.assessRisk(riskAssessmentDto);
  }

  @Get('assessment/:portfolioId')
  @ApiOperation({ summary: 'Get risk assessment history for a portfolio' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiResponse({
    status: 200,
    description: 'Risk assessment history retrieved successfully',
  })
  async getRiskAssessment(@Param('portfolioId') portfolioId: string) {
    return this.riskAssessorService.getRiskAssessment(portfolioId);
  }

  @Post('monitoring/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start real-time risk monitoring for a portfolio' })
  @ApiResponse({
    status: 200,
    description: 'Real-time monitoring started successfully',
  })
  async startMonitoring(@Body() monitoringDto: RiskMonitoringDto) {
    await this.realTimeMonitorService.startMonitoring(monitoringDto);
    return {
      message: 'Real-time monitoring started',
      portfolioId: monitoringDto.portfolioId,
    };
  }

  @Post('monitoring/stop/:portfolioId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop real-time risk monitoring for a portfolio' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiResponse({
    status: 200,
    description: 'Real-time monitoring stopped successfully',
  })
  async stopMonitoring(@Param('portfolioId') portfolioId: string) {
    await this.realTimeMonitorService.stopMonitoring(portfolioId);
    return { message: 'Real-time monitoring stopped', portfolioId };
  }

  @Post('hedging/strategy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create hedging strategy for a portfolio' })
  @ApiResponse({
    status: 200,
    description: 'Hedging strategy created successfully',
  })
  async createHedgingStrategy(@Body() hedgingDto: HedgingStrategyDto) {
    return this.hedgingStrategyService.createHedgingStrategy(hedgingDto);
  }

  @Get('hedging/performance/:portfolioId')
  @ApiOperation({ summary: 'Evaluate hedging strategy performance' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiResponse({
    status: 200,
    description: 'Hedging performance evaluated successfully',
  })
  async evaluateHedgingPerformance(@Param('portfolioId') portfolioId: string) {
    return this.hedgingStrategyService.evaluateHedgingPerformance(portfolioId);
  }

  @Post('hedging/adjust/:portfolioId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Adjust hedging strategy for a portfolio' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiResponse({
    status: 200,
    description: 'Hedging strategy adjusted successfully',
  })
  async adjustHedgingStrategy(
    @Param('portfolioId') portfolioId: string,
    @Body() adjustments: object,
  ) {
    return this.hedgingStrategyService.adjustHedgingStrategy(
      portfolioId,
      adjustments,
    );
  }

  @Post('var/calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate Value at Risk (VaR) for a portfolio' })
  @ApiResponse({
    status: 200,
    description: 'VaR calculation completed successfully',
  })
  async calculateVar(@Body() varDto: VarCalculationDto) {
    return this.varCalculatorService.calculateVar(varDto);
  }

  @Get('var/compare/:portfolioId')
  @ApiOperation({ summary: 'Compare VaR calculation methods for a portfolio' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiQuery({
    name: 'confidence',
    description: 'Confidence level (0.95-0.99)',
    required: false,
  })
  @ApiQuery({
    name: 'timeHorizon',
    description: 'Time horizon in days',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'VaR methods comparison completed successfully',
  })
  async compareVarMethods(
    @Param('portfolioId') portfolioId: string,
    @Query('confidence') confidence: number = 0.95,
    @Query('timeHorizon') timeHorizon: number = 10,
  ) {
    return this.varCalculatorService.compareVarMethods(
      portfolioId,
      confidence,
      timeHorizon,
    );
  }

  @Post('stress-test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run stress test scenarios for a portfolio' })
  @ApiResponse({
    status: 200,
    description: 'Stress test completed successfully',
  })
  async runStressTest(@Body() stressTestDto: StressTestDto) {
    return this.stressTestService.runStressTest(stressTestDto);
  }

  @Get('stress-test/library')
  @ApiOperation({ summary: 'Get available stress test scenarios library' })
  @ApiResponse({
    status: 200,
    description: 'Stress test library retrieved successfully',
  })
  async getStressTestLibrary() {
    return this.stressTestService.getStressTestLibrary();
  }

  @Post('reports/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate risk report for a portfolio' })
  @ApiResponse({
    status: 200,
    description: 'Risk report generated successfully',
  })
  async generateRiskReport(@Body() reportDto: RiskReportDto) {
    return this.generateReport(reportDto);
  }

  @Get('dashboard/:portfolioId')
  @ApiOperation({ summary: 'Get risk dashboard data for a portfolio' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiResponse({
    status: 200,
    description: 'Risk dashboard data retrieved successfully',
  })
  async getRiskDashboard(@Param('portfolioId') portfolioId: string) {
    return this.getDashboardData(portfolioId);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get active risk alerts' })
  @ApiQuery({
    name: 'severity',
    description: 'Filter by severity level',
    required: false,
  })
  @ApiQuery({
    name: 'portfolioId',
    description: 'Filter by portfolio ID',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Risk alerts retrieved successfully',
  })
  async getRiskAlerts(
    @Query('severity') severity?: string,
    @Query('portfolioId') portfolioId?: string,
  ) {
    return this.getAlerts(severity, portfolioId);
  }

  @Get('metrics/summary')
  @ApiOperation({ summary: 'Get overall risk metrics summary' })
  @ApiResponse({
    status: 200,
    description: 'Risk metrics summary retrieved successfully',
  })
  async getRiskMetricsSummary() {
    return this.getMetricsSummary();
  }

  // Private helper methods for report generation and dashboard data
  private async generateReport(reportDto: RiskReportDto): Promise<object> {
    const { portfolioId, reportType, includeMetrics, format } = reportDto;

    const reportData = {
      portfolioId,
      reportType,
      generatedAt: new Date(),
      format: format || 'json',
      metrics: {
        riskAssessment:
          await this.riskAssessorService.getRiskAssessment(portfolioId),
        varMetrics: await this.varCalculatorService.compareVarMethods(
          portfolioId,
          0.95,
          10,
        ),
        stressTestResults: await this.stressTestService.runStressTest({
          portfolioId,
          scenarios: ['market_crash', 'interest_rate_shock', 'currency_crisis'],
        }),
        hedgingPerformance:
          await this.hedgingStrategyService.evaluateHedgingPerformance(
            portfolioId,
          ),
      },
      summary: await this.generateReportSummary(portfolioId),
    };

    return reportData;
  }

  private async getDashboardData(portfolioId: string): Promise<object> {
    const [
      riskAssessment,
      varComparison,
      hedgingPerformance,
      stressTestResults,
    ] = await Promise.all([
      this.riskAssessorService.getRiskAssessment(portfolioId),
      this.varCalculatorService.compareVarMethods(portfolioId, 0.95, 10),
      this.hedgingStrategyService.evaluateHedgingPerformance(portfolioId),
      this.stressTestService.runStressTest({
        portfolioId,
        scenarios: ['market_crash', 'interest_rate_shock'],
      }),
    ]);

    const varComparisonData = varComparison;
    const hedgingPerformanceData = hedgingPerformance as Record<string, any>;
    const stressTestData = stressTestResults as Record<string, any>;

    return {
      portfolioId,
      lastUpdated: new Date(),
      overview: {
        currentRiskLevel: riskAssessment[0]?.riskLevel || 2,
        varValue: varComparisonData.comparison?.lowestVar,
        hedgingEffectiveness: hedgingPerformanceData.actualEffectiveness,
        stressTestResilience: stressTestData.summary?.overallResilience,
      },
      charts: {
        riskTrend: await this.getRiskTrendData(portfolioId),
        varComparison,
        stressTestResults: stressTestData.scenarios,
      },
      alerts: await this.getAlerts(undefined, portfolioId),
      recommendations: stressTestData.recommendations,
    };
  }

  private async getAlerts(
    severity?: string,
    portfolioId?: string,
  ): Promise<object[]> {
    // Mock alerts data - in production, this would query actual alerts
    const alerts = [
      {
        id: '1',
        portfolioId: 'portfolio-1',
        severity: 'HIGH',
        type: 'RISK_THRESHOLD',
        message: 'Risk level exceeded threshold',
        timestamp: new Date(),
        acknowledged: false,
      },
      {
        id: '2',
        portfolioId: 'portfolio-2',
        severity: 'MEDIUM',
        type: 'VAR_BREACH',
        message: 'VaR breach detected',
        timestamp: new Date(),
        acknowledged: true,
      },
    ];

    let filteredAlerts = alerts;

    if (severity) {
      filteredAlerts = filteredAlerts.filter(
        (alert) => alert.severity === severity,
      );
    }

    if (portfolioId) {
      filteredAlerts = filteredAlerts.filter(
        (alert) => alert.portfolioId === portfolioId,
      );
    }

    return filteredAlerts;
  }

  private async getMetricsSummary(): Promise<object> {
    return {
      totalPortfolios: 150,
      activeMonitoring: 45,
      highRiskPortfolios: 12,
      criticalAlerts: 3,
      averageVar: 75000,
      totalHedgedValue: 50000000,
      stressTestCoverage: 0.95,
      lastUpdated: new Date(),
    };
  }

  private async generateReportSummary(portfolioId: string): Promise<object> {
    return {
      riskLevel: 'MEDIUM',
      riskTrend: 'STABLE',
      keyRisks: ['Market risk', 'Liquidity risk'],
      mitigations: ['Hedging program active', 'Liquidity buffer maintained'],
      recommendations: [
        'Consider increasing hedge ratio',
        'Monitor market volatility closely',
      ],
      compliance: 'COMPLIANT',
    };
  }

  private async getRiskTrendData(portfolioId: string): Promise<object> {
    // Mock trend data - in production, this would query historical data
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Risk Level',
          data: [2.1, 2.3, 2.0, 2.5, 2.4, 2.2],
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
        },
        {
          label: 'VaR ($)',
          data: [45000, 52000, 48000, 58000, 55000, 50000],
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
        },
      ],
    };
  }
}
