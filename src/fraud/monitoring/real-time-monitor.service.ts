import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { FraudCaseEntity, FraudCaseStatus, FraudSeverity } from '../entities/fraud-case.entity';
import { FraudMlService } from '../ml/fraud-ml.service';
import { PatternRecognitionService } from '../patterns/pattern-recognition.service';
import { SuspiciousActivityService } from '../reporting/suspicious-activity.service';
import { FraudPreventionService } from '../prevention/fraud-prevention.service';
import { AnalyzeTradeDto, FraudAnalysisResult } from '../dto/fraud-alert.dto';
import { v4 as uuidv4 } from 'uuid';

interface MonitoredTrader {
  traderId: string;
  startedAt: Date;
  recentTrades: AnalyzeTradeDto[];
  alertCount: number;
  lastChecked: Date;
}

@Injectable()
export class RealTimeMonitorService {
  private readonly logger = new Logger(RealTimeMonitorService.name);

  /** Active monitoring sessions keyed by traderId */
  private readonly monitoredTraders = new Map<string, MonitoredTrader>();

  /** Pending trade queue awaiting analysis (buffered for batch efficiency) */
  private readonly pendingTrades: AnalyzeTradeDto[] = [];

  /** Sliding window: max trades kept per trader for pattern context */
  private readonly CONTEXT_WINDOW_SIZE = 50;

  /** Processing interval — ensures flags within 30s requirement */
  private readonly MONITORING_INTERVAL_MS = 15_000;

