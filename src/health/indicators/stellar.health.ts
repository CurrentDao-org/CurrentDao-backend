import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface StellarHealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  responseTime: number;
  network?: string;
  horizonUrl?: string;
  error?: string;
}

export interface StellarHealthDetails {
  network: string;
  horizonUrl: string;
  connected: boolean;
  latestLedger?: number;
  protocolVersion?: number;
  serverVersion?: string;
  coreVersion?: string;
  ingestVersion?: string;
}

@Injectable()
export class StellarHealthIndicator {
  private readonly horizonUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.horizonUrl = this.configService.get<string>('STELLAR_HORIZON_URL') || 'https://horizon-testnet.stellar.org';
  }

  async checkStellarApi(): Promise<StellarHealthCheck> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${this.horizonUrl}/`, { timeout: 5000 });
      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        responseTime,
        network: this.getNetworkFromUrl(this.horizonUrl),
        horizonUrl: this.horizonUrl,
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

  async checkStellarApiDetailed(): Promise<{ check: StellarHealthCheck; details: StellarHealthDetails }> {
    const startTime = Date.now();
    
    try {
      // Basic connectivity test
      const response = await axios.get(`${this.horizonUrl}/`, { timeout: 5000 });
      const responseTime = Date.now() - startTime;

      // Get detailed Stellar network information
      const details = await this.getStellarDetails();

      const check: StellarHealthCheck = {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        responseTime,
        network: this.getNetworkFromUrl(this.horizonUrl),
        horizonUrl: this.horizonUrl,
      };

      return { check, details };
    } catch (error) {
      const check: StellarHealthCheck = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error.message,
      };

      const details: StellarHealthDetails = {
        network: this.getNetworkFromUrl(this.horizonUrl),
        horizonUrl: this.horizonUrl,
        connected: false,
      };

      return { check, details };
    }
  }

  private async getStellarDetails(): Promise<StellarHealthDetails> {
    try {
      // Get detailed network information
      const response = await axios.get(`${this.horizonUrl}/`, { timeout: 5000 });
      const data = response.data;

      return {
        network: this.getNetworkFromUrl(this.horizonUrl),
        horizonUrl: this.horizonUrl,
        connected: true,
        latestLedger: data.history_latest_ledger,
        protocolVersion: data.protocol_version,
        serverVersion: data.horizon_version,
        coreVersion: data.core_version,
        ingestVersion: data.ingest_version,
      };
    } catch (error) {
      return {
        network: this.getNetworkFromUrl(this.horizonUrl),
        horizonUrl: this.horizonUrl,
        connected: false,
      };
    }
  }

  private getNetworkFromUrl(url: string): string {
    if (url.includes('testnet')) {
      return 'testnet';
    } else if (url.includes('mainnet')) {
      return 'mainnet';
    } else if (url.includes('futurenet')) {
      return 'futurenet';
    } else {
      return 'unknown';
    }
  }
}
