import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from '../entities/match.entity';
import { MatchingRule } from '../entities/matching-rule.entity';

export interface AuditEntry {
  id: string;
  entityType: 'match' | 'rule' | 'order';
  entityId: string;
  action: string;
  previousState?: any;
  newState?: any;
  userId?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  metadata?: any;
}

export interface AuditFilter {
  entityType?: 'match' | 'rule' | 'order';
  entityId?: string;
  userId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditReport {
  totalEntries: number;
  entries: AuditEntry[];
  summary: {
    actionsByType: Record<string, number>;
    entitiesByType: Record<string, number>;
    usersByActivity: Record<string, number>;
    timeRange: { start: Date; end: Date };
  };
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private auditEntries: AuditEntry[] = [];

  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(MatchingRule)
    private readonly matchingRuleRepository: Repository<MatchingRule>,
  ) {}

  async logEntry(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<AuditEntry> {
    const auditEntry: AuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...entry,
    };

    this.auditEntries.push(auditEntry);
    
    if (this.auditEntries.length > 10000) {
      this.auditEntries = this.auditEntries.slice(-5000);
    }

    this.logger.debug(`Audit entry logged: ${auditEntry.action} on ${auditEntry.entityType} ${auditEntry.entityId}`);

    return auditEntry;
  }

  async logMatchCreation(match: Match, userId?: string, reason?: string): Promise<AuditEntry> {
    return this.logEntry({
      entityType: 'match',
      entityId: match.id,
      action: 'match_created',
      newState: this.sanitizeMatch(match),
      userId,
      reason,
      metadata: {
        algorithm: match.metadata?.algorithm,
        score: match.matchingScore,
        type: match.type,
      },
    });
  }

  async logMatchUpdate(match: Match, previousState: Match, userId?: string, reason?: string): Promise<AuditEntry> {
    return this.logEntry({
      entityType: 'match',
      entityId: match.id,
      action: 'match_updated',
      previousState: this.sanitizeMatch(previousState),
      newState: this.sanitizeMatch(match),
      userId,
      reason,
      metadata: {
        changes: this.detectChanges(previousState, match),
      },
    });
  }

  async logMatchDeletion(match: Match, userId?: string, reason?: string): Promise<AuditEntry> {
    return this.logEntry({
      entityType: 'match',
      entityId: match.id,
      action: 'match_deleted',
      previousState: this.sanitizeMatch(match),
      userId,
      reason,
    });
  }

  async logRuleCreation(rule: MatchingRule, userId?: string): Promise<AuditEntry> {
    return this.logEntry({
      entityType: 'rule',
      entityId: rule.id,
      action: 'rule_created',
      newState: this.sanitizeRule(rule),
      userId,
      metadata: {
        ruleType: rule.type,
        priority: rule.priority,
      },
    });
  }

  async logRuleUpdate(rule: MatchingRule, previousState: MatchingRule, userId?: string): Promise<AuditEntry> {
    return this.logEntry({
      entityType: 'rule',
      entityId: rule.id,
      action: 'rule_updated',
      previousState: this.sanitizeRule(previousState),
      newState: this.sanitizeRule(rule),
      userId,
      metadata: {
        changes: this.detectChanges(previousState, rule),
      },
    });
  }

  async logRuleDeletion(rule: MatchingRule, userId?: string, reason?: string): Promise<AuditEntry> {
    return this.logEntry({
      entityType: 'rule',
      entityId: rule.id,
      action: 'rule_deleted',
      previousState: this.sanitizeRule(rule),
      userId,
      reason,
    });
  }

  async getAuditHistory(filter: AuditFilter): Promise<AuditReport> {
    let filteredEntries = [...this.auditEntries];

    if (filter.entityType) {
      filteredEntries = filteredEntries.filter(entry => entry.entityType === filter.entityType);
    }

    if (filter.entityId) {
      filteredEntries = filteredEntries.filter(entry => entry.entityId === filter.entityId);
    }

    if (filter.userId) {
      filteredEntries = filteredEntries.filter(entry => entry.userId === filter.userId);
    }

    if (filter.action) {
      filteredEntries = filteredEntries.filter(entry => entry.action === filter.action);
    }

    if (filter.startDate) {
      filteredEntries = filteredEntries.filter(entry => entry.timestamp >= filter.startDate);
    }

    if (filter.endDate) {
      filteredEntries = filteredEntries.filter(entry => entry.timestamp <= filter.endDate);
    }

    filteredEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const offset = filter.offset || 0;
    const limit = filter.limit || 100;
    const paginatedEntries = filteredEntries.slice(offset, offset + limit);

    const summary = this.generateSummary(filteredEntries);

    return {
      totalEntries: filteredEntries.length,
      entries: paginatedEntries,
      summary,
    };
  }

  async getMatchAuditHistory(matchId: string): Promise<AuditEntry[]> {
    return this.getAuditHistory({
      entityType: 'match',
      entityId: matchId,
    }).then(report => report.entries);
  }

