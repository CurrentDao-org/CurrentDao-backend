import { Injectable } from '@nestjs/common';
import { ComplianceCheckerService } from './checking/compliance-checker.service';
import { ReportingAutomationService } from './reporting/reporting-automation.service';
import { ComplianceMonitorService } from './monitoring/compliance-monitor.service';
import { ComplianceRiskService } from './risk/compliance-risk.service';
import { LegalDatabaseService } from './integration/legal-database.service';

@Injectable()
export class ComplianceService {
  constructor(
    private readonly checker: ComplianceCheckerService,
    private readonly reporting: ReportingAutomationService,
    private readonly monitor: ComplianceMonitorService,
    private readonly riskService: ComplianceRiskService,
    private readonly legalDatabase: LegalDatabaseService,
  ) {}

  async getComplianceOverview() {
    const rules = await this.legalDatabase.getSupportedJurisdictions();
    const pending = this.monitor.getCurrentAlerts();
    return {
      supportedJurisdictions: rules.length,
      activeAlerts: pending.length,
      lastSynced: await this.legalDatabase.getLastSyncedTimestamp(),
    };
  }

  async checkTransaction(transactionId: string, jurisdiction: string, data: Record<string, unknown>) {
    const result = await this.checker.validateTransaction(transactionId, jurisdiction, data);
    if (!result.compliant) {
      this.monitor.reportIssue({ transactionId, jurisdiction, reason: result.reason });
    }
    return result;
  }

  async getRecentReports() {
    return this.reporting.listRecentReports();
  }

  async evaluateRisk() {
    return this.riskService.assessPortfolioRisk();
  }

  async refreshRegulations() {
    return this.legalDatabase.syncRegulations();
  }
}
