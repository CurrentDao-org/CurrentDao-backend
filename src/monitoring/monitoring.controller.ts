import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { TransactionMonitorService } from './transaction-monitor.service';
import { CreateTransactionStatusDto, TransactionStatusQueryDto } from './dto/transaction-status.dto';

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly transactionMonitorService: TransactionMonitorService) {}

  @Post('transactions')
  async createTransaction(@Body() createDto: CreateTransactionStatusDto) {
    return this.transactionMonitorService.createTransaction(createDto);
  }

  @Get('transactions/:hash')
  async getTransaction(@Param('hash') hash: string) {
    return this.transactionMonitorService.getTransaction(hash);
  }

  @Get('transactions')
  async getTransactions(@Query() query: TransactionStatusQueryDto) {
    return this.transactionMonitorService.getTransactions(query);
  }

  @Get('analytics')
  async getAnalytics(@Query('timeRange') timeRange: 'hour' | 'day' | 'week' | 'month' = 'day') {
    return this.transactionMonitorService.getTransactionAnalytics(timeRange);
  }

  @Get('stats')
  async getMonitoringStats() {
    return this.transactionMonitorService.getMonitoringStats();
  }
}
