import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CurrencyService } from './currency.service';
import { CurrencyConversionService, ConversionRequest } from './conversion/currency-conversion.service';
import { CurrencyRiskService } from './risk/currency-risk.service';
import { MultiCurrencyReportService } from './reporting/multi-currency-report.service';
import { PaymentProcessorService } from './integration/payment-processor.service';
import { CreateAccountRequest } from './currency.service';
import { JwtAuthGuard } from '../security/guards/jwt-auth.guard';
import { RolesGuard } from '../security/guards/roles.guard';
import { Roles } from '../security/decorators/roles.decorator';

@ApiTags('Currency Management')
@Controller('currency')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CurrencyController {
  constructor(
    private readonly currencyService: CurrencyService,
    private readonly conversionService: CurrencyConversionService,
    private readonly riskService: CurrencyRiskService,
    private readonly reportService: MultiCurrencyReportService,
    private readonly paymentService: PaymentProcessorService,
  ) {}

  @Get('initialize')
  @Roles('admin')
  @ApiOperation({ summary: 'Initialize currency system' })
  @ApiResponse({ status: 200, description: 'Currency system initialized successfully' })
  async initializeCurrencies() {
    await this.currencyService.initializeCurrencies();
    return { message: 'Currency system initialized successfully' };
  }

  @Get('currencies')
  @ApiOperation({ summary: 'Get supported currencies' })
  @ApiResponse({ status: 200, description: 'List of supported currencies' })
  async getSupportedCurrencies() {
    return this.currencyService.getSupportedCurrencies();
  }

  @Get('currencies/:code')
  @ApiOperation({ summary: 'Get currency details' })
  @ApiParam({ name: 'code', description: 'Currency code' })
  @ApiResponse({ status: 200, description: 'Currency details' })
  async getCurrencyDetails(@Param('code') code: string) {
    return this.currencyService.getCurrencyDetails(code);
  }

  @Get('rates/:from/:to')
  @ApiOperation({ summary: 'Get exchange rate' })
  @ApiParam({ name: 'from', description: 'Source currency code' })
  @ApiParam({ name: 'to', description: 'Target currency code' })
  @ApiResponse({ status: 200, description: 'Current exchange rate' })
  async getExchangeRate(
    @Param('from') fromCurrency: string,
    @Param('to') toCurrency: string,
  ) {
    return this.currencyService.getExchangeRate(fromCurrency, toCurrency);
  }

  @Get('rates/:from/:to/history')
  @ApiOperation({ summary: 'Get rate history' })
  @ApiParam({ name: 'from', description: 'Source currency code' })
  @ApiParam({ name: 'to', description: 'Target currency code' })
  @ApiQuery({ name: 'hours', required: false, type: Number, description: 'Hours of history to retrieve' })
  @ApiResponse({ status: 200, description: 'Historical exchange rates' })
  async getRateHistory(
    @Param('from') fromCurrency: string,
    @Param('to') toCurrency: string,
    @Query('hours', new DefaultValuePipe(24), ParseIntPipe) hours: number,
  ) {
    return this.currencyService.getRateHistory(fromCurrency, toCurrency, hours);
  }

  @Get('rates/:from/:to/statistics')
  @ApiOperation({ summary: 'Get rate statistics' })
  @ApiParam({ name: 'from', description: 'Source currency code' })
  @ApiParam({ name: 'to', description: 'Target currency code' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Days for statistics' })
  @ApiResponse({ status: 200, description: 'Rate statistics' })
  async getRateStatistics(
    @Param('from') fromCurrency: string,
    @Param('to') toCurrency: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.currencyService.getRateStatistics(fromCurrency, toCurrency, days);
  }

  @Post('accounts')
  @ApiOperation({ summary: 'Create currency account' })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  async createCurrencyAccount(
    @Body(ValidationPipe) request: CreateAccountRequest,
    @Request() req,
  ) {
    return this.currencyService.createCurrencyAccount({
      ...request,
      userId: req.user.id,
    });
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Get user accounts' })
  @ApiResponse({ status: 200, description: 'User accounts' })
  async getUserAccounts(@Request() req) {
    return this.currencyService.getUserAccounts(req.user.id);
  }

  @Get('accounts/:accountId')
  @ApiOperation({ summary: 'Get account details' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Account details' })
  async getAccountDetails(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Request() req,
  ) {
    return this.currencyService.getAccountDetails(accountId, req.user.id);
  }

  @Get('portfolio')
  @ApiOperation({ summary: 'Get user portfolio' })
  @ApiQuery({ name: 'baseCurrency', required: false, description: 'Base currency for portfolio valuation' })
  @ApiResponse({ status: 200, description: 'User portfolio' })
  async getUserPortfolio(
    @Request() req,
    @Query('baseCurrency') baseCurrency?: string,
  ) {
    return this.currencyService.getUserPortfolio(req.user.id, baseCurrency);
  }

  @Put('accounts/:accountId/limits')
  @ApiOperation({ summary: 'Update account limits' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Account limits updated' })
  async updateAccountLimits(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Body() limits: { daily?: number; monthly?: number; transaction?: number },
    @Request() req,
  ) {
    return this.currencyService.updateAccountLimits(accountId, req.user.id, limits);
  }

  @Post('accounts/:accountId/freeze')
  @Roles('admin', 'support')
  @ApiOperation({ summary: 'Freeze account' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Account frozen' })
  async freezeAccount(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Body() body: { reason: string },
    @Request() req,
  ) {
    await this.currencyService.freezeAccount(accountId, req.user.id, body.reason);
    return { message: 'Account frozen successfully' };
  }

  @Post('accounts/:accountId/unfreeze')
  @Roles('admin', 'support')
  @ApiOperation({ summary: 'Unfreeze account' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Account unfrozen' })
  async unfreezeAccount(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Request() req,
  ) {
    await this.currencyService.unfreezeAccount(accountId, req.user.id);
    return { message: 'Account unfrozen successfully' };
  }

  @Post('convert')
  @ApiOperation({ summary: 'Convert currency' })
  @ApiResponse({ status: 201, description: 'Currency conversion initiated' })
  async convertCurrency(
    @Body(ValidationPipe) request: ConversionRequest,
    @Request() req,
  ) {
    return this.conversionService.convertCurrency({
      ...request,
      userId: req.user.id,
    });
  }

  @Post('convert/estimate')
  @ApiOperation({ summary: 'Estimate currency conversion' })
  @ApiResponse({ status: 200, description: 'Conversion estimate' })
  async estimateConversion(
    @Body() body: { fromCurrency: string; toCurrency: string; amount: number },
  ) {
    return this.currencyService.estimateConversion(
      body.fromCurrency,
      body.toCurrency,
      body.amount,
    );
  }

  @Get('conversions')
  @ApiOperation({ summary: 'Get conversion history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'fromCurrency', required: false })
  @ApiQuery({ name: 'toCurrency', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'Conversion history' })
  async getConversionHistory(
    @Request() req,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('fromCurrency') fromCurrency?: string,
    @Query('toCurrency') toCurrency?: string,
    @Query('status') status?: string,
  ) {
    return this.conversionService.getConversionHistory(req.user.id, {
      limit,
      offset,
      fromCurrency,
      toCurrency,
      status,
    });
  }

  @Get('conversions/:transactionId')
  @ApiOperation({ summary: 'Get conversion details' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Conversion details' })
  async getConversionDetails(
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Request() req,
  ) {
    return this.conversionService.getTransactionDetails(transactionId, req.user.id);
  }

  @Delete('conversions/:transactionId')
  @ApiOperation({ summary: 'Cancel conversion' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Conversion cancelled' })
  async cancelConversion(
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Request() req,
  ) {
    await this.conversionService.cancelConversion(transactionId, req.user.id);
    return { message: 'Conversion cancelled successfully' };
  }

  @Post('conversions/:transactionId/retry')
  @ApiOperation({ summary: 'Retry failed conversion' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 201, description: 'Conversion retry initiated' })
  async retryConversion(
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Request() req,
  ) {
    return this.conversionService.retryFailedConversion(transactionId, req.user.id);
  }

  @Get('risk')
  @ApiOperation({ summary: 'Get risk report' })
  @ApiResponse({ status: 200, description: 'Risk report' })
  async getRiskReport(@Request() req) {
    return this.currencyService.getRiskReport(req.user.id);
  }

  @Post('risk/assess')
  @ApiOperation({ summary: 'Assess user risk' })
  @ApiResponse({ status: 200, description: 'Risk assessment' })
  async assessUserRisk(@Request() req) {
    return this.currencyService.assessUserRisk(req.user.id);
  }

  @Get('reports/currency')
  @ApiOperation({ summary: 'Generate currency report' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (ISO string)' })
  @ApiQuery({ name: 'includeRisk', required: false, type: Boolean })
  @ApiQuery({ name: 'includePerformance', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Currency report' })
  async generateCurrencyReport(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('includeRisk') includeRisk?: boolean,
    @Query('includePerformance') includePerformance?: boolean,
  ) {
    return this.currencyService.generateReport('currency', {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      options: {
        userId: req.user.id,
        includeRisk,
        includePerformance,
      },
    });
  }

  @Get('reports/balance')
  @ApiOperation({ summary: 'Generate balance report' })
  @ApiQuery({ name: 'baseCurrency', required: false, description: 'Base currency' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days' })
  @ApiResponse({ status: 200, description: 'Balance report' })
  async generateBalanceReport(
    @Request() req,
    @Query('baseCurrency') baseCurrency?: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days?: number,
  ) {
    return this.reportService.generateBalanceReport(req.user.id, baseCurrency, days);
  }

  @Get('reports/compliance')
  @ApiOperation({ summary: 'Generate compliance report' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (ISO string)' })
  @ApiQuery({ name: 'riskThreshold', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Compliance report' })
  async generateComplianceReport(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('riskThreshold') riskThreshold?: number,
  ) {
    return this.currencyService.generateReport('compliance', {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      options: {
        userId: req.user.id,
        riskThreshold,
      },
    });
  }

  @Get('reports/export/:type/:format')
  @ApiOperation({ summary: 'Export report' })
  @ApiParam({ name: 'type', description: 'Report type (currency, balance, compliance)' })
  @ApiParam({ name: 'format', description: 'Export format (json, csv, pdf)' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO string)' })
  @ApiQuery({ name: 'baseCurrency', required: false, description: 'Base currency' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days' })
  @ApiResponse({ status: 200, description: 'Exported report' })
  async exportReport(
    @Param('type') type: string,
    @Param('format') format: string,
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('baseCurrency') baseCurrency?: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days?: number,
  ) {
    const parameters: any = { userId: req.user.id };
    
    if (type === 'currency' || type === 'compliance') {
      parameters.startDate = new Date(startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      parameters.endDate = new Date(endDate || new Date());
    }
    
    if (type === 'balance') {
      parameters.baseCurrency = baseCurrency;
      parameters.days = days;
    }

    const buffer = await this.currencyService.exportReport(
      type as any,
      format as any,
      parameters,
    );

    // Set appropriate headers for file download
    const filename = `${type}_report_${new Date().toISOString().split('T')[0]}.${format}`;
    
    return {
      filename,
      data: buffer.toString('base64'),
      mimeType: this.getMimeType(format),
    };
  }

  @Get('processors')
  @ApiOperation({ summary: 'Get supported payment processors' })
  @ApiResponse({ status: 200, description: 'Supported payment processors' })
  async getSupportedPaymentProcessors() {
    return this.currencyService.getSupportedPaymentProcessors();
  }

  @Get('processors/:name/capabilities')
  @ApiOperation({ summary: 'Get processor capabilities' })
  @ApiParam({ name: 'name', description: 'Processor name' })
  @ApiResponse({ status: 200, description: 'Processor capabilities' })
  async getProcessorCapabilities(@Param('name') name: string) {
    return this.paymentService.getProcessorCapabilities(name);
  }

  @Post('processors/payment')
  @ApiOperation({ summary: 'Process payment' })
  @ApiResponse({ status: 201, description: 'Payment processed' })
  async processPayment(
    @Body() request: any,
    @Request() req,
  ) {
    return this.currencyService.processPayment({
      ...request,
      userId: req.user.id,
    });
  }

  @Get('processors/:name/payments/:transactionId')
  @ApiOperation({ summary: 'Get payment status' })
  @ApiParam({ name: 'name', description: 'Processor name' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Payment status' })
  async getPaymentStatus(
    @Param('name') name: string,
    @Param('transactionId') transactionId: string,
  ) {
    return this.currencyService.getPaymentStatus(name, transactionId);
  }

  @Post('processors/:name/payments/:transactionId/cancel')
  @ApiOperation({ summary: 'Cancel payment' })
  @ApiParam({ name: 'name', description: 'Processor name' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Payment cancelled' })
  async cancelPayment(
    @Param('name') name: string,
    @Param('transactionId') transactionId: string,
  ) {
    await this.paymentService.cancelPayment(name, transactionId);
    return { message: 'Payment cancelled successfully' };
  }

  @Post('processors/:name/payments/:transactionId/refund')
  @ApiOperation({ summary: 'Refund payment' })
  @ApiParam({ name: 'name', description: 'Processor name' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 201, description: 'Payment refunded' })
  async refundPayment(
    @Param('name') name: string,
    @Param('transactionId') transactionId: string,
    @Body() body: { amount?: number; reason?: string },
  ) {
    return this.paymentService.refundPayment(
      name,
      transactionId,
      body.amount,
      body.reason,
    );
  }

  @Post('processors/:name/validate')
  @ApiOperation({ summary: 'Validate payment method' })
  @ApiParam({ name: 'name', description: 'Processor name' })
  @ApiResponse({ status: 200, description: 'Payment method validation result' })
  async validatePaymentMethod(
    @Param('name') name: string,
    @Body() paymentMethod: any,
  ) {
    return this.paymentService.validatePaymentMethod(name, paymentMethod);
  }

  @Get('statistics')
  @Roles('admin')
  @ApiOperation({ summary: 'Get system statistics' })
  @ApiResponse({ status: 200, description: 'System statistics' })
  async getSystemStatistics() {
    return this.currencyService.getSystemStatistics();
  }

  @Get('health')
  @ApiOperation({ summary: 'Currency service health check' })
  @ApiResponse({ status: 200, description: 'Service healthy' })
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date(),
      service: 'currency-management',
      version: '1.0.0',
    };
  }

  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      json: 'application/json',
      csv: 'text/csv',
      pdf: 'application/pdf',
    };
    return mimeTypes[format] || 'application/octet-stream';
  }
}
