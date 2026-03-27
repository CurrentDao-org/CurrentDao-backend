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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskManagementController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const risk_assessor_service_1 = require("../assessment/risk-assessor.service");
const real_time_monitor_service_1 = require("../monitoring/real-time-monitor.service");
const hedging_strategy_service_1 = require("../hedging/hedging-strategy.service");
const var_calculator_service_1 = require("../calculations/var-calculator.service");
const stress_test_service_1 = require("../testing/stress-test.service");
const risk_assessment_dto_1 = require("../dto/risk-assessment.dto");
let RiskManagementController = class RiskManagementController {
    constructor(riskAssessorService, realTimeMonitorService, hedgingStrategyService, varCalculatorService, stressTestService) {
        this.riskAssessorService = riskAssessorService;
        this.realTimeMonitorService = realTimeMonitorService;
        this.hedgingStrategyService = hedgingStrategyService;
        this.varCalculatorService = varCalculatorService;
        this.stressTestService = stressTestService;
    }
    async assessRisk(riskAssessmentDto) {
        return this.riskAssessorService.assessRisk(riskAssessmentDto);
    }
    async getRiskAssessment(portfolioId) {
        return this.riskAssessorService.getRiskAssessment(portfolioId);
    }
    async startMonitoring(monitoringDto) {
        await this.realTimeMonitorService.startMonitoring(monitoringDto);
        return {
            message: 'Real-time monitoring started',
            portfolioId: monitoringDto.portfolioId,
        };
    }
    async stopMonitoring(portfolioId) {
        await this.realTimeMonitorService.stopMonitoring(portfolioId);
        return { message: 'Real-time monitoring stopped', portfolioId };
    }
    async createHedgingStrategy(hedgingDto) {
        return this.hedgingStrategyService.createHedgingStrategy(hedgingDto);
    }
    async evaluateHedgingPerformance(portfolioId) {
        return this.hedgingStrategyService.evaluateHedgingPerformance(portfolioId);
    }
    async adjustHedgingStrategy(portfolioId, adjustments) {
        return this.hedgingStrategyService.adjustHedgingStrategy(portfolioId, adjustments);
    }
    async calculateVar(varDto) {
        return this.varCalculatorService.calculateVar(varDto);
    }
    async compareVarMethods(portfolioId, confidence = 0.95, timeHorizon = 10) {
        return this.varCalculatorService.compareVarMethods(portfolioId, confidence, timeHorizon);
    }
    async runStressTest(stressTestDto) {
        return this.stressTestService.runStressTest(stressTestDto);
    }
    async getStressTestLibrary() {
        return this.stressTestService.getStressTestLibrary();
    }
    async generateRiskReport(reportDto) {
        return this.generateReport(reportDto);
    }
    async getRiskDashboard(portfolioId) {
        return this.getDashboardData(portfolioId);
    }
    async getRiskAlerts(severity, portfolioId) {
        return this.getAlerts(severity, portfolioId);
    }
    async getRiskMetricsSummary() {
        return this.getMetricsSummary();
    }
    async generateReport(reportDto) {
        const { portfolioId, reportType, includeMetrics, format } = reportDto;
        const reportData = {
            portfolioId,
            reportType,
            generatedAt: new Date(),
            format: format || 'json',
            metrics: {
                riskAssessment: await this.riskAssessorService.getRiskAssessment(portfolioId),
                varMetrics: await this.varCalculatorService.compareVarMethods(portfolioId, 0.95, 10),
                stressTestResults: await this.stressTestService.runStressTest({
                    portfolioId,
                    scenarios: ['market_crash', 'interest_rate_shock', 'currency_crisis'],
                }),
                hedgingPerformance: await this.hedgingStrategyService.evaluateHedgingPerformance(portfolioId),
            },
            summary: await this.generateReportSummary(portfolioId),
        };
        return reportData;
    }
    async getDashboardData(portfolioId) {
        const [riskAssessment, varComparison, hedgingPerformance, stressTestResults,] = await Promise.all([
            this.riskAssessorService.getRiskAssessment(portfolioId),
            this.varCalculatorService.compareVarMethods(portfolioId, 0.95, 10),
            this.hedgingStrategyService.evaluateHedgingPerformance(portfolioId),
            this.stressTestService.runStressTest({
                portfolioId,
                scenarios: ['market_crash', 'interest_rate_shock'],
            }),
        ]);
        const varComparisonData = varComparison;
        const hedgingPerformanceData = hedgingPerformance;
        const stressTestData = stressTestResults;
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
    async getAlerts(severity, portfolioId) {
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
            filteredAlerts = filteredAlerts.filter((alert) => alert.severity === severity);
        }
        if (portfolioId) {
            filteredAlerts = filteredAlerts.filter((alert) => alert.portfolioId === portfolioId);
        }
        return filteredAlerts;
    }
    async getMetricsSummary() {
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
    async generateReportSummary(portfolioId) {
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
    async getRiskTrendData(portfolioId) {
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
};
exports.RiskManagementController = RiskManagementController;
__decorate([
    (0, common_1.Post)('assessment'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Perform risk assessment for a portfolio' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Risk assessment completed successfully',
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid risk assessment data' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [risk_assessment_dto_1.RiskAssessmentDto]),
    __metadata("design:returntype", Promise)
], RiskManagementController.prototype, "assessRisk", null);
__decorate([
    (0, common_1.Get)('assessment/:portfolioId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get risk assessment history for a portfolio' }),
    (0, swagger_1.ApiParam)({ name: 'portfolioId', description: 'Portfolio ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Risk assessment history retrieved successfully',
    }),
    __param(0, (0, common_1.Param)('portfolioId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RiskManagementController.prototype, "getRiskAssessment", null);
__decorate([
    (0, common_1.Post)('monitoring/start'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Start real-time risk monitoring for a portfolio' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Real-time monitoring started successfully',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [risk_assessment_dto_1.RiskMonitoringDto]),
    __metadata("design:returntype", Promise)
], RiskManagementController.prototype, "startMonitoring", null);
__decorate([
    (0, common_1.Post)('monitoring/stop/:portfolioId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Stop real-time risk monitoring for a portfolio' }),
    (0, swagger_1.ApiParam)({ name: 'portfolioId', description: 'Portfolio ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Real-time monitoring stopped successfully',
    }),
    __param(0, (0, common_1.Param)('portfolioId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RiskManagementController.prototype, "stopMonitoring", null);
__decorate([
    (0, common_1.Post)('hedging/strategy'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Create hedging strategy for a portfolio' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Hedging strategy created successfully',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [risk_assessment_dto_1.HedgingStrategyDto]),
    __metadata("design:returntype", Promise)
], RiskManagementController.prototype, "createHedgingStrategy", null);
__decorate([
    (0, common_1.Get)('hedging/performance/:portfolioId'),
    (0, swagger_1.ApiOperation)({ summary: 'Evaluate hedging strategy performance' }),
    (0, swagger_1.ApiParam)({ name: 'portfolioId', description: 'Portfolio ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Hedging performance evaluated successfully',
    }),
    __param(0, (0, common_1.Param)('portfolioId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RiskManagementController.prototype, "evaluateHedgingPerformance", null);
__decorate([
    (0, common_1.Post)('hedging/adjust/:portfolioId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Adjust hedging strategy for a portfolio' }),
    (0, swagger_1.ApiParam)({ name: 'portfolioId', description: 'Portfolio ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Hedging strategy adjusted successfully',
    }),
    __param(0, (0, common_1.Param)('portfolioId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RiskManagementController.prototype, "adjustHedgingStrategy", null);
__decorate([
    (0, common_1.Post)('var/calculate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Calculate Value at Risk (VaR) for a portfolio' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'VaR calculation completed successfully',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [risk_assessment_dto_1.VarCalculationDto]),
    __metadata("design:returntype", Promise)
], RiskManagementController.prototype, "calculateVar", null);
__decorate([
    (0, common_1.Get)('var/compare/:portfolioId'),
    (0, swagger_1.ApiOperation)({ summary: 'Compare VaR calculation methods for a portfolio' }),
    (0, swagger_1.ApiParam)({ name: 'portfolioId', description: 'Portfolio ID' }),
    (0, swagger_1.ApiQuery)({
        name: 'confidence',
        description: 'Confidence level (0.95-0.99)',
        required: false,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'timeHorizon',
        description: 'Time horizon in days',
        required: false,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'VaR methods comparison completed successfully',
    }),
    __param(0, (0, common_1.Param)('portfolioId')),
    __param(1, (0, common_1.Query)('confidence')),
    __param(2, (0, common_1.Query)('timeHorizon')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], RiskManagementController.prototype, "compareVarMethods", null);
__decorate([
    (0, common_1.Post)('stress-test'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Run stress test scenarios for a portfolio' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Stress test completed successfully',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [risk_assessment_dto_1.StressTestDto]),
    __metadata("design:returntype", Promise)
], RiskManagementController.prototype, "runStressTest", null);
__decorate([
    (0, common_1.Get)('stress-test/library'),
    (0, swagger_1.ApiOperation)({ summary: 'Get available stress test scenarios library' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Stress test library retrieved successfully',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RiskManagementController.prototype, "getStressTestLibrary", null);
__decorate([
    (0, common_1.Post)('reports/generate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Generate risk report for a portfolio' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Risk report generated successfully',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [risk_assessment_dto_1.RiskReportDto]),
    __metadata("design:returntype", Promise)
], RiskManagementController.prototype, "generateRiskReport", null);
__decorate([
    (0, common_1.Get)('dashboard/:portfolioId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get risk dashboard data for a portfolio' }),
    (0, swagger_1.ApiParam)({ name: 'portfolioId', description: 'Portfolio ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Risk dashboard data retrieved successfully',
    }),
    __param(0, (0, common_1.Param)('portfolioId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RiskManagementController.prototype, "getRiskDashboard", null);
__decorate([
    (0, common_1.Get)('alerts'),
    (0, swagger_1.ApiOperation)({ summary: 'Get active risk alerts' }),
    (0, swagger_1.ApiQuery)({
        name: 'severity',
        description: 'Filter by severity level',
        required: false,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'portfolioId',
        description: 'Filter by portfolio ID',
        required: false,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Risk alerts retrieved successfully',
    }),
    __param(0, (0, common_1.Query)('severity')),
    __param(1, (0, common_1.Query)('portfolioId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RiskManagementController.prototype, "getRiskAlerts", null);
__decorate([
    (0, common_1.Get)('metrics/summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Get overall risk metrics summary' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Risk metrics summary retrieved successfully',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RiskManagementController.prototype, "getRiskMetricsSummary", null);
exports.RiskManagementController = RiskManagementController = __decorate([
    (0, swagger_1.ApiTags)('Risk Management'),
    (0, common_1.Controller)('risk'),
    __metadata("design:paramtypes", [risk_assessor_service_1.RiskAssessorService,
        real_time_monitor_service_1.RealTimeMonitorService,
        hedging_strategy_service_1.HedgingStrategyService,
        var_calculator_service_1.VarCalculatorService,
        stress_test_service_1.StressTestService])
], RiskManagementController);
//# sourceMappingURL=risk-management.controller.js.map