import { Controller, Get, Post, Body } from '@nestjs/common';
import { ComplianceService } from './compliance.service';

@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('status')
  async getStatus() {
    return this.complianceService.getComplianceOverview();
  }

  @Post('check')
  async runCheck(@Body() payload: { transactionId: string; jurisdiction: string; data: Record<string, unknown> }) {
    return this.complianceService.checkTransaction(payload.transactionId, payload.jurisdiction, payload.data);
  }

  @Get('reports')
  async getReports() {
    return this.complianceService.getRecentReports();
  }

  @Get('risk')
  async getRiskSummary() {
    return this.complianceService.evaluateRisk();
  }
}
