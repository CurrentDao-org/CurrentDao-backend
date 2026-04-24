import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { PortfolioService } from './portfolio.service';
import { PerformanceService } from './analytics/performance.service';
import { RiskAssessmentService } from './risk/risk-assessment.service';
import { PortfolioOptimizerService } from './optimization/portfolio-optimizer.service';
import { PositionTrackerService } from './tracking/position-tracker.service';
import { TradingIntegrationService } from './integration/trading-integration.service';
import {
  CreatePortfolioDto,
  UpdatePortfolioDto,
  PortfolioQueryDto,
} from './dto/portfolio.dto';
import {
  CreatePositionDto,
  UpdatePositionDto,
  PositionQueryDto,
  RebalancePositionDto,
} from './dto/position.dto';
import {
  CreateTransactionDto,
  TransactionQueryDto,
} from './dto/transaction.dto';
import {
  PerformanceAnalyticsDto,
  RiskAnalysisDto,
  OptimizationRequestDto,
  RebalanceRequestDto,
  PortfolioSnapshotDto,
} from './dto/analytics.dto';

@ApiTags('Portfolio Management')
@Controller('portfolio')
export class PortfolioController {
  constructor(
    private readonly portfolioService: PortfolioService,
    private readonly performanceService: PerformanceService,
    private readonly riskAssessmentService: RiskAssessmentService,
    private readonly portfolioOptimizerService: PortfolioOptimizerService,
    private readonly positionTrackerService: PositionTrackerService,
    private readonly tradingIntegrationService: TradingIntegrationService,
  ) {}

