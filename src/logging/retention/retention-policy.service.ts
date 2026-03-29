import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';

export interface RetentionPolicy {
  name: string;
  pattern: string;
  hot_phase_days: number;
  warm_phase_days: number;
  cold_phase_days: number;
  delete_phase_days: number;
  max_size_gb?: number;
  max_docs?: number;
  conditions?: RetentionCondition[];
}

export interface RetentionCondition {
  field: string;
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'exists' | 'not_exists';
  value?: any;
  action: 'delete' | 'archive' | 'compress';
}

export interface RetentionPolicyResult {
  policy_name: string;
  indices_processed: number;
  documents_deleted: number;
  space_freed_mb: number;
  processing_time_ms: number;
  errors: string[];
}

export interface RetentionMetrics {
  total_indices: number;
  total_documents: number;
  total_storage_gb: number;
  indices_by_phase: Record<string, number>;
  storage_by_phase: Record<string, number>;
  oldest_index: string;
  newest_index: string;
  policies_active: number;
  next_cleanup_time: Date;
}

export interface StorageForecast {
  current_storage_gb: number;
  projected_30_days: number;
  projected_90_days: number;
  growth_rate_percent: number;
  recommended_retention_days: number;
  cost_impact: number;
}

@Injectable()
export class RetentionPolicyService implements OnModuleInit {
  private readonly logger = new Logger(RetentionPolicyService.name);
  private readonly defaultPolicies: RetentionPolicy[] = [];
  private retentionMetrics: RetentionMetrics;

  constructor(
    private readonly configService: ConfigService,
    private readonly elasticsearchService: ElasticsearchService,
  ) {
    this.initializeDefaultPolicies();
  }

  async onModuleInit() {
    this.logger.log('Initializing retention policy service');

    // Create default retention policies
    await this.createDefaultPolicies();

    // Initialize metrics
    await this.updateRetentionMetrics();

    this.logger.log('Retention policy service initialized');
  }

  private initializeDefaultPolicies(): void {
    this.defaultPolicies = [
      {
        name: 'application-logs-policy',
        pattern: 'currentdao-logs-*',
        hot_phase_days: 7,
        warm_phase_days: 23,
        cold_phase_days: 60,
        delete_phase_days: 90,
        max_size_gb: 50,
        max_docs: 10000000,
        conditions: [
          {
            field: 'level',
            operator: 'eq',
            value: 'error',
            action: 'archive',
          },
        ],
      },
      {
        name: 'security-logs-policy',
        pattern: 'currentdao-security-*',
        hot_phase_days: 30,
        warm_phase_days: 60,
        cold_phase_days: 180,
        delete_phase_days: 365,
        max_size_gb: 20,
        max_docs: 5000000,
      },
      {
        name: 'audit-logs-policy',
        pattern: 'currentdao-audit-*',
        hot_phase_days: 90,
        warm_phase_days: 180,
        cold_phase_days: 365,
        delete_phase_days: 2555, // 7 years
        max_size_gb: 100,
        max_docs: 50000000,
      },
      {
        name: 'performance-logs-policy',
        pattern: 'currentdao-perf-*',
        hot_phase_days: 3,
        warm_phase_days: 7,
        cold_phase_days: 14,
        delete_phase_days: 30,
        max_size_gb: 10,
        max_docs: 2000000,
      },
    ];
  }

  private async createDefaultPolicies(): Promise<void> {
    for (const policy of this.defaultPolicies) {
      try {
        await this.createRetentionPolicy(policy);
      } catch (error) {
        this.logger.error(
          `Failed to create retention policy ${policy.name}`,
          error,
        );
      }
    }
  }

