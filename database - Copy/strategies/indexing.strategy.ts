import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

interface IndexDefinition {
  table: string;
  columns: string[];
  unique?: boolean;
  name?: string;
}

@Injectable()
export class IndexingStrategy {
  private readonly logger = new Logger(IndexingStrategy.name);

  // Define all recommended indexes for the platform
  private readonly recommendedIndexes: IndexDefinition[] = [
    { table: 'users', columns: ['email'], unique: true, name: 'idx_users_email' },
    { table: 'users', columns: ['created_at'], name: 'idx_users_created_at' },
    { table: 'transactions', columns: ['user_id', 'created_at'], name: 'idx_transactions_user_date' },
    { table: 'transactions', columns: ['status'], name: 'idx_transactions_status' },
    { table: 'fraud_cases', columns: ['user_id', 'status'], name: 'idx_fraud_cases_user_status' },
    { table: 'audit_logs', columns: ['entity_id', 'entity_type'], name: 'idx_audit_entity' },
  ];

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async applyRecommendedIndexes(): Promise<void> {
    this.logger.log('Applying recommended indexes...');
    for (const index of this.recommendedIndexes) {
      await this.createIndexIfNotExists(index);
    }
    this.logger.log('Recommended indexes applied');
  }

  private async createIndexIfNotExists(index: IndexDefinition): Promise<void> {
    const name = index.name || `idx_${index.table}_${index.columns.join('_')}`;
    const unique = index.unique ? 'UNIQUE' : '';
    const cols = index.columns.join(', ');

    try {
      await this.connection.query(
        `CREATE ${unique} INDEX IF NOT EXISTS ${name} ON ${index.table} (${cols})`,
      );
      this.logger.debug(`Index ensured: ${name}`);
    } catch (error) {
      this.logger.warn(`Could not create index ${name}: ${(error as Error).message}`);
    }
  }

  async analyzeUnusedIndexes(): Promise<any[]> {
    try {
      // MySQL-specific: find indexes with zero usage
      const result = await this.connection.query(`
        SELECT object_schema, object_name, index_name
        FROM performance_schema.table_io_waits_summary_by_index_usage
        WHERE index_name IS NOT NULL
          AND count_star = 0
          AND object_schema NOT IN ('mysql', 'information_schema', 'performance_schema')
        ORDER BY object_schema, object_name
      `);
      return result;
    } catch {
      this.logger.warn('Could not query index usage stats (requires performance_schema)');
      return [];
    }
  }

  async getIndexStats(): Promise<any[]> {
    try {
      return await this.connection.query(`
        SELECT table_name, index_name, seq_in_index, column_name, cardinality
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
        ORDER BY table_name, index_name, seq_in_index
      `);
    } catch {
      return [];
    }
  }
}