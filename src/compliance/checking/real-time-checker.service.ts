import { Injectable, Logger } from '@nestjs/common';
import { ComplianceCheckDto } from '../dto/compliance-check.dto';

export interface ComplianceCheckResult {
  transactionId: string;
  passed: boolean;
  violations: string[];
  riskScore: number;
  actions: string[];
  timestamp: Date;
  processingTime: number;
  ruleResults: RuleCheckResult[];
}

export interface RuleCheckResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  violation: string;
  riskScore: number;
  recommendedAction: string;
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
export class RealTimeCheckerService {
  private readonly logger = new Logger(RealTimeCheckerService.name);
  private readonly rules = new Map<string, ComplianceRule>();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules() {
    // Default rules would be loaded from database or configuration
    this.logger.log('Real-time checker initialized with default rules');
  }

  async checkTransaction(complianceCheckDto: ComplianceCheckDto): Promise<ComplianceCheckResult> {
    const startTime = Date.now();
    
    try {
      const ruleResults = await this.evaluateRules(complianceCheckDto);
      const violations = ruleResults.filter(result => !result.passed).map(result => result.violation);
      const actions = this.determineActions(ruleResults);
      const riskScore = this.calculateRiskScore(ruleResults);
      const passed = violations.length === 0;

      const processingTime = Date.now() - startTime;

      this.logger.debug(`Compliance check completed for transaction ${complianceCheckDto.transactionId} in ${processingTime}ms`);

      return {
        transactionId: complianceCheckDto.transactionId,
        passed,
        violations,
        riskScore,
        actions,
        timestamp: new Date(),
        processingTime,
        ruleResults,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error('Error in compliance check:', error);
      
      return {
        transactionId: complianceCheckDto.transactionId,
        passed: false,
        violations: ['System error during compliance check'],
        riskScore: 1.0,
        actions: ['block', 'manual_review'],
        timestamp: new Date(),
        processingTime,
        ruleResults: [],
      };
    }
  }

  private async evaluateRules(checkData: ComplianceCheckDto): Promise<RuleCheckResult[]> {
    const results: RuleCheckResult[] = [];
    
    for (const rule of this.rules.values()) {
      if (!rule.active) continue;
      
      try {
        const result = await this.evaluateRule(rule, checkData);
        results.push(result);
      } catch (error) {
        this.logger.error(`Error evaluating rule ${rule.name}:`, error);
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          passed: false,
          violation: `Rule evaluation error: ${error.message}`,
          riskScore: 0.5,
          recommendedAction: 'manual_review',
        });
      }
    }

