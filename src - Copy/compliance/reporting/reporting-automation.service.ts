import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ReportingAutomationService {
  private readonly logger = new Logger(ReportingAutomationService.name);
  private readonly reports: Array<{ id: string; generatedAt: string; summary: string }> = [];

  @Cron('0 */5 * * * *')
  async generateComplianceReport(): Promise<void> {
    const id = `report-${Date.now()}`;
    const summary = 'Automated compliance summary generated for active jurisdictions.';
    this.reports.unshift({ id, generatedAt: new Date().toISOString(), summary });
    this.logger.log(`Generated automated compliance report ${id}`);
  }

  async listRecentReports() {
    return this.reports.slice(0, 10);
  }
}
