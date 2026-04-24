import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FraudCaseEntity,
  FraudCaseStatus,
  FraudSeverity,
} from '../entities/fraud-case.entity';
import { PreTradeCheckDto, PreTradeCheckResult } from '../dto/fraud-alert.dto';

export interface BlockedTrader {
  traderId: string;
  reason: string;
  blockedAt: Date;
  expiresAt: Date | null;
  severity: FraudSeverity;
}

interface PreventionStats {
  totalChecks: number;
  blockedTrades: number;
  blockedValue: number;
  whitelistedPassed: number;
  blockRate: number;
}

@Injectable()
export class FraudPreventionService {
  private readonly logger = new Logger(FraudPreventionService.name);

  /** In-memory blocklist (production would use Redis) */
  private readonly blockedTraders = new Map<string, BlockedTrader>();

  /** Trusted counterparties exempt from some checks */
  private readonly whitelist = new Set<string>();

  /** Prevention statistics */
  private stats: PreventionStats = {
    totalChecks: 0,
    blockedTrades: 0,
    blockedValue: 0,
    whitelistedPassed: 0,
    blockRate: 0,
  };

  /** Score threshold above which a trade is auto-blocked */
  private readonly BLOCK_THRESHOLD = 0.85;
  private readonly REVIEW_THRESHOLD = 0.65;

  /** Rate limits per trader: max trades per minute */
  private readonly RATE_LIMIT_PER_MINUTE = 60;
  private readonly traderRateCounts = new Map<string, number[]>(); // timestamps

  constructor(
    @InjectRepository(FraudCaseEntity)
    private readonly fraudCaseRepository: Repository<FraudCaseEntity>,
  ) {}

  // ─── Pre-trade Check ─────────────────────────────────────────────────────

  /**
   * Pre-trade prevention check — called before trade execution.
   * Returns allow/block/review decision in <10ms.
   */
  async preTradeCheck(
    checkDto: PreTradeCheckDto,
    mlScore?: number,
  ): Promise<PreTradeCheckResult> {
    this.stats.totalChecks++;
    const { traderId, tradeValue = 0 } = checkDto as any;
    const reasons: string[] = [];

    // 1. Whitelist bypass for trusted entities
    if (this.whitelist.has(traderId)) {
      this.stats.whitelistedPassed++;
      return {
        allowed: true,
        riskScore: 0,
        reasons: ['Whitelisted trader'],
        recommendedAction: 'allow',
      };
    }

    // 2. Check blocklist
    const blockEntry = this.blockedTraders.get(traderId);
    if (blockEntry) {
      const isExpired =
        blockEntry.expiresAt && blockEntry.expiresAt < new Date();
      if (!isExpired) {
        reasons.push(`Trader blocked: ${blockEntry.reason}`);
        this.recordPrevention(traderId, tradeValue ?? 0);
        return {
          allowed: false,
          riskScore: 1.0,
          reasons,
          recommendedAction: 'block',
        };
      } else {
        // Auto-unblock expired entries
        this.blockedTraders.delete(traderId);
      }
    }

    // 3. Rate limit check
    const isRateLimited = this.checkRateLimit(traderId);
    if (isRateLimited) {
      reasons.push(
        `Rate limit exceeded: >${this.RATE_LIMIT_PER_MINUTE} trades/min`,
      );
      this.recordPrevention(traderId, tradeValue ?? 0);
      return {
        allowed: false,
        riskScore: 0.9,
        reasons,
        recommendedAction: 'block',
      };
    }

    // 4. ML score gate
    if (mlScore !== undefined) {
      if (mlScore >= this.BLOCK_THRESHOLD) {
        reasons.push(
          `ML fraud score ${mlScore.toFixed(3)} exceeds block threshold ${this.BLOCK_THRESHOLD}`,
        );
        this.recordPrevention(traderId, tradeValue ?? 0);
        return {
          allowed: false,
          riskScore: mlScore,
          reasons,
          recommendedAction: 'block',
        };
      }

      if (mlScore >= this.REVIEW_THRESHOLD) {
        reasons.push(
          `ML fraud score ${mlScore.toFixed(3)} requires manual review`,
        );
        return {
          allowed: true,
          riskScore: mlScore,
          reasons,
          recommendedAction: 'review',
        };
      }
    }

    // 5. Large trade value threshold
    if (tradeValue > 50_000_000) {
      reasons.push(
        `Trade value $${tradeValue.toLocaleString()} exceeds large-trade threshold`,
      );
      return {
        allowed: true,
        riskScore: 0.5,
        reasons,
        recommendedAction: 'review',
      };
    }

    // 6. Self-trade prevention
    if (checkDto.counterpartyId && checkDto.counterpartyId === traderId) {
      reasons.push('Self-trade detected: buyer and seller are the same entity');
      this.recordPrevention(traderId, tradeValue ?? 0);
      return {
        allowed: false,
        riskScore: 1.0,
        reasons,
        recommendedAction: 'block',
      };
    }

    // 7. Check prior fraud case history
    const priorCases = await this.fraudCaseRepository.count({
      where: { traderId, status: FraudCaseStatus.OPEN },
    });

    if (priorCases >= 3) {
      reasons.push(`Trader has ${priorCases} open fraud cases`);
      return {
        allowed: false,
        riskScore: 0.8,
        reasons,
        recommendedAction: 'block',
      };
    }

    this.updateRateCount(traderId);
    return {
      allowed: true,
      riskScore: mlScore ?? 0,
      reasons: reasons.length > 0 ? reasons : ['No fraud indicators detected'],
      recommendedAction: 'allow',
    };
  }

