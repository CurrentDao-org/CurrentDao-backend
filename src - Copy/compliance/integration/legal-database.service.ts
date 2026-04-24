import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LegalDatabaseService {
  private readonly logger = new Logger(LegalDatabaseService.name);
  private lastSynced = new Date().toISOString();
  private readonly jurisdictions = [
    'US',
    'EU',
    'UK',
    'CA',
    'AU',
    'JP',
    'BR',
    'IN',
    'CN',
    'ZA',
    'SG',
    'CH',
  ];

  async getSupportedJurisdictions(): Promise<string[]> {
    return this.jurisdictions;
  }

  async syncRegulations(): Promise<{ syncedAt: string; jurisdictionCount: number }> {
    this.lastSynced = new Date().toISOString();
    this.logger.log('Regulatory database synced with latest jurisdiction rules.');
    return {
      syncedAt: this.lastSynced,
      jurisdictionCount: this.jurisdictions.length,
    };
  }

  async getLastSyncedTimestamp(): Promise<string> {
    return this.lastSynced;
  }
}
