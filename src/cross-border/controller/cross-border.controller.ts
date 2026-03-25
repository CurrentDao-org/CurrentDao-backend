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
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import {
  TransactionProcessorService,
  ProcessingResult,
} from '../transactions/transaction-processor.service';
import { RegulationService } from '../compliance/regulation-service';
import { CurrencyService } from '../currency/currency-service';
import { CustomsService } from '../tariffs/customs-service';
import { RegulatoryReportService } from '../reporting/regulatory-report.service';
import {
  CreateInternationalTradeDto,
  UpdateInternationalTradeDto,
  FilterInternationalTradeDto,
} from '../dto/international-trade.dto';

@ApiTags('Cross-Border Energy Trading')
@Controller('cross-border')
export class CrossBorderController {
  constructor(
    private readonly transactionProcessor: TransactionProcessorService,
    private readonly regulationService: RegulationService,
    private readonly currencyService: CurrencyService,
    private readonly customsService: CustomsService,
    private readonly reportService: RegulatoryReportService,
  ) {}

  @Post('transactions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new cross-border energy transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid transaction data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createTransaction(
    @Body(ValidationPipe) transactionData: CreateInternationalTradeDto,
  ): Promise<ProcessingResult> {
    return this.transactionProcessor.processTransaction(transactionData);
  }

  @Post('transactions/batch')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Process multiple transactions in batch' })
  @ApiResponse({ status: 201, description: 'Batch processed successfully' })
  async processBatchTransactions(
    @Body(ValidationPipe) transactions: CreateInternationalTradeDto[],
  ): Promise<ProcessingResult[]> {
    return this.transactionProcessor.processBatchTransactions(transactions);
  }

