/**
 * Database Provider
 *
 * Custom provider for database connections with connection pooling,
 * health checks, and proper lifecycle management.
 */

import {
  Provider,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

/**
 * Database provider options
 */
export interface DatabaseProviderOptions {
  /** Enable query logging */
  logQueries?: boolean;
  /** Connection pool size */
  poolSize?: number;
  /** Connection timeout in ms */
  connectionTimeout?: number;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: DatabaseProviderOptions = {
  logQueries: process.env.NODE_ENV === 'development',
  poolSize: 10,
  connectionTimeout: 30000,
};

/**
 * Database health check result
 */
export interface DatabaseHealth {
  /** Whether the database is connected */
  connected: boolean;
  /** Database type */
  type: string;
  /** Database name */
  database: string;
  /** Connection timestamp */
  timestamp: string;
  /** Active connections in pool */
  activeConnections?: number;
  /** Idle connections in pool */
  idleConnections?: number;
}

/**
 * Database provider token
 */
export const DATABASE_PROVIDER = 'DATABASE_PROVIDER';

/**
 * Custom database provider with enhanced functionality
 */
@Injectable()
export class DatabaseProvider implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseProvider.name);
  private readonly options: DatabaseProviderOptions;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    options?: DatabaseProviderOptions,
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Initialize on module load
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing database provider...');

    // Verify connection
    const isConnected = await this.isConnected();
    if (!isConnected) {
      this.logger.error('Database connection not established');
      throw new Error('Database connection failed');
    }

    this.logger.log('Database provider initialized successfully');
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing database connections...');
    await this.dataSource.destroy();
    this.logger.log('Database connections closed');
  }

  /**
   * Get the data source
   */
  getDataSource(): DataSource {
    return this.dataSource;
  }

  /**
   * Get the entity manager
   */
  getManager(): EntityManager {
    return this.dataSource.manager;
  }

  /**
   * Check if database is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get database health status
   */
  async getHealth(): Promise<DatabaseHealth> {
    const isConnected = await this.isConnected();

    return {
      connected: isConnected,
      type: this.dataSource.options.type as string,
      database: this.dataSource.options.database as string,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute a transaction
   */
  async executeTransaction<T>(
    callback: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(callback);
  }

  /**
   * Run raw query
   */
  async query<T = any>(sql: string, params?: any[]): Promise<T> {
    return this.dataSource.query(sql, params);
  }
}

/**
 * Factory function to create database provider
 */
export const createDatabaseProvider = (
  dataSource: DataSource,
  options?: DatabaseProviderOptions,
): Provider => {
  return {
    provide: DATABASE_PROVIDER,
    useFactory: () => new DatabaseProvider(dataSource, options),
    inject: [InjectDataSource],
  };
};

/**
 * Inject database provider
 */
export const InjectDatabaseProvider = () => {
  return {
    provide: DATABASE_PROVIDER,
    useFactory: (dataSource: DataSource) => new DatabaseProvider(dataSource),
    inject: [InjectDataSource],
  };
};

/**
 * Token for database configuration
 */
export const DATABASE_CONFIG_TOKEN = 'DATABASE_CONFIG';

/**
 * Custom database configuration provider
 */
export const createDatabaseConfigProvider = () => {
  return {
    provide: DATABASE_CONFIG_TOKEN,
    useFactory: () => ({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'currentdao',
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
      autoLoadEntities: true,
      poolSize: 10,
    }),
  };
};
