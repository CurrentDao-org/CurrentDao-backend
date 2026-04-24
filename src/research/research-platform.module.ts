import { Module } from '@nestjs/common';
import { ResearchPlatformController } from './research-platform.controller';
import { ResearchPlatformService } from './research-platform.service';
import { ResearchDataService } from './data/research-data.service';
import { InnovationLabService } from './innovation/innovation-lab.service';
import { CollaborationPlatformService } from './collaboration/collaboration-platform.service';
import { ExperimentalApiService } from './experimental/experimental-api.service';
import { ResearchManagementService } from './management/research-management.service';
import { InnovationTrackerService } from './innovation-tracking/innovation-tracker.service';
import { AcademicIntegrationService } from './academic/academic-integration.service';

@Module({
  controllers: [ResearchPlatformController],
  providers: [
    ResearchPlatformService,
    ResearchDataService,
    InnovationLabService,
    CollaborationPlatformService,
    ExperimentalApiService,
    ResearchManagementService,
    InnovationTrackerService,
    AcademicIntegrationService,
  ],
  exports: [
    ResearchPlatformService,
    ResearchDataService,
    InnovationLabService,
    CollaborationPlatformService,
    ExperimentalApiService,
    ResearchManagementService,
    InnovationTrackerService,
    AcademicIntegrationService,
  ],
})
export class ResearchPlatformModule {}
