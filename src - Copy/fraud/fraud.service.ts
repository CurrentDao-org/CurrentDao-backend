import { Injectable, Logger } from '@nestjs/common';
import { FraudDetectionService } from './ml-models/fraud-detection.service';
import { RealTimeMonitorService } from './monitoring/real-time-monitor.service';
import { PatternRecognitionService } from './patterns/pattern-recognition.service';
import { BehavioralAnalysisService } from './behavioral/behavioral-analysis.service';
import { CaseManagementService } from './investigation/case-management.service';

@Injectable()
export class FraudService {
  private readonly logger = new Logger(FraudService.name);

  constructor(
    private readonly fraudDetection: FraudDetectionService,
    private readonly realTimeMonitor: RealTimeMonitorService,
    private readonly patternRecognition: PatternRecognitionService,
    private readonly behavioralAnalysis: BehavioralAnalysisService,
    private readonly caseManagement: CaseManagementService,
  ) {}

  async analyzeTransaction(transaction: Record<string, any>): Promise<Record<string, any>> {
    const [mlScore, patternFlags, behaviorScore] = await Promise.all([
      this.fraudDetection.score(transaction),
      this.patternRecognition.analyze(transaction),
      this.behavioralAnalysis.score(transaction.userId, transaction),
    ]);

    const isFraud = mlScore > 0.85 || patternFlags.highRisk;

    if (isFraud) {
      await this.caseManagement.openCase({ transaction, mlScore, patternFlags, behaviorScore });
      await this.realTimeMonitor.block(transaction.id);
    }

    return { isFraud, mlScore, patternFlags, behaviorScore };
  }

  async getCases(status?: string) {
    return this.caseManagement.getCases(status);
  }

  async getCaseById(id: string) {
    return this.caseManagement.getCaseById(id);
  }

  async resolveCase(id: string, resolution: Record<string, any>) {
    return this.caseManagement.resolveCase(id, resolution);
  }

  async getMetrics() {
    return {
      detection: await this.fraudDetection.getMetrics(),
      monitor: this.realTimeMonitor.getStats(),
      cases: await this.caseManagement.getStats(),
    };
  }
}