  // ─── Blocklist Management ────────────────────────────────────────────────

  blockTrader(
    traderId: string,
    reason: string,
    severity: FraudSeverity,
    durationHours?: number,
  ): void {
    const expiresAt = durationHours
      ? new Date(Date.now() + durationHours * 3_600_000)
      : null;

    this.blockedTraders.set(traderId, {
      traderId,
      reason,
      blockedAt: new Date(),
      expiresAt,
      severity,
    });

    this.logger.warn(
      `Trader BLOCKED: ${traderId} | Reason: ${reason} | Expires: ${expiresAt?.toISOString() ?? 'Never'}`,
    );
  }

  unblockTrader(traderId: string): boolean {
    const removed = this.blockedTraders.delete(traderId);
    if (removed) {
      this.logger.log(`Trader UNBLOCKED: ${traderId}`);
    }
    return removed;
  }

  isTraderBlocked(traderId: string): boolean {
    const entry = this.blockedTraders.get(traderId);
    if (!entry) return false;
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.blockedTraders.delete(traderId);
      return false;
    }
    return true;
  }

  getBlockedTraders(): BlockedTrader[] {
    return Array.from(this.blockedTraders.values());
  }

  // ─── Whitelist Management ────────────────────────────────────────────────

  addToWhitelist(traderId: string): void {
    this.whitelist.add(traderId);
    this.logger.log(`Trader added to whitelist: ${traderId}`);
  }

  removeFromWhitelist(traderId: string): void {
    this.whitelist.delete(traderId);
    this.logger.log(`Trader removed from whitelist: ${traderId}`);
  }

  getWhitelist(): string[] {
    return Array.from(this.whitelist);
  }

  // ─── Prevention Metrics ──────────────────────────────────────────────────

  getPreventionStats(): object {
    const blockRate =
      this.stats.totalChecks > 0
        ? parseFloat(
            (this.stats.blockedTrades / this.stats.totalChecks).toFixed(4),
          )
        : 0;

    return {
      ...this.stats,
      blockRate,
      activeBlocks: this.blockedTraders.size,
      whitelistedTraders: this.whitelist.size,
      blockThreshold: this.BLOCK_THRESHOLD,
      reviewThreshold: this.REVIEW_THRESHOLD,
      rateLimitPerMinute: this.RATE_LIMIT_PER_MINUTE,
    };
  }

  // ─── Auto-Prevention from ML Scores ────────────────────────────────────

  /**
   * Called by monitoring service when a case is created — auto-blocks
   * CRITICAL traders for a configurable temporary window.
   */
  async applyPreventionForCase(fraudCase: FraudCaseEntity): Promise<void> {
    if (fraudCase.severity === FraudSeverity.CRITICAL) {
      this.blockTrader(
        fraudCase.traderId,
        `Auto-blocked: CRITICAL fraud case ${fraudCase.caseId} (ML score ${fraudCase.mlScore})`,
        FraudSeverity.CRITICAL,
        24, // 24-hour initial block; investigators can extend
      );
    } else if (fraudCase.severity === FraudSeverity.HIGH) {
      this.blockTrader(
        fraudCase.traderId,
        `Auto-blocked: HIGH severity case ${fraudCase.caseId}`,
        FraudSeverity.HIGH,
        4, // 4-hour block pending review
      );
    }
  }

  // ─── Private Helpers ────────────────────────────────────────────────────

  private checkRateLimit(traderId: string): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    const timestamps = this.traderRateCounts.get(traderId) ?? [];

    // Remove timestamps older than 1 min
    const recent = timestamps.filter((ts) => ts > oneMinuteAgo);
    this.traderRateCounts.set(traderId, recent);

    return recent.length >= this.RATE_LIMIT_PER_MINUTE;
  }

  private updateRateCount(traderId: string): void {
    const timestamps = this.traderRateCounts.get(traderId) ?? [];
    timestamps.push(Date.now());
    this.traderRateCounts.set(traderId, timestamps);
  }

  private recordPrevention(traderId: string, tradeValue: number): void {
    this.stats.blockedTrades++;
    this.stats.blockedValue += tradeValue;
    this.stats.blockRate =
      this.stats.totalChecks > 0
        ? this.stats.blockedTrades / this.stats.totalChecks
        : 0;
    this.logger.warn(
      `Trade PREVENTED for trader ${traderId} | Value: $${tradeValue.toLocaleString()} | Total prevented: ${this.stats.blockedTrades}`,
    );
  }
}