  async createRetentionPolicy(policy: RetentionPolicy): Promise<void> {
    try {
      const ilmPolicy = {
        policy: {
          phases: {
            hot: {
              actions: {
                rollover: {
                  max_size: `${policy.max_size_gb || 10}gb`,
                  max_age: `${policy.hot_phase_days}d`,
                  max_docs: policy.max_docs || 1000000,
                },
                set_priority: { priority: 100 },
              },
            },
            warm: {
              min_age: `${policy.hot_phase_days}d`,
              actions: {
                set_priority: { priority: 50 },
                forcemerge: { max_num_segments: 1 },
              },
            },
            cold: {
              min_age: `${policy.hot_phase_days + policy.warm_phase_days}d`,
              actions: {
                set_priority: { priority: 0 },
              },
            },
            delete: {
              min_age: `${policy.hot_phase_days + policy.warm_phase_days + policy.cold_phase_days}d`,
            },
          },
        },
      };

      await this.elasticsearchService.getClient().ilm.lifecycle.put({
        policy: policy.name,
        policy: ilmPolicy.policy,
      });

      this.logger.log(`Retention policy ${policy.name} created successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to create retention policy ${policy.name}`,
        error,
      );
      throw error;
    }
  }

  async applyRetentionPolicy(
    policyName: string,
  ): Promise<RetentionPolicyResult> {
    const startTime = Date.now();
    const result: RetentionPolicyResult = {
      policy_name: policyName,
      indices_processed: 0,
      documents_deleted: 0,
      space_freed_mb: 0,
      processing_time_ms: 0,
      errors: [],
    };

    try {
      // Get policy details
      const policy = await this.getRetentionPolicy(policyName);
      if (!policy) {
        throw new Error(`Policy ${policyName} not found`);
      }

      // Get indices matching the policy pattern
      const indices = await this.getIndicesByPattern(policy.pattern);

      for (const index of indices) {
        try {
          const indexResult = await this.processIndex(index, policy);
          result.indices_processed++;
          result.documents_deleted += indexResult.documents_deleted;
          result.space_freed_mb += indexResult.space_freed_mb;
        } catch (error) {
          result.errors.push(
            `Failed to process index ${index}: ${error.message}`,
          );
        }
      }

      result.processing_time_ms = Date.now() - startTime;

      this.logger.log(
        `Retention policy ${policyName} applied successfully`,
        result,
      );
      return result;
    } catch (error) {
      result.processing_time_ms = Date.now() - startTime;
      result.errors.push(error.message);

      this.logger.error(
        `Failed to apply retention policy ${policyName}`,
        error,
      );
      return result;
    }
  }

  private async processIndex(
    indexName: string,
    policy: RetentionPolicy,
  ): Promise<{ documents_deleted: number; space_freed_mb: number }> {
    const startTime = Date.now();
    let documentsDeleted = 0;
    let spaceFreedMb = 0;

    try {
      // Get index stats before processing
      const statsBefore = await this.getIndexStats(indexName);

      // Apply retention conditions
      if (policy.conditions) {
        for (const condition of policy.conditions) {
          const deletionResult = await this.applyCondition(
            indexName,
            condition,
          );
          documentsDeleted += deletionResult.documents_deleted;
        }
      }

      // Check if index should be deleted based on age
      const indexAge = await this.getIndexAge(indexName);
      const maxAge =
        policy.hot_phase_days +
        policy.warm_phase_days +
        policy.cold_phase_days +
        policy.delete_phase_days;

      if (indexAge > maxAge) {
        await this.deleteIndex(indexName);
        documentsDeleted += statsBefore.doc_count;
        spaceFreedMb = this.convertBytesToMB(statsBefore.store_size);
      } else {
        // Optimize index if it's in warm or cold phase
        if (indexAge > policy.hot_phase_days) {
          await this.optimizeIndex(indexName);
        }
      }

      return {
        documents_deleted: documentsDeleted,
        space_freed_mb: spaceFreedMb,
      };
    } catch (error) {
      this.logger.error(`Failed to process index ${indexName}`, error);
      throw error;
    }
  }

