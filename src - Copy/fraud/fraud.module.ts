import { Module } from '@nestjs/common';
import { FraudController } from './fraud.controller';
import { FraudService } from './fraud.service';
import { FraudDetectionService } from './ml-models/fraud-detection.service';
import { RealTimeMonitorService } from './monitoring/real-time-monitor.service';
import { PatternRecognitionService } from './patterns/pattern-recognition.service';
import { BehavioralAnalysisService } from './behavioral/behavioral-analysis.service';
import { CaseManagementService } from './investigation/case-management.service';

@Module({
  controllers: [FraudController],
  providers: [
    FraudService,
    FraudDetectionService,
    RealTimeMonitorService,
    PatternRecognitionService,
    BehavioralAnalysisService,
    CaseManagementService,
  ],
  exports: [FraudService],
})
export class FraudModule {}