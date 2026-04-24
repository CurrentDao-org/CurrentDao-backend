import {
  Controller,
  Get,
  Post,
  Patch,
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
import { RealTimeMonitorService } from './monitoring/real-time-monitor.service';
import { SuspiciousActivityService } from './reporting/suspicious-activity.service';
import { FraudPreventionService } from './prevention/fraud-prevention.service';
import { FraudMlService } from './ml/fraud-ml.service';
import { PatternRecognitionService } from './patterns/pattern-recognition.service';
import {
  AnalyzeTradeDto,
  PreTradeCheckDto,
  InvestigationUpdateDto,
  FraudReportQueryDto,
} from './dto/fraud-alert.dto';
import { FraudSeverity } from './entities/fraud-case.entity';

@ApiTags('Fraud Detection')
@Controller('fraud')
export class FraudDetectionController {
  constructor(
    private readonly monitorService: RealTimeMonitorService,
    private readonly reportingService: SuspiciousActivityService,
    private readonly preventionService: FraudPreventionService,
    private readonly mlService: FraudMlService,
    private readonly patternService: PatternRecognitionService,
  ) {}

  // ─── Trade Analysis ──────────────────────────────────────────────────────

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze a trade for fraud indicators' })
  @ApiResponse({ status: 200, description: 'Fraud analysis result returned' })
  @ApiResponse({ status: 400, description: 'Invalid trade data' })
  async analyzeTrade(@Body() tradeDto: AnalyzeTradeDto) {
    return this.monitorService.analyzeIncomingTrade(tradeDto);
  }

  @Post('prevention/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pre-trade fraud prevention check' })
  @ApiResponse({ status: 200, description: 'Prevention check result' })
  async preTradeCheck(@Body() checkDto: PreTradeCheckDto) {
    // Run ML score before prevention check for combined decision
    const mlResult = await this.mlService.analyzeTrade({
      tradeId: `pre-check-${Date.now()}`,
      traderId: checkDto.traderId,
      counterpartyId: checkDto.counterpartyId,
      market: checkDto.market,
      assetType: 'unknown',
      quantity: checkDto.quantity,
      price: checkDto.price,
      tradeValue: checkDto.quantity * checkDto.price,
      side: checkDto.side,
      orderType: 'limit',
    });
    return this.preventionService.preTradeCheck(checkDto, mlResult.score);
  }

  // ─── Case Management ─────────────────────────────────────────────────────

  @Get('cases')
  @ApiOperation({
    summary: 'Get fraud cases with optional filters (paginated)',
  })
  @ApiResponse({ status: 200, description: 'Paginated fraud cases' })
  async getCases(@Query() queryDto: FraudReportQueryDto) {
    return this.reportingService.queryCases(queryDto);
  }

  @Get('cases/ref/:caseId')
  @ApiOperation({ summary: 'Get a fraud case by human-readable case ID' })
  @ApiParam({
    name: 'caseId',
    description: 'Case ID (e.g. FRAUD-20250328-ABCD1234)',
  })
  async getCaseByCaseId(@Param('caseId') caseId: string) {
    return this.reportingService.getCaseByCaseId(caseId);
  }

  @Get('cases/trader/:traderId')
  @ApiOperation({ summary: 'Get all fraud cases for a specific trader' })
  @ApiParam({ name: 'traderId', description: 'Trader ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async getCasesByTrader(
    @Param('traderId') traderId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.reportingService.getCasesByTrader(
      traderId,
      Number(page),
      Number(limit),
    );
  }

  @Get('cases/:id')
  @ApiOperation({ summary: 'Get a fraud case by ID' })
  @ApiParam({ name: 'id', description: 'Fraud case UUID' })
  @ApiResponse({ status: 200, description: 'Fraud case details' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  async getCaseById(@Param('id') id: string) {
    return this.reportingService.getCaseById(id);
  }

  // ─── SAR Reports ─────────────────────────────────────────────────────────

  @Get('reports/sar')
  @ApiOperation({ summary: 'Query Suspicious Activity Reports' })
  @ApiResponse({ status: 200, description: 'SAR report list' })
  async getSarReports(@Query() queryDto: FraudReportQueryDto) {
    return this.reportingService.queryCases({
      ...queryDto,
      regulatoryReported: true,
    });
  }

  @Post('reports/sar/:caseId/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually generate SAR for a specific case' })
  @ApiParam({
    name: 'caseId',
    description: 'Case ID (FRAUD-XXXXXXXX-XXXXXXXX)',
  })
  @ApiResponse({ status: 200, description: 'SAR generated successfully' })
  async generateSar(@Param('caseId') caseId: string) {
    return this.reportingService.generateSARById(caseId);
  }

  // ─── Real-time Monitoring ─────────────────────────────────────────────────

  @Post('monitoring/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start real-time monitoring for a trader' })
  async startMonitoring(@Body('traderId') traderId: string) {
    this.monitorService.startTraderMonitoring(traderId);
    return { message: 'Monitoring started', traderId };
  }

  @Post('monitoring/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop real-time monitoring for a trader' })
  async stopMonitoring(@Body('traderId') traderId: string) {
    this.monitorService.stopTraderMonitoring(traderId);
    return { message: 'Monitoring stopped', traderId };
  }

  @Get('monitoring/status')
  @ApiOperation({
    summary: 'Get current monitoring status and active sessions',
  })
  async getMonitoringStatus() {
    return this.monitorService.getMonitoringStatus();
  }

  // ─── Prevention Management ────────────────────────────────────────────────

  @Post('prevention/block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually block a trader' })
  async blockTrader(
    @Body('traderId') traderId: string,
    @Body('reason') reason: string,
    @Body('durationHours') durationHours?: number,
  ) {
    this.preventionService.blockTrader(
      traderId,
      reason,
      FraudSeverity.HIGH,
      durationHours,
    );
    return { message: 'Trader blocked', traderId };
  }

  @Post('prevention/unblock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unblock a trader' })
  async unblockTrader(@Body('traderId') traderId: string) {
    const removed = this.preventionService.unblockTrader(traderId);
    return {
      message: removed ? 'Trader unblocked' : 'Trader not found in blocklist',
      traderId,
    };
  }

  @Get('prevention/blocked')
  @ApiOperation({ summary: 'Get list of all blocked traders' })
  async getBlockedTraders() {
    return this.preventionService.getBlockedTraders();
  }

  @Post('prevention/whitelist/add')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a trader to the whitelist' })
  async addToWhitelist(@Body('traderId') traderId: string) {
    this.preventionService.addToWhitelist(traderId);
    return { message: 'Trader added to whitelist', traderId };
  }

  @Post('prevention/whitelist/remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a trader from the whitelist' })
  async removeFromWhitelist(@Body('traderId') traderId: string) {
    this.preventionService.removeFromWhitelist(traderId);
    return { message: 'Trader removed from whitelist', traderId };
  }

  // ─── Metrics & Analytics ──────────────────────────────────────────────────

  @Get('metrics')
  @ApiOperation({ summary: 'Get fraud detection system metrics' })
  @ApiResponse({ status: 200, description: 'System metrics dashboard' })
  async getMetrics() {
    const [caseMetrics, preventionStats, mlMetrics] = await Promise.all([
      this.reportingService.getMetrics(),
      Promise.resolve(this.preventionService.getPreventionStats()),
      Promise.resolve(this.mlService.getModelMetrics()),
    ]);

    return {
      lastUpdated: new Date(),
      cases: caseMetrics,
      prevention: preventionStats,
      ml: mlMetrics,
      monitoring: this.monitorService.getMonitoringStatus(),
    };
  }

  // ─── Pattern Catalogue ────────────────────────────────────────────────────

  @Get('patterns')
  @ApiOperation({
    summary: 'Get catalogue of all 50+ registered fraud patterns',
  })
  @ApiResponse({ status: 200, description: 'Pattern definitions' })
  async getPatterns() {
    return {
      patterns: this.patternService.getAllPatternDefinitions(),
      total: this.patternService.getAllPatternDefinitions().length,
    };
  }

  // ─── ML Model ─────────────────────────────────────────────────────────────

  @Get('ml/metrics')
  @ApiOperation({ summary: 'Get ML model performance metrics' })
  @ApiResponse({ status: 200, description: 'ML model metrics' })
  async getMlMetrics() {
    return this.mlService.getModelMetrics();
  }
}