    return results;
  }

  private async evaluateRule(rule: ComplianceRule, checkData: ComplianceCheckDto): Promise<RuleCheckResult> {
    switch (rule.type) {
      case 'transaction_limit':
        return this.evaluateTransactionLimit(rule, checkData);
      case 'geographic_restriction':
        return this.evaluateGeographicRestriction(rule, checkData);
      case 'amount_threshold':
        return this.evaluateAmountThreshold(rule, checkData);
      case 'time_restriction':
        return this.evaluateTimeRestriction(rule, checkData);
      case 'entity_screening':
        return this.evaluateEntityScreening(rule, checkData);
      case 'document_verification':
        return this.evaluateDocumentVerification(rule, checkData);
      default:
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          passed: true,
          violation: '',
          riskScore: 0,
          recommendedAction: 'none',
        };
    }
  }

  private evaluateTransactionLimit(rule: ComplianceRule, checkData: ComplianceCheckDto): RuleCheckResult {
    const maxAmount = rule.parameters.maxAmount || 10000;
    const currency = rule.parameters.currency || 'USD';
    const period = rule.parameters.period || 'daily';
    const entityType = rule.parameters.entityType || 'individual';

    // Simple check - in production, this would query transaction history
    const isOverLimit = checkData.amount > maxAmount && checkData.currency === currency;

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      passed: !isOverLimit,
      violation: isOverLimit ? `Transaction amount ${checkData.amount} ${checkData.currency} exceeds limit of ${maxAmount} ${currency}` : '',
      riskScore: isOverLimit ? 0.7 : 0,
      recommendedAction: isOverLimit ? 'manual_review' : 'none',
    };
  }

  private evaluateGeographicRestriction(rule: ComplianceRule, checkData: ComplianceCheckDto): RuleCheckResult {
    const blockedCountries = rule.parameters.blockedCountries || [];
    const allowedCountries = rule.parameters.allowedCountries || [];
    const action = rule.parameters.action || 'block';

    const sourceBlocked = blockedCountries.includes(checkData.sourceCountry || '');
    const destBlocked = blockedCountries.includes(checkData.destinationCountry || '');
    const sourceAllowed = allowedCountries.length === 0 || allowedCountries.includes(checkData.sourceCountry || '');
    const destAllowed = allowedCountries.length === 0 || allowedCountries.includes(checkData.destinationCountry || '');

    const violation = sourceBlocked || destBlocked || !sourceAllowed || !destAllowed;
    let violationMessage = '';

    if (sourceBlocked) {
      violationMessage = `Source country ${checkData.sourceCountry} is blocked`;
    } else if (destBlocked) {
      violationMessage = `Destination country ${checkData.destinationCountry} is blocked`;
    } else if (!sourceAllowed) {
      violationMessage = `Source country ${checkData.sourceCountry} is not in allowed list`;
    } else if (!destAllowed) {
      violationMessage = `Destination country ${checkData.destinationCountry} is not in allowed list`;
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      passed: !violation,
      violation: violationMessage,
      riskScore: violation ? 0.8 : 0,
      recommendedAction: violation ? action : 'none',
    };
  }

  private evaluateAmountThreshold(rule: ComplianceRule, checkData: ComplianceCheckDto): RuleCheckResult {
    const minAmount = rule.parameters.minAmount || 0;
    const maxAmount = rule.parameters.maxAmount || Infinity;
    const currency = rule.parameters.currency || 'USD';

    const isBelowMin = checkData.amount < minAmount && checkData.currency === currency;
    const isAboveMax = checkData.amount > maxAmount && checkData.currency === currency;

    let violation = '';
    let riskScore = 0;

    if (isBelowMin) {
      violation = `Transaction amount ${checkData.amount} ${checkData.currency} is below minimum of ${minAmount} ${currency}`;
      riskScore = 0.3;
    } else if (isAboveMax) {
      violation = `Transaction amount ${checkData.amount} ${checkData.currency} exceeds maximum of ${maxAmount} ${currency}`;
      riskScore = 0.6;
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      passed: !violation,
      violation,
      riskScore,
      recommendedAction: violation ? 'manual_review' : 'none',
    };
  }

  private evaluateTimeRestriction(rule: ComplianceRule, checkData: ComplianceCheckDto): RuleCheckResult {
    const startHour = rule.parameters.startHour || 0;
    const endHour = rule.parameters.endHour || 23;
    const weekdays = rule.parameters.weekdays || false;
    const transactionDate = new Date(checkData.transactionDate || Date.now());

    const hour = transactionDate.getHours();
    const dayOfWeek = transactionDate.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

    const timeViolation = hour < startHour || hour > endHour;
    const dayViolation = weekdays && !isWeekday;

    const violation = timeViolation || dayViolation;
    let violationMessage = '';

    if (timeViolation) {
      violationMessage = `Transaction time ${hour}:00 is outside allowed hours ${startHour}:00-${endHour}:00`;
    } else if (dayViolation) {
      violationMessage = `Transaction on weekend not allowed`;
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      passed: !violation,
      violation: violationMessage,
      riskScore: violation ? 0.4 : 0,
      recommendedAction: violation ? 'manual_review' : 'none',
    };
  }

  private evaluateEntityScreening(rule: ComplianceRule, checkData: ComplianceCheckDto): RuleCheckResult {
    const sanctionLists = rule.parameters.sanctionLists || [];
    const pepLists = rule.parameters.pepLists || false;
    const watchLists = rule.parameters.watchLists || [];

    // Simple mock screening - in production, this would query actual sanction lists
    const isSanctioned = this.checkSanctionLists(checkData.sourceEntity, sanctionLists);
    const isPep = pepLists && this.checkPepLists(checkData.sourceEntity);
    const isWatched = this.checkWatchLists(checkData.sourceEntity, watchLists);

    let violation = '';
    let riskScore = 0;

    if (isSanctioned) {
      violation = 'Source entity appears on sanction lists';
      riskScore = 1.0;
    } else if (isPep) {
      violation = 'Source entity appears on PEP lists';
      riskScore = 0.8;
    } else if (isWatched) {
      violation = 'Source entity appears on watch lists';
      riskScore = 0.6;
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      passed: !violation,
      violation,
      riskScore,
      recommendedAction: violation ? 'block' : 'none',
    };
  }

  private evaluateDocumentVerification(rule: ComplianceRule, checkData: ComplianceCheckDto): RuleCheckResult {
    const requiredDocuments = rule.parameters.requiredDocuments || [];
    const providedDocuments = checkData.referenceDocuments || [];

    const missingDocuments = requiredDocuments.filter(doc => !providedDocuments.includes(doc));
    const violation = missingDocuments.length > 0;

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      passed: !violation,
      violation: violation ? `Missing required documents: ${missingDocuments.join(', ')}` : '',
      riskScore: violation ? 0.5 : 0,
      recommendedAction: violation ? 'manual_review' : 'none',
    };
  }

  private checkSanctionLists(entity: any, sanctionLists: string[]): boolean {
    // Mock implementation - in production, this would query actual sanction databases
    const mockSanctionedEntities = ['SANCTIONED_ENTITY_1', 'SANCTIONED_ENTITY_2'];
    return mockSanctionedEntities.includes(entity.id) || 
           mockSanctionedEntities.some(name => entity.name.toLowerCase().includes(name.toLowerCase()));
  }

  private checkPepLists(entity: any): boolean {
    // Mock implementation - in production, this would query PEP databases
    const mockPepEntities = ['PEP_ENTITY_1', 'PEP_ENTITY_2'];
    return mockPepEntities.includes(entity.id) || 
           mockPepEntities.some(name => entity.name.toLowerCase().includes(name.toLowerCase()));
  }

  private checkWatchLists(entity: any, watchLists: string[]): boolean {
    // Mock implementation - in production, this would query watch list databases
    const mockWatchedEntities = ['WATCHED_ENTITY_1', 'WATCHED_ENTITY_2'];
    return mockWatchedEntities.includes(entity.id) || 
           mockWatchedEntities.some(name => entity.name.toLowerCase().includes(name.toLowerCase()));
  }

  private determineActions(ruleResults: RuleCheckResult[]): string[] {
    const actions = new Set<string>();
    
    for (const result of ruleResults) {
      if (!result.passed && result.recommendedAction !== 'none') {
        actions.add(result.recommendedAction);
      }
    }

    // Determine if transaction should be blocked
    const hasCriticalViolation = ruleResults.some(result => !result.passed && result.riskScore >= 0.8);
    if (hasCriticalViolation) {
      actions.add('block');
    }

    return Array.from(actions);
  }

  private calculateRiskScore(ruleResults: RuleCheckResult[]): number {
    if (ruleResults.length === 0) return 0;

    const totalRiskScore = ruleResults.reduce((sum, result) => sum + result.riskScore, 0);
    return Math.min(totalRiskScore / ruleResults.length, 1.0);
  }

  addRule(rule: ComplianceRule): void {
    this.rules.set(rule.id, rule);
    this.logger.log(`Added compliance rule: ${rule.name}`);
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.logger.log(`Removed compliance rule: ${ruleId}`);
  }

  updateRule(rule: ComplianceRule): void {
    this.rules.set(rule.id, rule);
    this.logger.log(`Updated compliance rule: ${rule.name}`);
  }

  getRules(): ComplianceRule[] {
    return Array.from(this.rules.values());
  }

  getRule(ruleId: string): ComplianceRule | undefined {
    return this.rules.get(ruleId);
  }
}
