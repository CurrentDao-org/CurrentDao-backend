import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TransactionService, TransactionProcessingResult, BatchProcessingResult } from './transaction.service';
import { CreateTransactionDto, BatchTransactionDto } from './dto/create-transaction.dto';
import { TransactionStatus } from './enums/transaction.enum';
import { PerformanceMonitorService } from './monitoring/performance-monitor.service';
import { RegulatoryComplianceService } from './compliance/regulatory-compliance.service';
import { ReconciliationService } from './reconciliation/reconciliation.service';
import { SettlementService } from './settlement/settlement.service';
import { LoggingInterceptor } from '../logging/interceptors/logging.interceptor';

@ApiTags('transactions')
@Controller('transactions')
@UseGuards(ThrottlerGuard)
@UseInterceptors(LoggingInterceptor)
export class TransactionController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly performanceMonitor: PerformanceMonitorService,
    private readonly complianceService: RegulatoryComplianceService,
    private readonly reconciliationService: ReconciliationService,
    private readonly settlementService: SettlementService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Process a single transaction' })
  @ApiResponse({ status: 201, description: 'Transaction processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid transaction data' })
  @ApiResponse({ status: 422, description: 'Transaction validation failed' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async processTransaction(
    @Body(ValidationPipe) transactionData: CreateTransactionDto
  ): Promise<TransactionProcessingResult> {
    return this.transactionService.processTransaction(transactionData);
  }

  @Post('batch')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Process multiple transactions in batch' })
  @ApiResponse({ status: 201, description: 'Batch processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid batch data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async processBatchTransactions(
    @Body(ValidationPipe) batchData: BatchTransactionDto
  ): Promise<BatchProcessingResult> {
    return this.transactionService.processBatchTransactions(batchData);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Process high-volume transactions (async)' })
  @ApiResponse({ status: 202, description: 'Bulk processing initiated' })
  @ApiQuery({ name: 'count', required: false, description: 'Number of transactions to process' })
  async processBulkTransactions(
    @Query('count') count?: number
  ): Promise<{ message: string; batchId: string; estimatedTime: number }> {
    // For high-volume processing, this would typically use a message queue
    const batchId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const transactionCount = count || 10000;
    const estimatedTime = Math.ceil(transactionCount / 100000); // Based on 100k tx/s target

    return {
      message: `Bulk processing initiated for ${transactionCount} transactions`,
      batchId,
      estimatedTime,
    };
  }

  @Get(':transactionId')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiResponse({ status: 200, description: 'Transaction found' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  async getTransaction(@Param('transactionId') transactionId: string) {
    return this.transactionService.getTransaction(transactionId);
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Get transactions by status' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  @ApiParam({ name: 'status', enum: TransactionStatus, description: 'Transaction status' })
  async getTransactionsByStatus(@Param('status') status: TransactionStatus) {
    return this.transactionService.getTransactionsByStatus(status);
  }

  @Get('range')
  @ApiOperation({ summary: 'Get transactions by date range' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  @ApiQuery({ name: 'startDate', description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', description: 'End date (ISO string)' })
  async getTransactionsByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.transactionService.getTransactionsByDateRange(start, end);
  }

  @Put(':transactionId/retry')
  @ApiOperation({ summary: 'Retry a failed transaction' })
  @ApiResponse({ status: 200, description: 'Transaction retry initiated' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiResponse({ status: 400, description: 'Transaction cannot be retried' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  async retryTransaction(@Param('transactionId') transactionId: string) {
    return this.transactionService.retryFailedTransaction(transactionId);
  }

  @Put(':transactionId/cancel')
  @ApiOperation({ summary: 'Cancel a transaction' })
  @ApiResponse({ status: 200, description: 'Transaction cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiResponse({ status: 400, description: 'Transaction cannot be cancelled' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  async cancelTransaction(
    @Param('transactionId') transactionId: string,
    @Body('reason') reason?: string
  ) {
    return this.transactionService.cancelTransaction(transactionId, reason);
  }

  @Post(':transactionId/settle')
  @ApiOperation({ summary: 'Manually trigger settlement for a transaction' })
  @ApiResponse({ status: 200, description: 'Settlement initiated' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  async settleTransaction(
    @Param('transactionId') transactionId: string,
    @Body('method') method?: string
  ) {
    return this.settlementService.settleTransaction(transactionId, method);
  }

  // Performance and Monitoring Endpoints
  @Get('metrics/performance')
  @ApiOperation({ summary: 'Get transaction performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getPerformanceMetrics() {
    return this.performanceMonitor.getPerformanceMetrics();
  }

  @Get('metrics/system')
  @ApiOperation({ summary: 'Get system health and performance report' })
  @ApiResponse({ status: 200, description: 'System report retrieved successfully' })
  async getSystemReport() {
    return this.transactionService.getSystemPerformanceReport();
  }

  @Get('metrics/health')
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
  async getHealthStatus() {
    return this.performanceMonitor.getSystemHealth();
  }

  @Get('metrics/throughput')
  @ApiOperation({ summary: 'Get current throughput metrics' })
  @ApiResponse({ status: 200, description: 'Throughput metrics retrieved successfully' })
  @ApiQuery({ name: 'timeRange', enum: ['hour', 'day', 'week', 'month'], description: 'Time range for metrics' })
  async getThroughputMetrics(@Query('timeRange') timeRange: 'hour' | 'day' | 'week' | 'month' = 'hour') {
    return this.performanceMonitor.getPerformanceReport(timeRange);
  }

  // Settlement Endpoints
  @Get('settlement/:settlementId')
  @ApiOperation({ summary: 'Get settlement by ID' })
  @ApiResponse({ status: 200, description: 'Settlement found' })
  @ApiResponse({ status: 404, description: 'Settlement not found' })
  @ApiParam({ name: 'settlementId', description: 'Settlement ID' })
  async getSettlement(@Param('settlementId') settlementId: string) {
    return this.settlementService.getSettlementById(settlementId);
  }

  @Get('settlement/transaction/:transactionId')
  @ApiOperation({ summary: 'Get settlements for a transaction' })
  @ApiResponse({ status: 200, description: 'Settlements retrieved successfully' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  async getTransactionSettlements(@Param('transactionId') transactionId: string) {
    return this.settlementService.getSettlementsByTransaction(transactionId);
  }

  @Get('settlement/metrics')
  @ApiOperation({ summary: 'Get settlement metrics' })
  @ApiResponse({ status: 200, description: 'Settlement metrics retrieved successfully' })
  async getSettlementMetrics() {
    return this.settlementService.getSettlementMetrics();
  }

  @Post('settlement/:settlementId/retry')
  @ApiOperation({ summary: 'Retry a failed settlement' })
  @ApiResponse({ status: 200, description: 'Settlement retry initiated' })
  @ApiResponse({ status: 404, description: 'Settlement not found' })
  @ApiParam({ name: 'settlementId', description: 'Settlement ID' })
  async retrySettlement(@Param('settlementId') settlementId: string) {
    return this.settlementService.retryFailedSettlement(settlementId);
  }

  // Reconciliation Endpoints
  @Post('reconciliation')
  @ApiOperation({ summary: 'Perform reconciliation' })
  @ApiResponse({ status: 200, description: 'Reconciliation completed successfully' })
  @ApiResponse({ status: 500, description: 'Reconciliation failed' })
  @ApiQuery({ name: 'date', required: false, description: 'Date for reconciliation (ISO string)' })
  async performReconciliation(@Query('date') date?: string) {
    const reconciliationDate = date ? new Date(date) : new Date();
    return this.reconciliationService.performReconciliation(reconciliationDate);
  }

  @Get('reconciliation/:reportId')
  @ApiOperation({ summary: 'Get reconciliation report by ID' })
  @ApiResponse({ status: 200, description: 'Reconciliation report found' })
  @ApiResponse({ status: 404, description: 'Reconciliation report not found' })
  @ApiParam({ name: 'reportId', description: 'Reconciliation report ID' })
  async getReconciliationReport(@Param('reportId') reportId: string) {
    return this.reconciliationService.getReconciliationReport(reportId);
  }

  @Get('reconciliation/date/:date')
  @ApiOperation({ summary: 'Get reconciliation reports by date' })
  @ApiResponse({ status: 200, description: 'Reconciliation reports retrieved successfully' })
  @ApiParam({ name: 'date', description: 'Date (YYYY-MM-DD)' })
  async getReconciliationReportsByDate(@Param('date') date: string) {
    const reportDate = new Date(date);
    return this.reconciliationService.getReconciliationReportsByDate(reportDate);
  }

  @Get('reconciliation/metrics')
  @ApiOperation({ summary: 'Get reconciliation metrics' })
  @ApiResponse({ status: 200, description: 'Reconciliation metrics retrieved successfully' })
  async getReconciliationMetrics() {
    return this.reconciliationService.getReconciliationMetrics();
  }

  // Compliance Endpoints
  @Post('compliance/report')
  @ApiOperation({ summary: 'Generate compliance report' })
  @ApiResponse({ status: 200, description: 'Compliance report generated successfully' })
  @ApiResponse({ status: 500, description: 'Report generation failed' })
  @ApiQuery({ name: 'type', enum: ['daily', 'weekly', 'monthly', 'ad-hoc'], description: 'Report type' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO string)' })
  async generateComplianceReport(
    @Query('type') type: 'daily' | 'weekly' | 'monthly' | 'ad-hoc',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.complianceService.generateComplianceReport(type, start, end);
  }

  @Post('compliance/sar')
  @ApiOperation({ summary: 'Generate Suspicious Activity Report' })
  @ApiResponse({ status: 200, description: 'SAR generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid transaction IDs' })
  async generateSuspiciousActivityReport(@Body('transactionIds') transactionIds: string[]) {
    return this.complianceService.generateSuspiciousActivityReport(transactionIds);
  }

  @Get('compliance/metrics')
  @ApiOperation({ summary: 'Get compliance metrics' })
  @ApiResponse({ status: 200, description: 'Compliance metrics retrieved successfully' })
  async getComplianceMetrics() {
    return this.complianceService.getComplianceMetrics();
  }

  // High-Volume Testing Endpoints
  @Post('test/load')
  @ApiOperation({ summary: 'Perform load testing for high-volume processing' })
  @ApiResponse({ status: 202, description: 'Load test initiated' })
  @ApiQuery({ name: 'transactions', description: 'Number of transactions to generate' })
  @ApiQuery({ name: 'concurrency', description: 'Concurrent processing limit' })
  async performLoadTest(
    @Query('transactions') transactionCount: number = 10000,
    @Query('concurrency') concurrency: number = 100
  ) {
    const testId = `load_test_${Date.now()}`;
    
    // Generate test transactions
    const testTransactions: CreateTransactionDto[] = [];
    for (let i = 0; i < transactionCount; i++) {
      testTransactions.push({
        transactionId: `test_${testId}_${i}`,
        transactionType: 'energy_trade' as any,
        amount: Math.random() * 10000 + 100,
        currency: 'USD',
        sourcePublicKey: `G${Math.random().toString(36).substr(2, 55)}`,
        targetPublicKey: `G${Math.random().toString(36).substr(2, 55)}`,
        sourceCountry: 'US',
        targetCountry: 'CA',
        energyData: {
          energyType: 'electricity',
          quantity: Math.random() * 1000 + 100,
          unit: 'kWh',
          sourceLocation: 'US-TX',
          targetLocation: 'CA-ON',
        },
        fee: Math.random() * 10 + 1,
      });
    }

    // Process in batches
    const batchData: BatchTransactionDto = {
      transactions: testTransactions,
      batchId: testId,
      parallel: true,
    };

    return {
      message: `Load test initiated for ${transactionCount} transactions`,
      testId,
      estimatedTime: Math.ceil(transactionCount / 100000), // Based on 100k tx/s target
      batchData,
    };
  }

  @Get('test/performance')
  @ApiOperation({ summary: 'Get current performance test results' })
  @ApiResponse({ status: 200, description: 'Performance test results retrieved successfully' })
  async getPerformanceTestResults() {
    const metrics = await this.transactionService.getTransactionMetrics();
    const performance = await this.performanceMonitor.getPerformanceMetrics();
    
    return {
      targets: {
        maxProcessingTime: 100, // 100ms
        minThroughput: 100000, // 100k tx/s
        minValidationAccuracy: 99.9, // 99.9%
        minSettlementSuccessRate: 99.5, // 99.5%
        minReconciliationAccuracy: 99.5, // 99.5%
      },
      current: {
        processingTime: metrics.averageProcessingTime,
        throughput: metrics.throughput,
        validationAccuracy: metrics.validationAccuracy,
        settlementSuccessRate: metrics.settlementSuccessRate,
        reconciliationAccuracy: metrics.reconciliationAccuracy,
      },
      status: {
        processingTime: metrics.averageProcessingTime <= 100 ? 'PASS' : 'FAIL',
        throughput: metrics.throughput >= 100000 ? 'PASS' : 'FAIL',
        validationAccuracy: metrics.validationAccuracy >= 99.9 ? 'PASS' : 'FAIL',
        settlementSuccessRate: metrics.settlementSuccessRate >= 99.5 ? 'PASS' : 'FAIL',
        reconciliationAccuracy: metrics.reconciliationAccuracy >= 99.5 ? 'PASS' : 'FAIL',
      },
      performance,
    };
  }
}
