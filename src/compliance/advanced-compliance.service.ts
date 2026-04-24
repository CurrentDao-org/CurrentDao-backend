import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateComplianceRuleDto } from './dto/create-compliance-rule.dto';
import { UpdateComplianceRuleDto } from './dto/update-compliance-rule.dto';
import { ComplianceCheckDto } from './dto/compliance-check.dto';
import { ComplianceReportDto } from './dto/compliance-report.dto';
import { ComplianceQueryDto } from './dto/compliance-query.dto';
import { ComplianceMonitoringService } from './monitoring/compliance-monitor.service';
import { RealTimeCheckerService } from './checking/real-time-checker.service';
import { IntelligentReportingService } from './reporting/intelligent-reporting.service';
import { ComplianceWorkflowService } from './workflow/compliance-workflow.service';
import { RegulatoryChangeService } from './change-detection/regulatory-change.service';
import { ComplianceRiskService } from './risk/compliance-risk.service';
import { LegalIntegrationService } from './legal/legal-integration.service';

export interface ComplianceCheckResult {
  transactionId: string;
  passed: boolean;
  violations: string[];
  riskScore: number;
  actions: string[];
  timestamp: Date;
  processingTime: number;
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  jurisdiction: string;
  riskLevel: string;
  parameters: Record<string, any>;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AdvancedComplianceService implements OnModuleInit {
  private readonly logger = new Logger(AdvancedComplianceService.name);
  private readonly complianceRules = new Map<string, ComplianceRule>();
  private readonly monitoringActive = false;
  private readonly realTimeChecks = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly complianceMonitoringService: ComplianceMonitoringService,
    private readonly realTimeCheckerService: RealTimeCheckerService,
    private readonly intelligentReportingService: IntelligentReportingService,
    private readonly complianceWorkflowService: ComplianceWorkflowService,
    private readonly regulatoryChangeService: RegulatoryChangeService,
    private readonly complianceRiskService: ComplianceRiskService,
    private readonly legalIntegrationService: LegalIntegrationService,
  ) {}

  async onModuleInit() {
    this.logger.log('Advanced Compliance Service initialized');
    await this.initializeDefaultRules();
    await this.startRegulatoryMonitoring();
  }

  private async initializeDefaultRules() {
    const defaultRules: CreateComplianceRuleDto[] = [
      {
        name: 'Daily Transaction Limit',
        description: 'Limit daily transactions to $10,000 for individuals',
        type: 'transaction_limit',
        category: 'aml',
        jurisdiction: 'US',
        riskLevel: 'medium',
        parameters: { maxAmount: 10000, currency: 'USD', period: 'daily', entityType: 'individual' },
        active: true,
        priority: 5,
      },
      {
        name: 'Geographic Sanctions Check',
        description: 'Block transactions with sanctioned countries',
        type: 'geographic_restriction',
        category: 'sanctions',
        jurisdiction: 'US',
        riskLevel: 'high',
        parameters: { blockedCountries: ['IR', 'KP', 'SY', 'CU'], action: 'block' },
        active: true,
        priority: 1,
      },
      {
        name: 'Large Transaction Reporting',
        description: 'Report transactions over $10,000',
        type: 'reporting_requirement',
        category: 'aml',
        jurisdiction: 'US',
        riskLevel: 'medium',
        parameters: { threshold: 10000, currency: 'USD', reportType: 'CTR' },
        active: true,
        priority: 3,
      },
    ];

    for (const rule of defaultRules) {
      await this.createComplianceRule(rule);
    }

    this.logger.log(`Initialized ${defaultRules.length} default compliance rules`);
  }

  private async startRegulatoryMonitoring() {
    try {
      await this.regulatoryChangeService.startMonitoring();
      this.logger.log('Regulatory monitoring started');
    } catch (error) {
      this.logger.error('Failed to start regulatory monitoring:', error);
    }
  }

