import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FraudCaseEntity } from './entities/fraud-case.entity';
import { FraudMlService } from './ml/fraud-ml.service';
import { PatternRecognitionService } from './patterns/pattern-recognition.service';
import { RealTimeMonitorService } from './monitoring/real-time-monitor.service';
import { SuspiciousActivityService } from './reporting/suspicious-activity.service';
import { FraudPreventionService } from './prevention/fraud-prevention.service';
import { FraudDetectionController } from './fraud-detection.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FraudCaseEntity])],
  controllers: [FraudDetectionController],
  providers: [
    FraudMlService,
    PatternRecognitionService,
    RealTimeMonitorService,
    SuspiciousActivityService,
    FraudPreventionService,
  ],
  exports: [
    FraudMlService,
    PatternRecognitionService,
    RealTimeMonitorService,
    SuspiciousActivityService,
    FraudPreventionService,
  ],
})
export class FraudDetectionModule {}
