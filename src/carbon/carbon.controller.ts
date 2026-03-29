import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmissionCalculatorService } from './calculations/emission-calculator.service';
import { RealTimeTrackerService } from './tracking/real-time-tracker.service';
import { SustainabilityReportService } from './reporting/sustainability-report.service';
import { CarbonOffsetService } from './offsets/carbon-offset.service';
import { ReductionAnalyticsService } from './analytics/reduction-analytics.service';

@ApiTags('Carbon Tracking')
@Controller('carbon')
export class CarbonController {
  constructor(
    private readonly calculator: EmissionCalculatorService,
    private readonly tracker: RealTimeTrackerService,
    private readonly reporter: SustainabilityReportService,
    private readonly offset: CarbonOffsetService,
    private readonly analytics: ReductionAnalyticsService,
  ) {}

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate carbon emissions' })
  async calculateEmissions(@Body() data: any): Promise<any> {
    const result = this.calculator.calculateEmissions(
      data.activityData,
      data.source,
    );
    return { ...result, timestamp: new Date() };
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current emission levels' })
  async getCurrentEmissions(): Promise<any> {
    return this.tracker.getCurrentEmissions();
  }

  @Get('report/quarterly')
  @ApiOperation({ summary: 'Get quarterly sustainability report' })
  async getQuarterlyReport(
    @Query('year') year: number,
    @Query('quarter') quarter: number,
  ): Promise<any> {
    return this.reporter.generateQuarterlyReport(year, quarter);
  }

  @Get('offsets/projects')
  @ApiOperation({ summary: 'Get available carbon offset projects' })
  async getOffsetProjects(): Promise<any[]> {
    return this.offset.getAvailableProjects();
  }

  @Post('offsets/purchase')
  @ApiOperation({ summary: 'Purchase carbon offsets' })
  async purchaseOffsets(@Body() data: any): Promise<any> {
    return this.offset.purchaseOffset(data.amountTonnes, data.projectType);
  }

  @Get('analytics/reduction')
  @ApiOperation({ summary: 'Get reduction opportunities' })
  async getReductionOpportunities(): Promise<any[]> {
    return this.analytics.getReductionOpportunities();
  }

  @Get('footprint/transaction')
  @ApiOperation({ summary: 'Calculate transaction carbon footprint' })
  async getTransactionFootprint(
    @Query('data') transactionData: any,
  ): Promise<any> {
    return this.calculator.calculateTransactionCarbonFootprint(
      JSON.parse(transactionData),
    );
  }
}