  async createComplianceRule(createComplianceRuleDto: CreateComplianceRuleDto): Promise<ComplianceRule> {
    try {
      const rule: ComplianceRule = {
        id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...createComplianceRuleDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.complianceRules.set(rule.id, rule);
      
      // Update monitoring service with new rule
      await this.complianceMonitoringService.addRule(rule);
      
      this.logger.log(`Created compliance rule: ${rule.name}`);
      return rule;
    } catch (error) {
      this.logger.error('Error creating compliance rule:', error);
      throw error;
    }
  }

  async getComplianceRules(query: ComplianceQueryDto): Promise<ComplianceRule[]> {
    try {
      let rules = Array.from(this.complianceRules.values());

      // Apply filters
      if (query.category) {
        rules = rules.filter(rule => rule.category === query.category);
      }

      if (query.jurisdiction) {
        rules = rules.filter(rule => rule.jurisdiction === query.jurisdiction);
      }

      if (query.active !== undefined) {
        rules = rules.filter(rule => rule.active === query.active);
      }

      if (query.riskLevel) {
        rules = rules.filter(rule => rule.riskLevel === query.riskLevel);
      }

      if (query.type) {
        rules = rules.filter(rule => rule.type === query.type);
      }

      if (query.tags) {
        rules = rules.filter(rule => 
          query.tags!.some(tag => rule.parameters.tags?.includes(tag))
        );
      }

      if (query.search) {
        const searchTerm = query.search.toLowerCase();
        rules = rules.filter(rule => 
          rule.name.toLowerCase().includes(searchTerm) ||
          rule.description.toLowerCase().includes(searchTerm)
        );
      }

      // Apply sorting
      if (query.sortBy) {
        rules.sort((a, b) => {
          const aValue = a[query.sortBy as keyof ComplianceRule];
          const bValue = b[query.sortBy as keyof ComplianceRule];
          
          if (query.sortOrder === 'desc') {
            return bValue > aValue ? 1 : -1;
          }
          return aValue > bValue ? 1 : -1;
        });
      }

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || 100;
      
      return rules.slice(offset, offset + limit);
    } catch (error) {
      this.logger.error('Error fetching compliance rules:', error);
      throw error;
    }
  }

  async getComplianceRule(id: string): Promise<ComplianceRule> {
    const rule = this.complianceRules.get(id);
    if (!rule) {
      throw new Error('Compliance rule not found');
    }
    return rule;
  }

  async updateComplianceRule(id: string, updateComplianceRuleDto: UpdateComplianceRuleDto): Promise<ComplianceRule> {
    try {
      const rule = this.complianceRules.get(id);
      if (!rule) {
        throw new Error('Compliance rule not found');
      }

      const updatedRule = {
        ...rule,
        ...updateComplianceRuleDto,
        updatedAt: new Date(),
      };

      this.complianceRules.set(id, updatedRule);
      
      // Update monitoring service
      await this.complianceMonitoringService.updateRule(updatedRule);
      
      this.logger.log(`Updated compliance rule: ${updatedRule.name}`);
      return updatedRule;
    } catch (error) {
      this.logger.error('Error updating compliance rule:', error);
      throw error;
    }
  }

  async deleteComplianceRule(id: string): Promise<void> {
    try {
      const rule = this.complianceRules.get(id);
      if (!rule) {
        throw new Error('Compliance rule not found');
      }

      this.complianceRules.delete(id);
      
      // Remove from monitoring service
      await this.complianceMonitoringService.removeRule(id);
      
      this.logger.log(`Deleted compliance rule: ${rule.name}`);
    } catch (error) {
      this.logger.error('Error deleting compliance rule:', error);
      throw error;
    }
  }

  async performComplianceCheck(complianceCheckDto: ComplianceCheckDto): Promise<ComplianceCheckResult> {
    try {
      const startTime = Date.now();
      
      const result = await this.realTimeCheckerService.checkTransaction(complianceCheckDto);
      
      const processingTime = Date.now() - startTime;
      
      return {
        ...result,
        processingTime,
      };
    } catch (error) {
      this.logger.error('Error performing compliance check:', error);
      throw error;
    }
  }

  async performBatchComplianceCheck(complianceChecks: ComplianceCheckDto[]): Promise<ComplianceCheckResult[]> {
    try {
      const results = await Promise.allSettled(
        complianceChecks.map(check => this.performComplianceCheck(check))
      );

      return results
        .filter((result): result is PromiseFulfilledResult<ComplianceCheckResult> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value);
    } catch (error) {
      this.logger.error('Error performing batch compliance checks:', error);
      throw error;
    }
  }

  async getMonitoringStatus(): Promise<any> {
    return this.complianceMonitoringService.getStatus();
  }

  async startMonitoring(config: any): Promise<void> {
    await this.complianceMonitoringService.start(config);
  }

  async stopMonitoring(): Promise<void> {
    await this.complianceMonitoringService.stop();
  }

  async getComplianceReports(query: any): Promise<any> {
    return this.intelligentReportingService.getReports(query);
  }

  async generateComplianceReport(reportConfig: ComplianceReportDto): Promise<any> {
    return this.intelligentReportingService.generateReport(reportConfig);
  }

  async getRiskAssessment(): Promise<any> {
    return this.complianceRiskService.getAssessment();
  }

  async updateRiskAssessment(riskData: any): Promise<any> {
    return this.complianceRiskService.updateAssessment(riskData);
  }

  async getRegulations(query: any): Promise<any> {
    return this.legalIntegrationService.getRegulations(query);
  }

  async syncRegulations(): Promise<any> {
    return this.legalIntegrationService.syncRegulations();
  }

  async getRegulatoryChanges(query: any): Promise<any> {
    return this.regulatoryChangeService.getChanges(query);
  }

  async automateWorkflow(workflowConfig: any): Promise<any> {
    return this.complianceWorkflowService.automate(workflowConfig);
  }

  async getWorkflowStatus(): Promise<any> {
    return this.complianceWorkflowService.getStatus();
  }

  async getAuditTrail(query: any): Promise<any> {
    return this.complianceMonitoringService.getAuditTrail(query);
  }

  async getComplianceMetrics(): Promise<any> {
    return this.complianceMonitoringService.getMetrics();
  }

  async createComplianceAlert(alertData: any): Promise<any> {
    return this.complianceMonitoringService.createAlert(alertData);
  }

  async getComplianceAlerts(query: any): Promise<any> {
    return this.complianceMonitoringService.getAlerts(query);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async performScheduledChecks() {
    try {
      await this.complianceMonitoringService.performScheduledChecks();
      this.logger.debug('Scheduled compliance checks completed');
    } catch (error) {
      this.logger.error('Error in scheduled compliance checks:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyReports() {
    try {
      await this.intelligentReportingService.generateDailyReports();
      this.logger.log('Daily compliance reports generated');
    } catch (error) {
      this.logger.error('Error generating daily reports:', error);
    }
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async checkRegulatoryChanges() {
    try {
      await this.regulatoryChangeService.checkForChanges();
      this.logger.debug('Regulatory changes check completed');
    } catch (error) {
      this.logger.error('Error checking regulatory changes:', error);
    }
  }

  async getComplianceStatistics(): Promise<any> {
    const rules = Array.from(this.complianceRules.values());
    const activeRules = rules.filter(rule => rule.active);
    
    return {
      totalRules: rules.length,
      activeRules: activeRules.length,
      rulesByCategory: this.groupRulesByCategory(rules),
      rulesByJurisdiction: this.groupRulesByJurisdiction(rules),
      rulesByRiskLevel: this.groupRulesByRiskLevel(rules),
      averageProcessingTime: await this.getAverageProcessingTime(),
    };
  }

  private groupRulesByCategory(rules: ComplianceRule[]): Record<string, number> {
    return rules.reduce((acc, rule) => {
      acc[rule.category] = (acc[rule.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupRulesByJurisdiction(rules: ComplianceRule[]): Record<string, number> {
    return rules.reduce((acc, rule) => {
      acc[rule.jurisdiction] = (acc[rule.jurisdiction] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupRulesByRiskLevel(rules: ComplianceRule[]): Record<string, number> {
    return rules.reduce((acc, rule) => {
      acc[rule.riskLevel] = (acc[rule.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getAverageProcessingTime(): Promise<number> {
    // This would typically query a database for historical processing times
    return 50; // 50ms average processing time
  }
}