  /** ML score above this triggers immediate alert */
  private readonly ALERT_THRESHOLD = 0.65;

  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(FraudCaseEntity)
    private readonly fraudCaseRepository: Repository<FraudCaseEntity>,
    private readonly mlService: FraudMlService,
    private readonly patternService: PatternRecognitionService,
    private readonly reportingService: SuspiciousActivityService,
    private readonly preventionService: FraudPreventionService,
  ) {}

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Primary entry point: analyse a trade through the full pipeline.
   * Target: <100ms processing time.
   */
  async analyzeIncomingTrade(tradeDto: AnalyzeTradeDto): Promise<FraudAnalysisResult> {
    const startTime = Date.now();
    this.logger.debug(`Analyzing incoming trade: ${tradeDto.tradeId}`);

    // Update trader context window (but do NOT add to pendingTrades queue
    // since this method is called directly — queue is only for batch intake)
    this.updateTraderContext(tradeDto);

    // Get context (recent trades for this trader)
    const context = this.getTraderContext(tradeDto.traderId);

    // 1. ML anomaly scoring
    const mlResult = await this.mlService.analyzeTrade(tradeDto);

    // 2. Pattern matching
    const patterns = this.patternService.analyzePatterns(tradeDto, {
      recentTrades: context.recentTrades.filter((t) => t.tradeId !== tradeDto.tradeId),
    });
    const matchedPatterns = patterns.filter((p) => p.matched);

    // 3. Compute combined score (ML + pattern ensemble)
    const combinedScore = this.combineScores(mlResult.score, matchedPatterns);

    // 4. Determine if suspicious
    const isSuspicious = combinedScore >= this.ALERT_THRESHOLD;

    // 5. Infer fraud types from matched patterns
    const fraudTypes = this.patternService.inferFraudTypes(matchedPatterns);

    // 6. Determine severity
    const severity = this.scoreToSeverity(combinedScore);

    // 7. Auto-generate case if suspicious — get the real savedCaseId back
    let savedCaseId = '';
    if (isSuspicious) {
      const savedCase = await this.createFraudCase(
        tradeDto,
        combinedScore,
        severity,
        fraudTypes,
        matchedPatterns,
        mlResult.evidence,
      );
      savedCaseId = savedCase.caseId;
    }

    const processingTimeMs = Date.now() - startTime;

    const result: FraudAnalysisResult = {
      caseId: savedCaseId,
      tradeId: tradeDto.tradeId,
      traderId: tradeDto.traderId,
      isSuspicious,
      mlScore: combinedScore,
      severity,
      fraudTypes,
      patternsMatched: matchedPatterns,
      evidence: mlResult.evidence,
      recommendedAction: this.getRecommendedAction(severity, combinedScore),
      processingTimeMs,
    };

    if (processingTimeMs > 100) {
      this.logger.warn(`Trade analysis exceeded 100ms: ${processingTimeMs}ms`);
    }

    return result;
  }

  /** Start real-time monitoring for a specific trader */
  startTraderMonitoring(traderId: string): void {
    if (this.monitoredTraders.has(traderId)) {
      this.logger.debug(`Monitoring already active for trader: ${traderId}`);
      return;
    }

    const session: MonitoredTrader = {
      traderId,
      startedAt: new Date(),
      recentTrades: [],
      alertCount: 0,
      lastChecked: new Date(),
    };

    this.monitoredTraders.set(traderId, session);
    this.logger.log(`Started monitoring trader: ${traderId}`);
  }

  /** Stop monitoring a specific trader */
  stopTraderMonitoring(traderId: string): void {
    if (this.monitoredTraders.delete(traderId)) {
      this.logger.log(`Stopped monitoring trader: ${traderId}`);
    }
  }

  /** Start global monitoring loop */
  startGlobalMonitoring(): void {
    if (this.monitoringInterval) return;

    this.monitoringInterval = setInterval(async () => {
      await this.processMonitoringCycle();
    }, this.MONITORING_INTERVAL_MS);

    this.logger.log(
      `Global fraud monitoring started (interval: ${this.MONITORING_INTERVAL_MS}ms)`,
    );
  }

  /** Stop global monitoring loop */
  stopGlobalMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.logger.log('Global fraud monitoring stopped');
    }
  }

  getMonitoringStatus(): object {
    return {
      isRunning: this.monitoringInterval !== null,
      monitoredTraderCount: this.monitoredTraders.size,
      pendingTradesQueue: this.pendingTrades.length,
      monitoredTraders: Array.from(this.monitoredTraders.keys()),
      intervalMs: this.MONITORING_INTERVAL_MS,
      alertThreshold: this.ALERT_THRESHOLD,
    };
  }

  // ─── Monitoring Loop ─────────────────────────────────────────────────────

  /** Scheduled every 15s — fulfils the <30s flagging requirement */
  @Cron('*/15 * * * * *')
  async processMonitoringCycle(): Promise<void> {
    if (this.pendingTrades.length === 0 && this.monitoredTraders.size === 0) return;

    this.logger.debug(`Monitoring cycle: ${this.pendingTrades.length} queued trades`);

    // Drain the batch queue — these are trades submitted for async monitoring
    const batch = this.pendingTrades.splice(0, 100);
    for (const trade of batch) {
      try {
        await this.analyzeIncomingTrade(trade);
      } catch (err) {
        this.logger.error(`Error analyzing trade ${trade.tradeId}: ${err}`);
      }
    }

    // Sweep monitored traders for anomalies
    for (const [traderId, session] of this.monitoredTraders) {
      await this.sweepTrader(traderId, session);
    }
  }

  @Cron('0 */1 * * * *') // every 1 minute
  async generateMonitoringReport(): Promise<void> {
    const activeCount = this.monitoredTraders.size;
    if (activeCount === 0) return;

    const openCases = await this.fraudCaseRepository.count({
      where: { status: FraudCaseStatus.OPEN },
    });

    this.logger.log(
      `Fraud monitoring report: ${activeCount} monitored traders, ${openCases} open cases`,
    );
  }

  @Cron('0 0 * * * *') // top of every hour
  async hourlyEscalation(): Promise<void> {
    this.logger.log('Running hourly escalation sweep');

    const criticalCases = await this.fraudCaseRepository.find({
      where: { severity: FraudSeverity.CRITICAL, status: FraudCaseStatus.OPEN },
    });

    for (const c of criticalCases) {
      await this.fraudCaseRepository.update(c.id, {
        status: FraudCaseStatus.ESCALATED,
      });
      this.logger.warn(`CRITICAL case escalated: ${c.caseId} — trader ${c.traderId}`);
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private async sweepTrader(traderId: string, session: MonitoredTrader): Promise<void> {
    const timeSinceCheck = Date.now() - session.lastChecked.getTime();
    if (timeSinceCheck < this.MONITORING_INTERVAL_MS) return;

    session.lastChecked = new Date();

    if (session.recentTrades.length === 0) return;

    // Detect behavioural shifts in the trader's recent window
    const highValueTrades = session.recentTrades.filter(
      (t) => t.tradeValue > 1_000_000,
    );

    if (highValueTrades.length >= 3) {
      this.logger.warn(
        `Trader ${traderId} has ${highValueTrades.length} high-value trades in monitoring window`,
      );
      session.alertCount++;
    }
  }

  /** Update trader context window without queueing for re-analysis */
  private updateTraderContext(tradeDto: AnalyzeTradeDto): void {
    if (!this.monitoredTraders.has(tradeDto.traderId)) {
      this.startTraderMonitoring(tradeDto.traderId);
    }

    const session = this.monitoredTraders.get(tradeDto.traderId)!;
    session.recentTrades.push(tradeDto);

    // Sliding window — trim oldest
    if (session.recentTrades.length > this.CONTEXT_WINDOW_SIZE) {
      session.recentTrades.shift();
    }
  }

  /** Queue a trade for async batch analysis (does NOT analyze it inline) */
  enqueuePendingTrade(tradeDto: AnalyzeTradeDto): void {
    this.pendingTrades.push(tradeDto);
    this.updateTraderContext(tradeDto);
  }

  private getTraderContext(traderId: string): MonitoredTrader {
    return this.monitoredTraders.get(traderId) ?? {
      traderId,
      startedAt: new Date(),
      recentTrades: [],
      alertCount: 0,
      lastChecked: new Date(),
    };
  }

  private combineScores(mlScore: number, matchedPatterns: { confidence: number }[]): number {
    if (matchedPatterns.length === 0) return mlScore;

    const avgPatternScore =
      matchedPatterns.reduce((s, p) => s + p.confidence, 0) / matchedPatterns.length;

    // Weighted ensemble: 60% ML, 40% patterns
    const combined = mlScore * 0.6 + avgPatternScore * 0.4;

    // Boost when both agree
    const boost = mlScore > 0.5 && avgPatternScore > 0.5 ? 0.1 : 0;

    return Math.min(1, parseFloat((combined + boost).toFixed(4)));
  }

  private scoreToSeverity(score: number): FraudSeverity {
    if (score >= 0.85) return FraudSeverity.CRITICAL;
    if (score >= 0.65) return FraudSeverity.HIGH;
    if (score >= 0.40) return FraudSeverity.MEDIUM;
    return FraudSeverity.LOW;
  }

  private getRecommendedAction(severity: FraudSeverity, score: number): string {
    if (severity === FraudSeverity.CRITICAL || score >= 0.90) {
      return 'BLOCK_TRADE: Immediate block and escalate to compliance';
    }
    if (severity === FraudSeverity.HIGH) {
      return 'HOLD_AND_REVIEW: Flag for manual investigator review within 1 hour';
    }
    if (severity === FraudSeverity.MEDIUM) {
      return 'MONITOR: Continue monitoring, alert on next suspicious activity';
    }
    return 'LOG: No action required, trade logged for audit trail';
  }

  private generateCaseId(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `FRAUD-${date}-${uuidv4().slice(0, 8).toUpperCase()}`;
  }

  private async createFraudCase(
    tradeDto: AnalyzeTradeDto,
    score: number,
    severity: FraudSeverity,
    fraudTypes: any[],
    patterns: any[],
    evidence: any[],
  ): Promise<FraudCaseEntity> {
    const caseId = this.generateCaseId();

    const fraudCase = this.fraudCaseRepository.create({
      caseId,
      tradeId: tradeDto.tradeId,
      traderId: tradeDto.traderId,
      counterpartyId: tradeDto.counterpartyId,
      fraudType: fraudTypes[0] ?? 'unknown',
      severity,
      status: FraudCaseStatus.OPEN,
      mlScore: score,
      patternMatched: patterns[0]?.patternName ?? null,
      patternsTriggered: patterns.map((p) => p.patternId),
      evidence,
      tradeData: {
        market: tradeDto.market,
        assetType: tradeDto.assetType,
        quantity: tradeDto.quantity,
        price: tradeDto.price,
        side: tradeDto.side,
      },
      market: tradeDto.market,
      assetType: tradeDto.assetType,
      tradeValue: tradeDto.tradeValue,
      regulatoryReported: false,
      preventionApplied: severity === FraudSeverity.CRITICAL,
      preventionAction: severity === FraudSeverity.CRITICAL ? 'auto_block' : null,
    });

    const saved = await this.fraudCaseRepository.save(fraudCase);

    // Auto-generate SAR for HIGH/CRITICAL
    if (severity === FraudSeverity.HIGH || severity === FraudSeverity.CRITICAL) {
      await this.reportingService.generateSAR(saved);
    }

    this.logger.warn(
      `Fraud case created: ${caseId} | Trader: ${tradeDto.traderId} | Score: ${score} | Severity: ${severity}`,
    );

    return saved;
  }

  onModuleDestroy(): void {
    this.stopGlobalMonitoring();
    this.monitoredTraders.clear();
  }
}
