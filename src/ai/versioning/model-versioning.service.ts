import { Injectable, Logger } from '@nestjs/common';

interface ModelVersion {
  modelId: string;
  version: string;
  createdAt: Date;
  active: boolean;
  metrics?: Record<string, number>;
}

@Injectable()
export class ModelVersioningService {
  private readonly logger = new Logger(ModelVersioningService.name);
  private readonly versions = new Map<string, ModelVersion[]>();

  registerVersion(modelId: string, version: string, metrics?: Record<string, number>): void {
    const existing = this.versions.get(modelId) || [];
    existing.push({ modelId, version, createdAt: new Date(), active: true, metrics });
    this.versions.set(modelId, existing);
    this.logger.log(`Version registered: ${modelId}@${version}`);
  }

  getVersions(modelId: string): ModelVersion[] {
    return this.versions.get(modelId) || [];
  }

  getActiveVersion(modelId: string): ModelVersion | null {
    const versions = this.versions.get(modelId) || [];
    return versions.find(v => v.active) || null;
  }

  rollback(modelId: string, version: string): void {
    const versions = this.versions.get(modelId) || [];
    versions.forEach(v => { v.active = v.version === version; });
    this.logger.warn(`Rolled back ${modelId} to version ${version}`);
  }
}