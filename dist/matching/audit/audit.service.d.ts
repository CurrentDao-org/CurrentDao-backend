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
        timeRange: {
            start: Date;
            end: Date;
        };
    };
}
export declare class AuditService {
    private readonly matchRepository;
    private readonly matchingRuleRepository;
    private readonly logger;
    private auditEntries;
    constructor(matchRepository: Repository<Match>, matchingRuleRepository: Repository<MatchingRule>);
    logEntry(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<AuditEntry>;
    logMatchCreation(match: Match, userId?: string, reason?: string): Promise<AuditEntry>;
    logMatchUpdate(match: Match, previousState: Match, userId?: string, reason?: string): Promise<AuditEntry>;
    logMatchDeletion(match: Match, userId?: string, reason?: string): Promise<AuditEntry>;
    logRuleCreation(rule: MatchingRule, userId?: string): Promise<AuditEntry>;
    logRuleUpdate(rule: MatchingRule, previousState: MatchingRule, userId?: string): Promise<AuditEntry>;
    logRuleDeletion(rule: MatchingRule, userId?: string, reason?: string): Promise<AuditEntry>;
    getAuditHistory(filter: AuditFilter): Promise<AuditReport>;
    getMatchAuditHistory(matchId: string): Promise<AuditEntry[]>;
    getRuleAuditHistory(ruleId: string): Promise<AuditEntry[]>;
    getUserActivity(userId: string, startDate?: Date, endDate?: Date): Promise<AuditEntry[]>;
    generateAuditReport(startDate: Date, endDate: Date): Promise<AuditReport>;
    exportAuditData(filter: AuditFilter, format?: 'json' | 'csv'): Promise<string>;
    private sanitizeMatch;
    private sanitizeRule;
    private detectChanges;
    private generateSummary;
    private convertToCSV;
    cleanupOldEntries(retentionDays?: number): Promise<number>;
    getAuditStatistics(): Promise<{
        totalEntries: number;
        entriesByType: Record<string, number>;
        entriesByAction: Record<string, number>;
        entriesByUser: Record<string, number>;
        recentActivity: AuditEntry[];
    }>;
}
