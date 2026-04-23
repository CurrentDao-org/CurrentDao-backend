import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection, QueryRunner } from 'typeorm';
import { Pool } from 'mysql2/promise';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;
  private healthCheckInterval: NodeJS.Timeout;

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing database service...');
    await this.initializeConnectionPool();
    this.startHealthMonitoring();
  }

  async onModuleDestroy() {
    this.logger.log('Destroying database service...');
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.pool) {
      await this.pool.end();
    }
  }

  private async initializeConnectionPool() {
    // Initialize connection pool for advanced operations
    // This complements TypeORM's built-in pooling
    this.pool = this.connection.driver.pool as Pool;
    this.logger.log('Database connection pool initialized');
  }

  private startHealthMonitoring() {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }

  private async performHealthCheck() {
    try {
      const queryRunner = this.connection.createQueryRunner();
      await queryRunner.query('SELECT 1');
      await queryRunner.release();
      this.logger.debug('Database health check passed');
    } catch (error) {
      this.logger.error('Database health check failed', error);
      // Emit alert or handle failure
    }
  }

  async getConnectionStats() {
    if (!this.pool) return null;

    return {
      totalConnections: this.pool.pool?.totalCount || 0,
      idleConnections: this.pool.pool?.idleCount || 0,
      waitingRequests: this.pool.pool?.borrowerCount || 0,
    };
  }

  async executeQuery(query: string, parameters?: any[]): Promise<any> {
    const queryRunner = this.connection.createQueryRunner();
    try {
      return await queryRunner.query(query, parameters);
    } finally {
      await queryRunner.release();
    }
  }

  async createTransaction(): Promise<QueryRunner> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    return queryRunner;
  }

  async optimizeIndexes() {
    // Implement intelligent indexing strategy
    this.logger.log('Optimizing database indexes...');
    // This would analyze query patterns and create/drop indexes accordingly
    // For now, a placeholder
  }

  async getPerformanceMetrics() {
    const stats = await this.getConnectionStats();
    return {
      connectionStats: stats,
      queryCount: 0, // Would track via middleware
      slowQueries: [], // Would collect slow queries
    };
  }
}