  private async applyCondition(
    indexName: string,
    condition: RetentionCondition,
  ): Promise<{ documents_deleted: number }> {
    try {
      let query: any = {};

      switch (condition.operator) {
        case 'eq':
          query = { term: { [condition.field]: condition.value } };
          break;
        case 'ne':
          query = {
            bool: {
              must_not: { term: { [condition.field]: condition.value } },
            },
          };
          break;
        case 'gt':
          query = { range: { [condition.field]: { gt: condition.value } } };
          break;
        case 'lt':
          query = { range: { [condition.field]: { lt: condition.value } } };
          break;
        case 'exists':
          query = { exists: { field: condition.field } };
          break;
        case 'not_exists':
          query = {
            bool: { must_not: { exists: { field: condition.field } } },
          };
          break;
      }

      if (condition.action === 'delete') {
        const deleteResult = await this.deleteByQuery(indexName, query);
        return { documents_deleted: deleteResult.deleted };
      } else if (condition.action === 'archive') {
        // Move to archive index
        await this.archiveDocuments(indexName, query);
        return { documents_deleted: 0 }; // Archived, not deleted
      } else if (condition.action === 'compress') {
        // Compress documents (implementation depends on your setup)
        await this.compressDocuments(indexName, query);
        return { documents_deleted: 0 };
      }

      return { documents_deleted: 0 };
    } catch (error) {
      this.logger.error(
        `Failed to apply condition on index ${indexName}`,
        error,
      );
      throw error;
    }
  }

  private async deleteByQuery(
    indexName: string,
    query: any,
  ): Promise<{ deleted: number }> {
    const response = await this.elasticsearchService.getClient().deleteByQuery({
      index: indexName,
      body: { query },
      refresh: true,
    });

    return { deleted: response.deleted || 0 };
  }

  private async archiveDocuments(indexName: string, query: any): Promise<void> {
    // Create archive index name
    const archiveIndex = `${indexName}-archive-${new Date().toISOString().split('T')[0]}`;

    // Reindex documents to archive index
    await this.elasticsearchService.getClient().reindex({
      body: {
        source: { index: indexName, query },
        dest: { index: archiveIndex },
      },
    });

    // Delete from original index
    await this.deleteByQuery(indexName, query);
  }

  private async compressDocuments(
    indexName: string,
    query: any,
  ): Promise<void> {
    // Force merge to reduce segments
    await this.elasticsearchService.getClient().indices.forcemerge({
      index: indexName,
      max_num_segments: 1,
    });
  }

  private async getIndicesByPattern(pattern: string): Promise<string[]> {
    try {
      const response = await this.elasticsearchService.getClient().cat.indices({
        index: pattern,
        format: 'json',
      });

      return response.map((index: any) => index.index);
    } catch (error) {
      this.logger.error(`Failed to get indices for pattern ${pattern}`, error);
      return [];
    }
  }

  private async getIndexStats(indexName: string): Promise<any> {
    try {
      const response = await this.elasticsearchService
        .getClient()
        .indices.stats({
          index: indexName,
        });

      return response.indices[indexName];
    } catch (error) {
      this.logger.error(`Failed to get stats for index ${indexName}`, error);
      return { doc_count: 0, store_size: '0b' };
    }
  }

  private async getIndexAge(indexName: string): Promise<number> {
    try {
      const response = await this.elasticsearchService
        .getClient()
        .indices.getSettings({
          index: indexName,
        });

      const creationDate = response[indexName].settings.index.creation_date;
      const now = Date.now();

      return Math.floor((now - creationDate) / (1000 * 60 * 60 * 24)); // days
    } catch (error) {
      this.logger.error(`Failed to get age for index ${indexName}`, error);
      return 0;
    }
  }

  private async deleteIndex(indexName: string): Promise<void> {
    try {
      await this.elasticsearchService.getClient().indices.delete({
        index: indexName,
      });

      this.logger.log(`Index ${indexName} deleted successfully`);
    } catch (error) {
      this.logger.error(`Failed to delete index ${indexName}`, error);
      throw error;
    }
  }

  private async optimizeIndex(indexName: string): Promise<void> {
    try {
      await this.elasticsearchService.getClient().indices.forcemerge({
        index: indexName,
        max_num_segments: 1,
      });

      this.logger.log(`Index ${indexName} optimized successfully`);
    } catch (error) {
      this.logger.error(`Failed to optimize index ${indexName}`, error);
      throw error;
    }
  }

  private convertBytesToMB(bytes: string): number {
    const value = parseFloat(bytes.replace(/[^\d.]/g, ''));
    const unit = bytes.replace(/[\d.]/g, '').toLowerCase();

    switch (unit) {
      case 'kb':
        return value / 1024;
      case 'mb':
        return value;
      case 'gb':
        return value * 1024;
      case 'tb':
        return value * 1024 * 1024;
      case 'b':
      default:
        return value / (1024 * 1024);
    }
  }

