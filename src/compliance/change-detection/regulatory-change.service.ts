import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface RegulatoryChange {
  id: string;
  title: string;
  description: string;
  jurisdiction: string;
  category: string;
  type: 'new' | 'updated' | 'repealed';
  effectiveDate: Date;
  announcedDate: Date;
  source: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'reviewed' | 'implemented' | 'ignored';
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegulatorySource {
  id: string;
  name: string;
  url: string;
  type: 'government' | 'regulatory' | 'industry' | 'legal';
  jurisdiction: string;
  active: boolean;
  lastSync: Date;
  syncFrequency: number; // hours
}

@Injectable()
export class RegulatoryChangeService implements OnModuleInit {
  private readonly logger = new Logger(RegulatoryChangeService.name);
  private readonly changes = new Map<string, RegulatoryChange>();
  private readonly sources = new Map<string, RegulatorySource>();
  private monitoringActive = false;

  async onModuleInit() {
    this.logger.log('Regulatory Change Service initialized');
    await this.initializeDefaultSources();
  }

  private async initializeDefaultSources() {
    const defaultSources: RegulatorySource[] = [
      {
        id: 'sec_gov',
        name: 'SEC Government',
        url: 'https://www.sec.gov',
        type: 'government',
        jurisdiction: 'US',
        active: true,
        lastSync: new Date(),
        syncFrequency: 24,
      },
      {
        id: 'fca_uk',
        name: 'FCA UK',
        url: 'https://www.fca.org.uk',
        type: 'regulatory',
        jurisdiction: 'UK',
        active: true,
        lastSync: new Date(),
        syncFrequency: 12,
      },
      {
        id: 'esma_eu',
        name: 'ESMA EU',
        url: 'https://www.esma.europa.eu',
        type: 'regulatory',
        jurisdiction: 'EU',
        active: true,
        lastSync: new Date(),
        syncFrequency: 24,
      },
    ];

    defaultSources.forEach(source => {
      this.sources.set(source.id, source);
    });

    this.logger.log(`Initialized ${defaultSources.length} regulatory sources`);
  }

  async startMonitoring(): Promise<void> {
    this.monitoringActive = true;
    this.logger.log('Regulatory change monitoring started');
  }

  async stopMonitoring(): Promise<void> {
    this.monitoringActive = false;
    this.logger.log('Regulatory change monitoring stopped');
  }

  async checkForChanges(): Promise<void> {
    if (!this.monitoringActive) return;

    try {
      const activeSources = Array.from(this.sources.values()).filter(source => source.active);
      
      for (const source of activeSources) {
        await this.syncSource(source);
      }

      this.logger.debug('Regulatory change check completed');
    } catch (error) {
      this.logger.error('Error checking for regulatory changes:', error);
    }
  }

  private async syncSource(source: RegulatorySource): Promise<void> {
    try {
      // Mock implementation - in production, this would scrape or use APIs
      const newChanges = await this.fetchChangesFromSource(source);
      
      for (const change of newChanges) {
        const existingChange = this.findExistingChange(change);
        
        if (!existingChange) {
          this.changes.set(change.id, change);
          this.logger.info(`New regulatory change detected: ${change.title}`);
        }
      }

      source.lastSync = new Date();
      this.sources.set(source.id, source);
    } catch (error) {
      this.logger.error(`Error syncing source ${source.name}:`, error);
    }
  }

  private async fetchChangesFromSource(source: RegulatorySource): Promise<RegulatoryChange[]> {
    // Mock implementation - return sample changes
    return [
      {
        id: `change_${source.id}_${Date.now()}`,
        title: 'Updated AML Requirements',
        description: 'New anti-money laundering requirements for digital assets',
        jurisdiction: source.jurisdiction,
        category: 'aml',
        type: 'updated',
        effectiveDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        announcedDate: new Date(),
        source: source.name,
        impact: 'high',
        status: 'pending',
        metadata: { sourceId: source.id },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  private findExistingChange(newChange: RegulatoryChange): RegulatoryChange | undefined {
    return Array.from(this.changes.values()).find(change => 
      change.title === newChange.title && 
      change.jurisdiction === newChange.jurisdiction &&
      change.category === newChange.category
    );
  }

  async getChanges(query: any): Promise<RegulatoryChange[]> {
    let changes = Array.from(this.changes.values());

    if (query.jurisdiction) {
      changes = changes.filter(change => change.jurisdiction === query.jurisdiction);
    }

    if (query.category) {
      changes = changes.filter(change => change.category === query.category);
    }

    if (query.type) {
      changes = changes.filter(change => change.type === query.type);
    }

    if (query.impact) {
      changes = changes.filter(change => change.impact === query.impact);
    }

    if (query.status) {
      changes = changes.filter(change => change.status === query.status);
    }

    if (query.startDate && query.endDate) {
      const startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);
      changes = changes.filter(change => 
        change.announcedDate >= startDate && change.announcedDate <= endDate
      );
    }

    const offset = query.offset || 0;
    const limit = query.limit || 100;

    return changes
      .sort((a, b) => b.announcedDate.getTime() - a.announcedDate.getTime())
      .slice(offset, offset + limit);
  }

  async getChange(id: string): Promise<RegulatoryChange | undefined> {
    return this.changes.get(id);
  }

  async updateChangeStatus(id: string, status: string): Promise<void> {
    const change = this.changes.get(id);
    if (!change) {
      throw new Error('Regulatory change not found');
    }

    change.status = status as any;
    change.updatedAt = new Date();
    
    this.changes.set(id, change);
    this.logger.log(`Updated regulatory change status: ${id} -> ${status}`);
  }

  async addSource(source: RegulatorySource): Promise<void> {
    this.sources.set(source.id, source);
    this.logger.log(`Added regulatory source: ${source.name}`);
  }

  async removeSource(sourceId: string): Promise<void> {
    const deleted = this.sources.delete(sourceId);
    if (!deleted) {
      throw new Error('Source not found');
    }
    this.logger.log(`Removed regulatory source: ${sourceId}`);
  }

  async getSources(): Promise<RegulatorySource[]> {
    return Array.from(this.sources.values());
  }

  async getSource(sourceId: string): Promise<RegulatorySource | undefined> {
    return this.sources.get(sourceId);
  }

  async getChangeStatistics(): Promise<any> {
    const changes = Array.from(this.changes.values());
    const sources = Array.from(this.sources.values());

    return {
      totalChanges: changes.length,
      changesByJurisdiction: this.groupChangesByJurisdiction(changes),
      changesByCategory: this.groupChangesByCategory(changes),
      changesByImpact: this.groupChangesByImpact(changes),
      changesByStatus: this.groupChangesByStatus(changes),
      activeSources: sources.filter(s => s.active).length,
      totalSources: sources.length,
      lastSyncDate: this.getLastSyncDate(sources),
      upcomingChanges: changes.filter(c => c.effectiveDate > new Date()).length,
    };
  }

  private groupChangesByJurisdiction(changes: RegulatoryChange[]): Record<string, number> {
    return changes.reduce((acc, change) => {
      acc[change.jurisdiction] = (acc[change.jurisdiction] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupChangesByCategory(changes: RegulatoryChange[]): Record<string, number> {
    return changes.reduce((acc, change) => {
      acc[change.category] = (acc[change.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupChangesByImpact(changes: RegulatoryChange[]): Record<string, number> {
    return changes.reduce((acc, change) => {
      acc[change.impact] = (acc[change.impact] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupChangesByStatus(changes: RegulatoryChange[]): Record<string, number> {
    return changes.reduce((acc, change) => {
      acc[change.status] = (acc[change.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getLastSyncDate(sources: RegulatorySource[]): Date | null {
    const activeSources = sources.filter(s => s.active);
    if (activeSources.length === 0) return null;

    return activeSources.reduce((latest, source) => {
      return source.lastSync > latest ? source.lastSync : latest;
    }, activeSources[0].lastSync);
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async performScheduledSync(): Promise<void> {
    await this.checkForChanges();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldChanges(): Promise<void> {
    try {
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const [id, change] of this.changes) {
        if (change.announcedDate < oneYearAgo && change.status === 'implemented') {
          this.changes.delete(id);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} old regulatory changes`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up old changes:', error);
    }
  }
}
