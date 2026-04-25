import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface DatabaseHealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  responseTime: number;
  connection?: any;
  error?: string;
}

export interface DatabaseHealthDetails {
  connected: boolean;
  host: string;
  database: string;
  connectionCount?: number;
  maxConnections?: number;
  version?: string;
  uptime?: number;
}

@Injectable()
export class DatabaseHealthIndicator {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async checkDatabase(): Promise<DatabaseHealthCheck> {
    const startTime = Date.now();
    
    try {
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 100 ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        responseTime,
        connection: {
          connected: true,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  async checkDatabaseDetailed(): Promise<{ check: DatabaseHealthCheck; details: DatabaseHealthDetails }> {
    const startTime = Date.now();
    
    try {
      // Basic connectivity test
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      // Get detailed database information
      const details = await this.getDatabaseDetails();

      const check: DatabaseHealthCheck = {
        status: responseTime < 100 ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        responseTime,
        connection: {
          connected: true,
        },
      };

      return { check, details };
    } catch (error) {
      const check: DatabaseHealthCheck = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error.message,
      };

      const details: DatabaseHealthDetails = {
        connected: false,
        host: process.env.DB_HOST || 'unknown',
        database: process.env.DB_NAME || 'unknown',
      };

      return { check, details };
    }
  }

  private async getDatabaseDetails(): Promise<DatabaseHealthDetails> {
    try {
      // Get database version and connection info
      const versionResult = await this.dataSource.query('SELECT VERSION() as version');
      const connectionInfo = await this.dataSource.query('SHOW STATUS LIKE "Threads_connected"');
      const maxConnectionsResult = await this.dataSource.query('SHOW VARIABLES LIKE "max_connections"');
      const uptimeResult = await this.dataSource.query('SHOW STATUS LIKE "Uptime"');

      return {
        connected: true,
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'unknown',
        connectionCount: parseInt(connectionInfo[0]?.Value || '0'),
        maxConnections: parseInt(maxConnectionsResult[0]?.Value || '0'),
        version: versionResult[0]?.version || 'unknown',
        uptime: parseInt(uptimeResult[0]?.Value || '0'),
      };
    } catch (error) {
      return {
        connected: true,
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'unknown',
      };
    }
  }
}