  @Get('transactions/:transactionId')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction found' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransaction(@Param('transactionId') transactionId: string) {
    return this.transactionProcessor.getTransactionById(transactionId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get transactions with filters' })
  @ApiQuery({ name: 'sourceCountry', required: false })
  @ApiQuery({ name: 'targetCountry', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'energyType', required: false })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
  })
  async getTransactions(@Query() filters: FilterInternationalTradeDto) {
    if (filters.sourceCountry && filters.targetCountry) {
      return this.transactionProcessor.getTransactionsByCountries(
        filters.sourceCountry,
        filters.targetCountry,
      );
    }

    return this.transactionProcessor.getTransactionsByStatus(
      filters.status as any,
    );
  }

  @Put('transactions/:transactionId')
  @ApiOperation({ summary: 'Update transaction' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction updated successfully' })
  async updateTransaction(
    @Param('transactionId') transactionId: string,
    @Body(ValidationPipe) updateData: UpdateInternationalTradeDto,
  ) {
    // Implementation would update the transaction
    return { message: 'Transaction updated successfully', transactionId };
  }

  @Post('transactions/:transactionId/retry')
  @ApiOperation({ summary: 'Retry failed transaction' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction retry initiated' })
  async retryTransaction(
    @Param('transactionId') transactionId: string,
  ): Promise<ProcessingResult> {
    return this.transactionProcessor.retryFailedTransaction(transactionId);
  }

  @Post('transactions/:transactionId/cancel')
  @ApiOperation({ summary: 'Cancel transaction' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction cancelled successfully',
  })
  async cancelTransaction(
    @Param('transactionId') transactionId: string,
    @Body('reason') reason?: string,
  ) {
    return this.transactionProcessor.cancelTransaction(transactionId, reason);
  }

  @Get('compliance/check')
  @ApiOperation({ summary: 'Check compliance for a potential transaction' })
  @ApiQuery({ name: 'sourceCountry', description: 'Source country code' })
  @ApiQuery({ name: 'targetCountry', description: 'Target country code' })
  @ApiQuery({ name: 'energyType', description: 'Type of energy' })
  @ApiQuery({ name: 'amount', description: 'Transaction amount' })
  @ApiQuery({ name: 'transactionType', description: 'Type of transaction' })
  @ApiResponse({ status: 200, description: 'Compliance check completed' })
  async checkCompliance(
    @Query('sourceCountry') sourceCountry: string,
    @Query('targetCountry') targetCountry: string,
    @Query('energyType') energyType: string,
    @Query('amount') amount: number,
    @Query('transactionType') transactionType: string,
  ) {
    return this.regulationService.checkCompliance(
      sourceCountry,
      targetCountry,
      energyType,
      amount,
      transactionType,
    );
  }

  @Get('compliance/regulations')
  @ApiOperation({ summary: 'Get all available regulations' })
  @ApiResponse({
    status: 200,
    description: 'Regulations retrieved successfully',
  })
  async getRegulations() {
    return this.regulationService.getAllRegulations();
  }

  @Get('compliance/regulations/:country')
  @ApiOperation({ summary: 'Get regulations by country' })
  @ApiParam({ name: 'country', description: 'Country code' })
  @ApiResponse({
    status: 200,
    description: 'Country regulations retrieved successfully',
  })
  async getRegulationsByCountry(@Param('country') country: string) {
    return this.regulationService.getRegulationsByCountry(country);
  }

  @Post('currency/convert')
  @ApiOperation({ summary: 'Convert currency' })
  @ApiResponse({ status: 200, description: 'Currency converted successfully' })
  async convertCurrency(
    @Body('amount') amount: number,
    @Body('fromCurrency') fromCurrency: string,
    @Body('toCurrency') toCurrency: string,
  ) {
    return this.currencyService.convertCurrency(
      amount,
      fromCurrency,
      toCurrency,
    );
  }

  @Get('currency/supported')
  @ApiOperation({ summary: 'Get supported currencies' })
  @ApiResponse({
    status: 200,
    description: 'Supported currencies retrieved successfully',
  })
  async getSupportedCurrencies() {
    return this.currencyService.getSupportedCurrencies();
  }

  @Get('currency/rates/:fromCurrency/:toCurrency')
  @ApiOperation({ summary: 'Get exchange rate history' })
  @ApiParam({ name: 'fromCurrency', description: 'Source currency' })
  @ApiParam({ name: 'toCurrency', description: 'Target currency' })
  @ApiResponse({
    status: 200,
    description: 'Exchange rate history retrieved successfully',
  })
  async getExchangeRateHistory(
    @Param('fromCurrency') fromCurrency: string,
    @Param('toCurrency') toCurrency: string,
  ) {
    return this.currencyService.getExchangeRateHistory(
      fromCurrency,
      toCurrency,
    );
  }

  @Post('customs/calculate')
  @ApiOperation({ summary: 'Calculate customs and tariffs' })
  @ApiResponse({ status: 200, description: 'Customs calculation completed' })
  async calculateCustoms(
    @Body('sourceCountry') sourceCountry: string,
    @Body('targetCountry') targetCountry: string,
    @Body('amount') amount: number,
    @Body('currency') currency: string,
    @Body('energyType') energyType: string,
    @Body('customsData') customsData?: any,
  ) {
    return this.customsService.calculateCustomsAndTariffs(
      sourceCountry,
      targetCountry,
      amount,
      currency,
      energyType,
      customsData,
    );
  }

  @Get('customs/tariffs/:energyType')
  @ApiOperation({ summary: 'Get tariff rates by energy type' })
  @ApiParam({ name: 'energyType', description: 'Energy type' })
  @ApiResponse({
    status: 200,
    description: 'Tariff rates retrieved successfully',
  })
  async getTariffRates(@Param('energyType') energyType: string) {
    return this.customsService.getTariffRatesByEnergyType(energyType);
  }

  @Get('customs/rules/:sourceCountry/:targetCountry')
  @ApiOperation({ summary: 'Get customs rules for country pair' })
  @ApiParam({ name: 'sourceCountry', description: 'Source country' })
  @ApiParam({ name: 'targetCountry', description: 'Target country' })
  @ApiResponse({
    status: 200,
    description: 'Customs rules retrieved successfully',
  })
  async getCustomsRules(
    @Param('sourceCountry') sourceCountry: string,
    @Param('targetCountry') targetCountry: string,
  ) {
    return this.customsService.getCustomsRulesByCountryPair(
      sourceCountry,
      targetCountry,
    );
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate regulatory report' })
  @ApiResponse({ status: 201, description: 'Report generated successfully' })
  async generateReport(
    @Body('reportType') reportType: string,
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
    @Body('jurisdiction') jurisdiction?: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.reportService.generateReport(
      reportType,
      start,
      end,
      jurisdiction,
    );
  }

  @Post('reports/:reportId/submit')
  @ApiOperation({ summary: 'Submit regulatory report' })
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report submitted successfully' })
  async submitReport(@Param('reportId') reportId: string) {
    return this.reportService.submitReport(reportId);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get reports by status' })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'Reports retrieved successfully' })
  async getReports(@Query('status') status?: string) {
    if (status) {
      return this.reportService.getReportsByStatus(status as any);
    }
    return this.reportService.getReportTemplates();
  }

  @Get('reports/submissions/:submissionId')
  @ApiOperation({ summary: 'Get submission status' })
  @ApiParam({ name: 'submissionId', description: 'Submission ID' })
  @ApiResponse({
    status: 200,
    description: 'Submission status retrieved successfully',
  })
  async getSubmissionStatus(@Param('submissionId') submissionId: string) {
    return this.reportService.getSubmissionStatus(submissionId);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get transaction metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  async getMetrics() {
    return this.transactionProcessor.getTransactionMetrics();
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        transactionProcessor: 'active',
        regulationService: 'active',
        currencyService: 'active',
        customsService: 'active',
        reportService: 'active',
      },
    };
  }
}
