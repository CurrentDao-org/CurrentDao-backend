import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CrossBorderService } from './cross-border.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Cross-Border Trading')
@Controller('cross-border')
@UseGuards(JwtAuthGuard)
export class CrossBorderController {
  constructor(private readonly crossBorderService: CrossBorderService) {}

  @Post('trade')
  @ApiOperation({ summary: 'Execute cross-border trade' })
  @ApiResponse({ status: 200, description: 'Trade executed successfully' })
  async executeCrossBorderTrade(@Body() tradeData: any) {
    return this.crossBorderService.executeTrade(tradeData);
  }

  @Get('currencies')
  @ApiOperation({ summary: 'Get supported currencies' })
  @ApiResponse({ status: 200, description: 'Supported currencies retrieved' })
  async getSupportedCurrencies() {
    return this.crossBorderService.getSupportedCurrencies();
  }

  @Get('fx-rates')
  @ApiOperation({ summary: 'Get real-time FX rates' })
  @ApiResponse({ status: 200, description: 'FX rates retrieved' })
  async getFXRates(@Query('base') base: string, @Query('target') target: string) {
    return this.crossBorderService.getFXRates(base, target);
  }

  @Post('settlement')
  @ApiOperation({ summary: 'Process cross-border settlement' })
  @ApiResponse({ status: 200, description: 'Settlement processed' })
  async processSettlement(@Body() settlementData: any) {
    return this.crossBorderService.processSettlement(settlementData);
  }

  @Get('compliance/:country')
  @ApiOperation({ summary: 'Get compliance requirements for country' })
  @ApiResponse({ status: 200, description: 'Compliance requirements retrieved' })
  async getComplianceRequirements(@Param('country') country: string) {
    return this.crossBorderService.getComplianceRequirements(country);
  }

  @Post('risk-hedge')
  @ApiOperation({ summary: 'Create currency risk hedge' })
  @ApiResponse({ status: 200, description: 'Risk hedge created' })
  async createRiskHedge(@Body() hedgeData: any) {
    return this.crossBorderService.createRiskHedge(hedgeData);
  }

  @Get('exchanges')
  @ApiOperation({ summary: 'Get integrated global exchanges' })
  @ApiResponse({ status: 200, description: 'Global exchanges retrieved' })
  async getGlobalExchanges() {
    return this.crossBorderService.getGlobalExchanges();
  }
}