  async getRetentionPolicy(
    policyName: string,
  ): Promise<RetentionPolicy | null> {
    try {
      const response = await this.elasticsearchService
        .getClient()
        .ilm.lifecycle.get({
          policy: policyName,
        });

      if (response[policyName]) {
        return this.parseILMPolicyToRetentionPolicy(
          policyName,
          response[policyName],
        );
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get retention policy ${policyName}`, error);
      return null;
    }
  }

  private parseILMPolicyToRetentionPolicy(
    policyName: string,
    ilmPolicy: any,
  ): RetentionPolicy {
    const phases = ilmPolicy.policy.phases;

    return {
      name: policyName,
      pattern: '', // Not stored in ILM policy
      hot_phase_days: this.extractDaysFromPhase(phases.hot),
      warm_phase_days: this.extractDaysFromPhase(phases.warm),
      cold_phase_days: this.extractDaysFromPhase(phases.cold),
      delete_phase_days: this.extractDaysFromPhase(phases.delete),
    };
  }

  private extractDaysFromPhase(phase: any): number {
    if (!phase || !phase.min_age) return 0;

    const ageStr = phase.min_age;
    const match = ageStr.match(/(\d+)d/);
    return match ? parseInt(match[1]) : 0;
  }

  async getAllRetentionPolicies(): Promise<RetentionPolicy[]> {
    const policies: RetentionPolicy[] = [];

    for (const defaultPolicy of this.defaultPolicies) {
      const policy = await this.getRetentionPolicy(defaultPolicy.name);
      if (policy) {
        policies.push(policy);
      }
    }

    return policies;
  }

  async updateRetentionMetrics(): Promise<void> {
    try {
      const indices = await this.elasticsearchService.getIndexMetrics();

      let totalDocuments = 0;
      let totalStorageGB = 0;
      const indicesByPhase: Record<string, number> = {};
      const storageByPhase: Record<string, number> = {};

      let oldestIndex = '';
      let newestIndex = '';
      let oldestDate = new Date();
      let newestDate = new Date(0);

      for (const index of indices) {
        totalDocuments += index.doc_count;
        totalStorageGB += this.convertBytesToGB(index.store_size);

        // Determine phase based on index name pattern
        const phase = this.determineIndexPhase(index.index_name);
        indicesByPhase[phase] = (indicesByPhase[phase] || 0) + 1;
        storageByPhase[phase] =
          (storageByPhase[phase] || 0) +
          this.convertBytesToGB(index.store_size);

        // Track oldest and newest indices
        const indexDate = this.extractDateFromIndexName(index.index_name);
        if (indexDate < oldestDate) {
          oldestDate = indexDate;
          oldestIndex = index.index_name;
        }
        if (indexDate > newestDate) {
          newestDate = indexDate;
          newestIndex = index.index_name;
        }
      }

      this.retentionMetrics = {
        total_indices: indices.length,
        total_documents: totalDocuments,
        total_storage_gb: totalStorageGB,
        indices_by_phase: indicesByPhase,
        storage_by_phase: storageByPhase,
        oldest_index: oldestIndex,
        newest_index: newestIndex,
        policies_active: this.defaultPolicies.length,
        next_cleanup_time: this.getNextCleanupTime(),
      };
    } catch (error) {
      this.logger.error('Failed to update retention metrics', error);
    }
  }

  private determineIndexPhase(indexName: string): string {
    // Simple heuristic based on index name patterns
    if (indexName.includes('hot')) return 'hot';
    if (indexName.includes('warm')) return 'warm';
    if (indexName.includes('cold')) return 'cold';
    return 'unknown';
  }

  private extractDateFromIndexName(indexName: string): Date {
    // Extract date from index name like "currentdao-logs-2024-03-29"
    const match = indexName.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? new Date(match[1]) : new Date();
  }

  private convertBytesToGB(bytes: string): number {
    return this.convertBytesToMB(bytes) / 1024;
  }

  private getNextCleanupTime(): Date {
    const now = new Date();
    const nextCleanup = new Date(now);
    nextCleanup.setHours(nextCleanup.getHours() + 1);
    nextCleanup.setMinutes(0);
    nextCleanup.setSeconds(0);
    return nextCleanup;
  }

  async getStorageForecast(): Promise<StorageForecast> {
    try {
      const currentMetrics = await this.getRetentionMetrics();

      // Get historical data for growth calculation
      const growthRate = await this.calculateGrowthRate();

      const currentStorage = currentMetrics.total_storage_gb;
      const projected30Days = currentStorage * (1 + (growthRate / 100) * 30);
      const projected90Days = currentStorage * (1 + (growthRate / 100) * 90);

      // Calculate recommended retention days based on storage constraints
      const maxStorageGB = this.configService.get('MAX_LOG_STORAGE_GB') || 1000;
      const recommendedRetentionDays = Math.floor(
        (maxStorageGB / currentStorage) * 90,
      );

      // Calculate cost impact (simplified)
      const costPerGB = this.configService.get('STORAGE_COST_PER_GB') || 0.023; // AWS approximate
      const costImpact = (projected90Days - currentStorage) * costPerGB;

      return {
        current_storage_gb: currentStorage,
        projected_30_days: projected30Days,
        projected_90_days: projected90Days,
        growth_rate_percent: growthRate,
        recommended_retention_days: Math.max(
          30,
          Math.min(365, recommendedRetentionDays),
        ),
        cost_impact: costImpact,
      };
    } catch (error) {
      this.logger.error('Failed to generate storage forecast', error);
      throw error;
    }
  }

  private async calculateGrowthRate(): Promise<number> {
    try {
      // Get storage data for the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const indices = await this.getIndicesByPattern('currentdao-logs-*');
      const recentIndices = indices.filter((index) => {
        const indexDate = this.extractDateFromIndexName(index);
        return indexDate >= sevenDaysAgo;
      });

      if (recentIndices.length < 2) {
        return 5; // Default 5% growth rate
      }

      // Calculate growth based on recent indices
      const storageData = await Promise.all(
        recentIndices.map(async (index) => {
          const stats = await this.getIndexStats(index);
          return this.convertBytesToGB(stats.store_size);
        }),
      );

      const oldestStorage = storageData[0];
      const newestStorage = storageData[storageData.length - 1];

      if (oldestStorage === 0) return 5;

      const growthRate =
        ((newestStorage - oldestStorage) / oldestStorage) * 100;
      return Math.max(0, growthRate);
    } catch (error) {
      this.logger.error('Failed to calculate growth rate', error);
      return 5; // Default 5% growth rate
    }
  }

  // Scheduled cleanup operations
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledCleanup(): Promise<void> {
    this.logger.log('Starting scheduled retention cleanup');

    try {
      const policies = await this.getAllRetentionPolicies();

      for (const policy of policies) {
        try {
          await this.applyRetentionPolicy(policy.name);
        } catch (error) {
          this.logger.error(
            `Failed to apply policy ${policy.name} in scheduled cleanup`,
            error,
          );
        }
      }

      // Update metrics after cleanup
      await this.updateRetentionMetrics();

      this.logger.log('Scheduled retention cleanup completed');
    } catch (error) {
      this.logger.error('Scheduled retention cleanup failed', error);
    }
  }

  // Public API methods
  async getRetentionMetrics(): Promise<RetentionMetrics> {
    return this.retentionMetrics;
  }

  async deleteRetentionPolicy(policyName: string): Promise<void> {
    try {
      await this.elasticsearchService.getClient().ilm.lifecycle.delete({
        policy: policyName,
      });

      this.logger.log(`Retention policy ${policyName} deleted successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to delete retention policy ${policyName}`,
        error,
      );
      throw error;
    }
  }

  async forceCleanup(policyName?: string): Promise<RetentionPolicyResult[]> {
    const results: RetentionPolicyResult[] = [];

    if (policyName) {
      const result = await this.applyRetentionPolicy(policyName);
      results.push(result);
    } else {
      const policies = await this.getAllRetentionPolicies();
      for (const policy of policies) {
        const result = await this.applyRetentionPolicy(policy.name);
        results.push(result);
      }
    }

    return results;
  }
}
