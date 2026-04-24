import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindManyOptions } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import {
  FraudCaseEntity,
  FraudCaseStatus,
  FraudSeverity,
  FraudType,
} from '../entities/fraud-case.entity';
import {
  FraudReportQueryDto,
  InvestigationUpdateDto,
} from '../dto/fraud-alert.dto';
import { v4 as uuidv4 } from 'uuid';

export interface SarReport {
  sarReference: string;
  generatedAt: Date;
  caseId: string;
  traderId: string;
  fraudType: FraudType;
  severity: FraudSeverity;
  summary: string;
  evidence: object[];
  tradeData: object;
  mlScore: number;
  patternsMatched: string[];
  reportingObligation: string;
  regulatoryBodies: string[];
}

export interface PaginatedCases {
  data: FraudCaseEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class SuspiciousActivityService {
  private readonly logger = new Logger(SuspiciousActivityService.name);

  constructor(
    @InjectRepository(FraudCaseEntity)
    private readonly fraudCaseRepository: Repository<FraudCaseEntity>,
  ) {}

  // ─── SAR Generation ──────────────────────────────────────────────────────

  /** Auto-generate Suspicious Activity Report for a fraud case */
  async generateSAR(fraudCase: FraudCaseEntity): Promise<SarReport> {
    const sarReference = `SAR-${new Date().getFullYear()}-${uuidv4().slice(0, 8).toUpperCase()}`;

    const sar: SarReport = {
      sarReference,
      generatedAt: new Date(),
      caseId: fraudCase.caseId,
      traderId: fraudCase.traderId,
      fraudType: fraudCase.fraudType,
      severity: fraudCase.severity,
      summary: this.buildSarSummary(fraudCase),
      evidence: fraudCase.evidence ?? [],
      tradeData: fraudCase.tradeData ?? {},
      mlScore: Number(fraudCase.mlScore),
      patternsMatched: fraudCase.patternsTriggered ?? [],
      reportingObligation: this.determineReportingObligation(
        fraudCase.severity,
      ),
      regulatoryBodies: this.getApplicableRegulators(
        fraudCase.market ?? '',
        fraudCase.fraudType,
      ),
    };

    // Persist SAR reference back to the case
    await this.fraudCaseRepository.update(fraudCase.id, {
      sarReference,
      regulatoryReported: fraudCase.severity === FraudSeverity.CRITICAL,
      status:
        fraudCase.severity === FraudSeverity.CRITICAL
          ? FraudCaseStatus.REGULATORY_REPORTED
          : fraudCase.status,
    });

    this.logger.log(
      `SAR generated: ${sarReference} for case ${fraudCase.caseId}`,
    );

    return sar;
  }

  /** Generate SAR by case ID */
  async generateSARById(caseId: string): Promise<SarReport | null> {
    const fraudCase = await this.fraudCaseRepository.findOne({
      where: { caseId },
    });
    if (!fraudCase) return null;
    return this.generateSAR(fraudCase);
  }

  // ─── Case Management ─────────────────────────────────────────────────────

  /** Get paginated fraud cases with optional filters */
  async queryCases(queryDto: FraudReportQueryDto): Promise<PaginatedCases> {
    const {
      fraudType,
      severity,
      status,
      traderId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      minMlScore,
      regulatoryReported,
    } = queryDto;

    const where: FindManyOptions<FraudCaseEntity>['where'] = {};

    if (fraudType) where['fraudType'] = fraudType;
    if (severity) where['severity'] = severity;
    if (status) where['status'] = status;
    if (traderId) where['traderId'] = traderId;
    if (regulatoryReported !== undefined)
      where['regulatoryReported'] = regulatoryReported;

    if (startDate && endDate) {
      where['createdAt'] = Between(new Date(startDate), new Date(endDate));
    }

    const [data, total] = await this.fraudCaseRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Apply mlScore filter in-memory (TypeORM decimal comparison can be tricky)
    const filtered = minMlScore
      ? data.filter((c) => Number(c.mlScore) >= minMlScore)
      : data;

    return {
      data: filtered,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Get a single case by its ID */
  async getCaseById(id: string): Promise<FraudCaseEntity | null> {
    return this.fraudCaseRepository.findOne({ where: { id } });
  }

  /** Get a single case by its human-readable case ID */
  async getCaseByCaseId(caseId: string): Promise<FraudCaseEntity | null> {
    return this.fraudCaseRepository.findOne({ where: { caseId } });
  }

  /** Update investigation status / assignee / notes */
  async updateCase(
    id: string,
    update: InvestigationUpdateDto,
  ): Promise<FraudCaseEntity | null> {
    const updates: Partial<FraudCaseEntity> = {
      status: update.status,
    };

    if (update.investigationNotes)
      updates.investigationNotes = update.investigationNotes;
    if (update.assignedTo) updates.assignedTo = update.assignedTo;
    if (update.falsePositiveReason)
      updates.falsePositiveReason = update.falsePositiveReason;
    if (update.resolvedBy) updates.resolvedBy = update.resolvedBy;

    if (
      update.status === FraudCaseStatus.RESOLVED ||
      update.status === FraudCaseStatus.FALSE_POSITIVE
    ) {
      updates.resolvedAt = new Date();
    }

    await this.fraudCaseRepository.update(id, updates);

    this.logger.log(`Case ${id} updated to status: ${update.status}`);

    return this.fraudCaseRepository.findOne({ where: { id } });
  }

  /** Get all cases for a specific trader */
  async getCasesByTrader(
    traderId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedCases> {
    const [data, total] = await this.fraudCaseRepository.findAndCount({
      where: { traderId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Metrics & Dashboard ─────────────────────────────────────────────────

  async getMetrics(): Promise<object> {
    const [
      totalCases,
      openCases,
      resolvedCases,
      falsePositives,
      criticalCases,
    ] = await Promise.all([
      this.fraudCaseRepository.count(),
      this.fraudCaseRepository.count({
        where: { status: FraudCaseStatus.OPEN },
      }),
      this.fraudCaseRepository.count({
        where: { status: FraudCaseStatus.RESOLVED },
      }),
      this.fraudCaseRepository.count({
        where: { status: FraudCaseStatus.FALSE_POSITIVE },
      }),
      this.fraudCaseRepository.count({
        where: { severity: FraudSeverity.CRITICAL },
      }),
    ]);

    const allCases = await this.fraudCaseRepository.find({ take: 1000 });
    const avgMlScore =
      allCases.length > 0
        ? allCases.reduce((s, c) => s + Number(c.mlScore), 0) / allCases.length
        : 0;

    const falsePositiveRate =
      totalCases > 0 ? parseFloat((falsePositives / totalCases).toFixed(4)) : 0;

    const detectionRate =
      totalCases > 0
        ? parseFloat(((totalCases - falsePositives) / totalCases).toFixed(4))
        : 0;

    // Cases by type
    const casesByType: Record<string, number> = {};
    const casesBySeverity: Record<string, number> = {};
    for (const c of allCases) {
      casesByType[c.fraudType] = (casesByType[c.fraudType] ?? 0) + 1;
      casesBySeverity[c.severity] = (casesBySeverity[c.severity] ?? 0) + 1;
    }

    // Average resolution time
    const resolvedWithTime = allCases.filter(
      (c) => c.resolvedAt && c.createdAt,
    );
    const avgResolutionHours =
      resolvedWithTime.length > 0
        ? resolvedWithTime.reduce(
            (s, c) =>
              s + (c.resolvedAt.getTime() - c.createdAt.getTime()) / 3_600_000,
            0,
          ) / resolvedWithTime.length
        : 0;

    return {
      totalCases,
      openCases,
      resolvedCases,
      falsePositives,
      criticalCases,
      falsePositiveRate,
      detectionRate,
      averageMlScore: parseFloat(avgMlScore.toFixed(4)),
      casesByType,
      casesBySeverity,
      averageResolutionTimeHours: parseFloat(avgResolutionHours.toFixed(2)),
    };
  }

  // ─── Scheduled Jobs ──────────────────────────────────────────────────────

  /** Daily SAR summary sweep — auto-report all unprocessed CRITICAL cases */
  @Cron('0 6 * * *') // 6 AM every day
  async dailySarSweep(): Promise<void> {
    this.logger.log('Running daily SAR sweep for unprocessed critical cases');

    const unreported = await this.fraudCaseRepository.find({
      where: {
        severity: FraudSeverity.CRITICAL,
        regulatoryReported: false,
        status: FraudCaseStatus.OPEN,
      },
    });

    for (const fraudCase of unreported) {
      await this.generateSAR(fraudCase);
    }

    this.logger.log(
      `Daily SAR sweep complete: processed ${unreported.length} cases`,
    );
  }

  /** Weekly compliance report */
  @Cron('0 8 * * 1') // Monday 8 AM
  async weeklyComplianceReport(): Promise<void> {
    const metrics = await this.getMetrics();
    this.logger.log(
      `Weekly Fraud Compliance Report: ${JSON.stringify(metrics, null, 2)}`,
    );
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private buildSarSummary(fraudCase: FraudCaseEntity): string {
    return (
      `Suspicious Activity Report: ${fraudCase.fraudType.replace(/_/g, ' ').toUpperCase()} ` +
      `detected for trader ${fraudCase.traderId}. ` +
      `ML confidence score: ${Number(fraudCase.mlScore).toFixed(2)}. ` +
      `Severity: ${fraudCase.severity.toUpperCase()}. ` +
      `Patterns triggered: ${(fraudCase.patternsTriggered ?? []).join(', ')}. ` +
      `Market: ${fraudCase.market ?? 'Unknown'}. ` +
      `Trade value: $${Number(fraudCase.tradeValue ?? 0).toLocaleString()}.`
    );
  }

  private determineReportingObligation(severity: FraudSeverity): string {
    switch (severity) {
      case FraudSeverity.CRITICAL:
        return 'MANDATORY: File SAR within 30 days per FinCEN/REMIT regulations';
      case FraudSeverity.HIGH:
        return 'REQUIRED: File SAR within 60 days; notify compliance immediately';
      case FraudSeverity.MEDIUM:
        return 'RECOMMENDED: File SAR and retain records for 5 years';
      default:
        return 'OPTIONAL: Log and monitor; no immediate SAR required';
    }
  }

  private getApplicableRegulators(
    market: string,
    fraudType: FraudType,
  ): string[] {
    const regulators: string[] = ['FinCEN', 'CFTC'];

    if (market.includes('EU') || market.includes('ETS'))
      regulators.push('ACER', 'ESMA');
    if (market.includes('PJM') || market.includes('ERCOT'))
      regulators.push('FERC', 'NERC');
    if (market.includes('GB') || market.includes('UK'))
      regulators.push('Ofgem', 'FCA');

    if (fraudType === FraudType.INSIDER_TRADING) regulators.push('SEC');
    if (fraudType === FraudType.MARKET_MANIPULATION)
      regulators.push('CFTC', 'FCA');

    return [...new Set(regulators)];
  }
}
