import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { ComplianceCheckerService } from './checking/compliance-checker.service';
import { ReportingAutomationService } from './reporting/reporting-automation.service';
import { ComplianceMonitorService } from './monitoring/compliance-monitor.service';
import { ComplianceRiskService } from './risk/compliance-risk.service';
import { LegalDatabaseService } from './integration/legal-database.service';

@Module({
  imports: [ScheduleModule],
  controllers: [ComplianceController],
  providers: [
    ComplianceService,
    ComplianceCheckerService,
    ReportingAutomationService,
    ComplianceMonitorService,
    ComplianceRiskService,
    LegalDatabaseService,
  ],
  exports: [ComplianceService],
})
export class ComplianceModule {}