  // Portfolio Management Endpoints
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new portfolio' })
  @ApiResponse({ status: 201, description: 'Portfolio created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid portfolio data' })
  async createPortfolio(@Body() createPortfolioDto: CreatePortfolioDto) {
    return this.portfolioService.createPortfolio(createPortfolioDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all portfolios with filtering' })
  @ApiResponse({ status: 200, description: 'Portfolios retrieved successfully' })
  async getPortfolios(@Query() query: PortfolioQueryDto) {
    return this.portfolioService.getPortfolios(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get portfolio by ID' })
  @ApiParam({ name: 'id', description: 'Portfolio ID' })
  @ApiResponse({ status: 200, description: 'Portfolio retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Portfolio not found' })
  async getPortfolio(@Param('id') id: string) {
    return this.portfolioService.getPortfolio(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update portfolio' })
  @ApiParam({ name: 'id', description: 'Portfolio ID' })
  @ApiResponse({ status: 200, description: 'Portfolio updated successfully' })
  @ApiResponse({ status: 404, description: 'Portfolio not found' })
  async updatePortfolio(
    @Param('id') id: string,
    @Body() updatePortfolioDto: UpdatePortfolioDto,
  ) {
    return this.portfolioService.updatePortfolio(id, updatePortfolioDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete portfolio' })
  @ApiParam({ name: 'id', description: 'Portfolio ID' })
  @ApiResponse({ status: 200, description: 'Portfolio deleted successfully' })
  @ApiResponse({ status: 404, description: 'Portfolio not found' })
  async deletePortfolio(@Param('id') id: string) {
    return this.portfolioService.deletePortfolio(id);
  }

  // Position Management Endpoints
  @Post(':portfolioId/positions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add position to portfolio' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiResponse({ status: 201, description: 'Position added successfully' })
  async addPosition(
    @Param('portfolioId') portfolioId: string,
    @Body() createPositionDto: CreatePositionDto,
  ) {
    return this.portfolioService.addPosition(portfolioId, createPositionDto);
  }

  @Get(':portfolioId/positions')
  @ApiOperation({ summary: 'Get portfolio positions' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiResponse({ status: 200, description: 'Positions retrieved successfully' })
  async getPositions(
    @Param('portfolioId') portfolioId: string,
    @Query() query: PositionQueryDto,
  ) {
    return this.portfolioService.getPositions(portfolioId, query);
  }

  @Put(':portfolioId/positions/:positionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update position' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiParam({ name: 'positionId', description: 'Position ID' })
  @ApiResponse({ status: 200, description: 'Position updated successfully' })
  async updatePosition(
    @Param('portfolioId') portfolioId: string,
    @Param('positionId') positionId: string,
    @Body() updatePositionDto: UpdatePositionDto,
  ) {
    return this.portfolioService.updatePosition(
      portfolioId,
      positionId,
      updatePositionDto,
    );
  }

  @Delete(':portfolioId/positions/:positionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove position from portfolio' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiParam({ name: 'positionId', description: 'Position ID' })
  @ApiResponse({ status: 200, description: 'Position removed successfully' })
  async removePosition(
    @Param('portfolioId') portfolioId: string,
    @Param('positionId') positionId: string,
  ) {
    return this.portfolioService.removePosition(portfolioId, positionId);
  }

  // Transaction Management Endpoints
  @Post(':portfolioId/transactions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create transaction' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  async createTransaction(
    @Param('portfolioId') portfolioId: string,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    return this.portfolioService.createTransaction(
      portfolioId,
      createTransactionDto,
    );
  }

  @Get(':portfolioId/transactions')
  @ApiOperation({ summary: 'Get portfolio transactions' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async getTransactions(
    @Param('portfolioId') portfolioId: string,
    @Query() query: TransactionQueryDto,
  ) {
    return this.portfolioService.getTransactions(portfolioId, query);
  }

  // Real-time Tracking Endpoints
  @Post(':portfolioId/tracking/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start real-time portfolio tracking' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiResponse({ status: 200, description: 'Real-time tracking started' })
  async startRealTimeTracking(@Param('portfolioId') portfolioId: string) {
    return this.positionTrackerService.startTracking(portfolioId);
  }

  @Post(':portfolioId/tracking/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop real-time portfolio tracking' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiResponse({ status: 200, description: 'Real-time tracking stopped' })
  async stopRealTimeTracking(@Param('portfolioId') portfolioId: string) {
    return this.positionTrackerService.stopTracking(portfolioId);
  }

  @Get(':portfolioId/tracking/status')
  @ApiOperation({ summary: 'Get real-time tracking status' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiResponse({ status: 200, description: 'Tracking status retrieved' })
  async getTrackingStatus(@Param('portfolioId') portfolioId: string) {
    return this.positionTrackerService.getTrackingStatus(portfolioId);
  }

  // Performance Analytics Endpoints
  @Post(':portfolioId/analytics/performance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get portfolio performance analytics' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiResponse({ status: 200, description: 'Performance analytics retrieved' })
  async getPerformanceAnalytics(
    @Param('portfolioId') portfolioId: string,
    @Body() analyticsDto: PerformanceAnalyticsDto,
  ) {
    return this.performanceService.getPerformanceAnalytics(
      portfolioId,
      analyticsDto,
    );
  }

  @Get(':portfolioId/analytics/summary')
  @ApiOperation({ summary: 'Get portfolio performance summary' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiResponse({ status: 200, description: 'Performance summary retrieved' })
  async getPerformanceSummary(@Param('portfolioId') portfolioId: string) {
    return this.performanceService.getPerformanceSummary(portfolioId);
  }

  // Risk Assessment Endpoints
  @Post(':portfolioId/risk/analysis')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perform risk analysis' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiResponse({ status: 200, description: 'Risk analysis completed' })
  async performRiskAnalysis(
    @Param('portfolioId') portfolioId: string,
    @Body() riskAnalysisDto: RiskAnalysisDto,
  ) {
    return this.riskAssessmentService.analyzeRisk(portfolioId, riskAnalysisDto);
  }

  @Get(':portfolioId/risk/metrics')
  @ApiOperation({ summary: 'Get current risk metrics' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiResponse({ status: 200, description: 'Risk metrics retrieved' })
  async getRiskMetrics(@Param('portfolioId') portfolioId: string) {
    return this.riskAssessmentService.getCurrentRiskMetrics(portfolioId);
  }

  // Portfolio Optimization Endpoints
  @Post(':portfolioId/optimization/recommendations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get portfolio optimization recommendations' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiResponse({ status: 200, description: 'Optimization recommendations generated' })
  async getOptimizationRecommendations(
    @Param('portfolioId') portfolioId: string,
    @Body() optimizationDto: OptimizationRequestDto,
  ) {
    return this.portfolioOptimizerService.getRecommendations(
      portfolioId,
      optimizationDto,
    );
  }

  @Post(':portfolioId/rebalance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rebalance portfolio' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiResponse({ status: 200, description: 'Portfolio rebalanced successfully' })
  async rebalancePortfolio(
    @Param('portfolioId') portfolioId: string,
    @Body() rebalanceDto: RebalanceRequestDto,
  ) {
    return this.portfolioService.rebalancePortfolio(portfolioId, rebalanceDto);
  }

  // Trading Integration Endpoints
  @Post(':portfolioId/trade/execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute portfolio trades' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiResponse({ status: 200, description: 'Trades executed successfully' })
  async executeTrades(
    @Param('portfolioId') portfolioId: string,
    @Body() trades: any[],
  ) {
    return this.tradingIntegrationService.executeTrades(portfolioId, trades);
  }

  @Get(':portfolioId/trade/orders')
  @ApiOperation({ summary: 'Get trade orders' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiResponse({ status: 200, description: 'Trade orders retrieved' })
  async getTradeOrders(
    @Param('portfolioId') portfolioId: string,
    @Query() query: any,
  ) {
    return this.tradingIntegrationService.getOrders(portfolioId, query);
  }

  // Portfolio Snapshot Endpoints
  @Post(':portfolioId/snapshot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get portfolio snapshot' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiResponse({ status: 200, description: 'Portfolio snapshot generated' })
  async getPortfolioSnapshot(
    @Param('portfolioId') portfolioId: string,
    @Body() snapshotDto: PortfolioSnapshotDto,
  ) {
    return this.portfolioService.getPortfolioSnapshot(portfolioId, snapshotDto);
  }

  @Get(':portfolioId/dashboard')
  @ApiOperation({ summary: 'Get portfolio dashboard data' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved' })
  async getDashboard(@Param('portfolioId') portfolioId: string) {
    return this.portfolioService.getDashboardData(portfolioId);
  }
}