  async getRuleAuditHistory(ruleId: string): Promise<AuditEntry[]> {
    return this.getAuditHistory({
      entityType: 'rule',
      entityId: ruleId,
    }).then(report => report.entries);
  }

  async getUserActivity(userId: string, startDate?: Date, endDate?: Date): Promise<AuditEntry[]> {
    return this.getAuditHistory({
      userId,
      startDate,
      endDate,
    }).then(report => report.entries);
  }

  async generateAuditReport(startDate: Date, endDate: Date): Promise<AuditReport> {
    return this.getAuditHistory({
      startDate,
      endDate,
      limit: 10000,
    });
  }

  async exportAuditData(filter: AuditFilter, format: 'json' | 'csv' = 'json'): Promise<string> {
    const report = await this.getAuditHistory({ ...filter, limit: 10000 });

    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    }

    if (format === 'csv') {
      return this.convertToCSV(report.entries);
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  private sanitizeMatch(match: Match): any {
    return {
      id: match.id,
      buyerOrderId: match.buyerOrderId,
      sellerOrderId: match.sellerOrderId,
      matchedQuantity: match.matchedQuantity,
      matchedPrice: match.matchedPrice,
      status: match.status,
      type: match.type,
      matchingScore: match.matchingScore,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
    };
  }

  private sanitizeRule(rule: MatchingRule): any {
    return {
      id: rule.id,
      name: rule.name,
      type: rule.type,
      priority: rule.priority,
      status: rule.status,
      weight: rule.weight,
      isDefault: rule.isDefault,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }

  private detectChanges<T>(previous: T, current: T): Record<string, { from: any; to: any }> {
    const changes: Record<string, { from: any; to: any }> = {};

    for (const key in current) {
      if (current[key] !== previous[key]) {
        changes[key] = {
          from: previous[key],
          to: current[key],
        };
      }
    }

    return changes;
  }

  private generateSummary(entries: AuditEntry[]): AuditReport['summary'] {
    const actionsByType: Record<string, number> = {};
    const entitiesByType: Record<string, number> = {};
    const usersByActivity: Record<string, number> = {};

    let earliestDate = new Date();
    let latestDate = new Date(0);

    for (const entry of entries) {
      actionsByType[entry.action] = (actionsByType[entry.action] || 0) + 1;
      entitiesByType[entry.entityType] = (entitiesByType[entry.entityType] || 0) + 1;
      
      if (entry.userId) {
        usersByActivity[entry.userId] = (usersByActivity[entry.userId] || 0) + 1;
      }

      if (entry.timestamp < earliestDate) {
        earliestDate = entry.timestamp;
      }

      if (entry.timestamp > latestDate) {
        latestDate = entry.timestamp;
      }
    }

    return {
      actionsByType,
      entitiesByType,
      usersByActivity,
      timeRange: {
        start: earliestDate,
        end: latestDate,
      },
    };
  }

  private convertToCSV(entries: AuditEntry[]): string {
    const headers = [
      'ID',
      'Entity Type',
      'Entity ID',
      'Action',
      'User ID',
      'Timestamp',
      'IP Address',
      'Reason',
      'Metadata',
    ];

    const rows = entries.map(entry => [
      entry.id,
      entry.entityType,
      entry.entityId,
      entry.action,
      entry.userId || '',
      entry.timestamp.toISOString(),
      entry.ipAddress || '',
      entry.reason || '',
      JSON.stringify(entry.metadata || {}),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  async cleanupOldEntries(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const initialCount = this.auditEntries.length;
    this.auditEntries = this.auditEntries.filter(entry => entry.timestamp >= cutoffDate);
    const deletedCount = initialCount - this.auditEntries.length;

    this.logger.log(`Cleaned up ${deletedCount} old audit entries (older than ${retentionDays} days)`);

    return deletedCount;
  }

  async getAuditStatistics(): Promise<{
    totalEntries: number;
    entriesByType: Record<string, number>;
    entriesByAction: Record<string, number>;
    entriesByUser: Record<string, number>;
    recentActivity: AuditEntry[];
  }> {
    const totalEntries = this.auditEntries.length;
    const entriesByType: Record<string, number> = {};
    const entriesByAction: Record<string, number> = {};
    const entriesByUser: Record<string, number> = {};

    for (const entry of this.auditEntries) {
      entriesByType[entry.entityType] = (entriesByType[entry.entityType] || 0) + 1;
      entriesByAction[entry.action] = (entriesByAction[entry.action] || 0) + 1;
      
      if (entry.userId) {
        entriesByUser[entry.userId] = (entriesByUser[entry.userId] || 0) + 1;
      }
    }

    const recentActivity = this.auditEntries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      totalEntries,
      entriesByType,
      entriesByAction,
      entriesByUser,
      recentActivity,
    };
  }
}
