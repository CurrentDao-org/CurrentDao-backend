"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const match_entity_1 = require("../entities/match.entity");
const matching_rule_entity_1 = require("../entities/matching-rule.entity");
let AuditService = AuditService_1 = class AuditService {
    constructor(matchRepository, matchingRuleRepository) {
        this.matchRepository = matchRepository;
        this.matchingRuleRepository = matchingRuleRepository;
        this.logger = new common_1.Logger(AuditService_1.name);
        this.auditEntries = [];
    }
    async logEntry(entry) {
        const auditEntry = {
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
    async logMatchCreation(match, userId, reason) {
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
    async logMatchUpdate(match, previousState, userId, reason) {
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
    async logMatchDeletion(match, userId, reason) {
        return this.logEntry({
            entityType: 'match',
            entityId: match.id,
            action: 'match_deleted',
            previousState: this.sanitizeMatch(match),
            userId,
            reason,
        });
    }
    async logRuleCreation(rule, userId) {
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
    async logRuleUpdate(rule, previousState, userId) {
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
    async logRuleDeletion(rule, userId, reason) {
        return this.logEntry({
            entityType: 'rule',
            entityId: rule.id,
            action: 'rule_deleted',
            previousState: this.sanitizeRule(rule),
            userId,
            reason,
        });
    }
    async getAuditHistory(filter) {
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
    async getMatchAuditHistory(matchId) {
        return this.getAuditHistory({
            entityType: 'match',
            entityId: matchId,
        }).then(report => report.entries);
    }
    async getRuleAuditHistory(ruleId) {
        return this.getAuditHistory({
            entityType: 'rule',
            entityId: ruleId,
        }).then(report => report.entries);
    }
    async getUserActivity(userId, startDate, endDate) {
        return this.getAuditHistory({
            userId,
            startDate,
            endDate,
        }).then(report => report.entries);
    }
    async generateAuditReport(startDate, endDate) {
        return this.getAuditHistory({
            startDate,
            endDate,
            limit: 10000,
        });
    }
    async exportAuditData(filter, format = 'json') {
        const report = await this.getAuditHistory({ ...filter, limit: 10000 });
        if (format === 'json') {
            return JSON.stringify(report, null, 2);
        }
        if (format === 'csv') {
            return this.convertToCSV(report.entries);
        }
        throw new Error(`Unsupported export format: ${format}`);
    }
    sanitizeMatch(match) {
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
    sanitizeRule(rule) {
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
    detectChanges(previous, current) {
        const changes = {};
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
    generateSummary(entries) {
        const actionsByType = {};
        const entitiesByType = {};
        const usersByActivity = {};
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
    convertToCSV(entries) {
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
    async cleanupOldEntries(retentionDays = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const initialCount = this.auditEntries.length;
        this.auditEntries = this.auditEntries.filter(entry => entry.timestamp >= cutoffDate);
        const deletedCount = initialCount - this.auditEntries.length;
        this.logger.log(`Cleaned up ${deletedCount} old audit entries (older than ${retentionDays} days)`);
        return deletedCount;
    }
    async getAuditStatistics() {
        const totalEntries = this.auditEntries.length;
        const entriesByType = {};
        const entriesByAction = {};
        const entriesByUser = {};
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
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(match_entity_1.Match)),
    __param(1, (0, typeorm_1.InjectRepository)(matching_rule_entity_1.MatchingRule)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], AuditService);
//# sourceMappingURL=audit.service.js.map