import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { FraudService } from './fraud.service';

@Controller('fraud')
export class FraudController {
  constructor(private readonly fraudService: FraudService) {}

  @Post('analyze')
  async analyzeTransaction(@Body() transaction: Record<string, any>) {
    return this.fraudService.analyzeTransaction(transaction);
  }

  @Get('cases')
  async getCases(@Query('status') status?: string) {
    return this.fraudService.getCases(status);
  }

  @Get('cases/:id')
  async getCase(@Param('id') id: string) {
    return this.fraudService.getCaseById(id);
  }

  @Post('cases/:id/resolve')
  async resolveCase(@Param('id') id: string, @Body() resolution: Record<string, any>) {
    return this.fraudService.resolveCase(id, resolution);
  }

  @Get('metrics')
  async getMetrics() {
    return this.fraudService.getMetrics();
  }
}