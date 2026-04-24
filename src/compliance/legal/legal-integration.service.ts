import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface Regulation {
  id: string;
  title: string;
  description: string;
  jurisdiction: string;
  category: string;
  type: 'law' | 'regulation' | 'guideline' | 'directive';
  status: 'active' | 'draft' | 'repealed' | 'superseded';
  effectiveDate: Date;
  lastUpdated: Date;
  source: string;
  url?: string;
  requirements: RegulationRequirement[];
  penalties: RegulationPenalty[];
  complianceFramework: string;
}

export interface RegulationRequirement {
  id: string;
  title: string;
  description: string;
  type: 'mandatory' | 'recommended' | 'optional';
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  implementation: string;
  monitoring: string;
  reporting: string;
}

export interface RegulationPenalty {
  type: 'fine' | 'imprisonment' | 'license_revocation' | 'other';
  description: string;
  minimum?: number;
  maximum?: number;
  currency?: string;
  conditions: string[];
}

export interface LegalSource {
  id: string;
  name: string;
  url: string;
  type: 'government' | 'regulatory' | 'legislative' | 'court' | 'international';
  jurisdiction: string;
  active: boolean;
  lastSync: Date;
  syncFrequency: number; // hours
  apiKey?: string;
  authentication?: Record<string, string>;
}

@Injectable()
export class LegalIntegrationService implements OnModuleInit {
  private readonly logger = new Logger(LegalIntegrationService.name);
  private readonly regulations = new Map<string, Regulation>();
  private readonly sources = new Map<string, LegalSource>();

  async onModuleInit() {
    this.logger.log('Legal Integration Service initialized');
    await this.initializeDefaultSources();
    await this.initializeDefaultRegulations();
  }

  private async initializeDefaultSources() {
    const defaultSources: LegalSource[] = [
      {
        id: 'sec_edgar',
        name: 'SEC EDGAR',
        url: 'https://www.sec.gov/edgar',
        type: 'government',
        jurisdiction: 'US',
        active: true,
        lastSync: new Date(),
        syncFrequency: 24,
      },
      {
        id: 'eu_eur_lex',
        name: 'EU EUR-Lex',
        url: 'https://eur-lex.europa.eu',
        type: 'legislative',
        jurisdiction: 'EU',
        active: true,
        lastSync: new Date(),
        syncFrequency: 24,
      },
      {
        id: 'uk_legislation',
        name: 'UK Legislation',
        url: 'https://www.legislation.gov.uk',
        type: 'legislative',
        jurisdiction: 'UK',
        active: true,
        lastSync: new Date(),
        syncFrequency: 24,
      },
      {
        id: 'fatf_gafi',
        name: 'FATF Recommendations',
        url: 'https://www.fatf-gafi.org',
        type: 'international',
        jurisdiction: 'GLOBAL',
        active: true,
        lastSync: new Date(),
        syncFrequency: 168, // weekly
      },
    ];

    defaultSources.forEach(source => {
      this.sources.set(source.id, source);
    });

    this.logger.log(`Initialized ${defaultSources.length} legal sources`);
  }

  private async initializeDefaultRegulations() {
    const defaultRegulations: Regulation[] = [
      {
        id: 'bank_secrecy_act',
        title: 'Bank Secrecy Act',
        description: 'Requires financial institutions to assist government agencies in detecting and preventing money laundering',
        jurisdiction: 'US',
        category: 'aml',
        type: 'law',
        status: 'active',
        effectiveDate: new Date('1970-10-26'),
        lastUpdated: new Date('2020-01-01'),
        source: 'SEC EDGAR',
        url: 'https://www.fincen.gov/resources/statutes-regulations/bank-secrecy-act',
        requirements: [
          {
            id: 'bsa_001',
            title: 'Currency Transaction Reporting',
            description: 'Report cash transactions over $10,000',
            type: 'mandatory',
            category: 'reporting',
            severity: 'high',
            implementation: 'Implement CTR reporting system',
            monitoring: 'Monitor all cash transactions',
            reporting: 'File CTRs with FinCEN',
          },
          {
            id: 'bsa_002',
            title: 'Suspicious Activity Reporting',
            description: 'Report suspicious transactions',
            type: 'mandatory',
            category: 'reporting',
            severity: 'critical',
            implementation: 'Implement SAR detection system',
            monitoring: 'Monitor for suspicious patterns',
            reporting: 'File SARs with FinCEN',
          },
        ],
        penalties: [
          {
            type: 'fine',
            description: 'Civil penalties for violations',
            minimum: 1000,
            maximum: 1000000,
            currency: 'USD',
            conditions: ['Willful violations', 'Negligent violations'],
          },
        ],
        complianceFramework: 'BSA/AML',
      },
      {
        id: 'gdpr',
        title: 'General Data Protection Regulation',
        description: 'Comprehensive data protection law that regulates how companies process personal data',
        jurisdiction: 'EU',
        category: 'privacy',
        type: 'regulation',
        status: 'active',
        effectiveDate: new Date('2018-05-25'),
        lastUpdated: new Date('2023-01-01'),
        source: 'EU EUR-Lex',
        url: 'https://gdpr.eu/',
        requirements: [
          {
            id: 'gdpr_001',
            title: 'Data Protection Impact Assessment',
            description: 'Conduct DPIA for high-risk processing',
            type: 'mandatory',
            category: 'assessment',
            severity: 'high',
            implementation: 'Implement DPIA process',
            monitoring: 'Review high-risk processing activities',
            reporting: 'Document DPIA results',
          },
          {
            id: 'gdpr_002',
            title: 'Breach Notification',
            description: 'Notify data breaches within 72 hours',
            type: 'mandatory',
            category: 'incident_response',
            severity: 'critical',
            implementation: 'Implement breach detection system',
            monitoring: 'Monitor for data breaches',
            reporting: 'Notify supervisory authority within 72 hours',
          },
        ],
        penalties: [
          {
            type: 'fine',
            description: 'Administrative fines',
            minimum: 10000000,
            maximum: 20000000,
            currency: 'EUR',
            conditions: ['Less severe infringements', 'More severe infringements'],
          },
        ],
        complianceFramework: 'GDPR',
      },
    ];

    defaultRegulations.forEach(regulation => {
      this.regulations.set(regulation.id, regulation);
    });

    this.logger.log(`Initialized ${defaultRegulations.length} default regulations`);
  }

  async getRegulations(query: any): Promise<Regulation[]> {
    let regulations = Array.from(this.regulations.values());

    if (query.jurisdiction) {
      regulations = regulations.filter(reg => reg.jurisdiction === query.jurisdiction);
    }

    if (query.category) {
      regulations = regulations.filter(reg => reg.category === query.category);
    }

    if (query.type) {
      regulations = regulations.filter(reg => reg.type === query.type);
    }

    if (query.status) {
      regulations = regulations.filter(reg => reg.status === query.status);
    }

    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      regulations = regulations.filter(reg => 
        reg.title.toLowerCase().includes(searchTerm) ||
        reg.description.toLowerCase().includes(searchTerm)
      );
    }

    const offset = query.offset || 0;
    const limit = query.limit || 100;

    return regulations
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
      .slice(offset, offset + limit);
  }

  async getRegulation(id: string): Promise<Regulation | undefined> {
    return this.regulations.get(id);
  }

  async syncRegulations(): Promise<any> {
    try {
      const activeSources = Array.from(this.sources.values()).filter(source => source.active);
      const syncResults = [];

      for (const source of activeSources) {
        const result = await this.syncSource(source);
        syncResults.push(result);
      }

      this.logger.log(`Regulation sync completed for ${syncResults.length} sources`);
      return {
        success: true,
        sources: syncResults,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Error syncing regulations:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  private async syncSource(source: LegalSource): Promise<any> {
    try {
      // Mock implementation - in production, this would use APIs or web scraping
      const newRegulations = await this.fetchRegulationsFromSource(source);
      
      let addedCount = 0;
      let updatedCount = 0;

      for (const regulation of newRegulations) {
        const existingRegulation = this.regulations.get(regulation.id);
        
        if (!existingRegulation) {
          this.regulations.set(regulation.id, regulation);
          addedCount++;
        } else if (existingRegulation.lastUpdated < regulation.lastUpdated) {
          this.regulations.set(regulation.id, regulation);
          updatedCount++;
        }
      }

      source.lastSync = new Date();
      this.sources.set(source.id, source);

      return {
        source: source.name,
        success: true,
        addedCount,
        updatedCount,
        totalProcessed: newRegulations.length,
      };
    } catch (error) {
      this.logger.error(`Error syncing source ${source.name}:`, error);
      return {
        source: source.name,
        success: false,
        error: error.message,
      };
    }
  }

  private async fetchRegulationsFromSource(source: LegalSource): Promise<Regulation[]> {
    // Mock implementation - return sample regulations
    if (source.jurisdiction === 'US') {
      return [
        {
          id: `reg_${source.id}_${Date.now()}`,
          title: 'Updated AML Requirements',
          description: 'New AML requirements for digital asset providers',
          jurisdiction: source.jurisdiction,
          category: 'aml',
          type: 'regulation',
          status: 'active',
          effectiveDate: new Date(),
          lastUpdated: new Date(),
          source: source.name,
          requirements: [],
          penalties: [],
          complianceFramework: 'AML',
        },
      ];
    }

    return [];
  }

  async addRegulation(regulation: Regulation): Promise<void> {
    this.regulations.set(regulation.id, regulation);
    this.logger.log(`Added regulation: ${regulation.title}`);
  }

  async updateRegulation(regulation: Regulation): Promise<void> {
    this.regulations.set(regulation.id, regulation);
    this.logger.log(`Updated regulation: ${regulation.title}`);
  }

  async removeRegulation(regulationId: string): Promise<void> {
    const deleted = this.regulations.delete(regulationId);
    if (!deleted) {
      throw new Error('Regulation not found');
    }
    this.logger.log(`Removed regulation: ${regulationId}`);
  }

  async getSources(): Promise<LegalSource[]> {
    return Array.from(this.sources.values());
  }

  async getSource(sourceId: string): Promise<LegalSource | undefined> {
    return this.sources.get(sourceId);
  }

  async addSource(source: LegalSource): Promise<void> {
    this.sources.set(source.id, source);
    this.logger.log(`Added legal source: ${source.name}`);
  }

  async updateSource(source: LegalSource): Promise<void> {
    this.sources.set(source.id, source);
    this.logger.log(`Updated legal source: ${source.name}`);
  }

  async removeSource(sourceId: string): Promise<void> {
    const deleted = this.sources.delete(sourceId);
    if (!deleted) {
      throw new Error('Source not found');
    }
    this.logger.log(`Removed legal source: ${sourceId}`);
  }

  async getComplianceRequirements(jurisdiction: string, category?: string): Promise<any> {
    const regulations = Array.from(this.regulations.values())
      .filter(reg => reg.jurisdiction === jurisdiction && reg.status === 'active')
      .filter(reg => !category || reg.category === category);

    const requirements = regulations.flatMap(reg => reg.requirements);

    return {
      jurisdiction,
      category,
      regulations: regulations.length,
      requirements: requirements.length,
      mandatoryRequirements: requirements.filter(req => req.type === 'mandatory'),
      recommendedRequirements: requirements.filter(req => req.type === 'recommended'),
      criticalRequirements: requirements.filter(req => req.severity === 'critical'),
    };
  }

  async getComplianceMatrix(): Promise<any> {
    const jurisdictions = [...new Set(Array.from(this.regulations.values()).map(reg => reg.jurisdiction))];
    const categories = [...new Set(Array.from(this.regulations.values()).map(reg => reg.category))];

    const matrix: Record<string, Record<string, number>> = {};

    jurisdictions.forEach(jurisdiction => {
      matrix[jurisdiction] = {};
      categories.forEach(category => {
        const count = Array.from(this.regulations.values())
          .filter(reg => reg.jurisdiction === jurisdiction && reg.category === category && reg.status === 'active')
          .length;
        matrix[jurisdiction][category] = count;
      });
    });

    return {
      jurisdictions,
      categories,
      matrix,
      summary: {
        totalJurisdictions: jurisdictions.length,
        totalCategories: categories.length,
        totalRegulations: this.regulations.size,
      };
    };
  }

  async getRegulationStatistics(): Promise<any> {
    const regulations = Array.from(this.regulations.values());
    const sources = Array.from(this.sources.values());

    return {
      totalRegulations: regulations.length,
      activeRegulations: regulations.filter(reg => reg.status === 'active').length,
      regulationsByJurisdiction: this.groupRegulationsByJurisdiction(regulations),
      regulationsByCategory: this.groupRegulationsByCategory(regulations),
      regulationsByType: this.groupRegulationsByType(regulations),
      activeSources: sources.filter(s => s.active).length,
      totalSources: sources.length,
      lastSyncDate: this.getLastSyncDate(sources),
      upcomingEffectiveDates: this.getUpcomingEffectiveDates(regulations),
    };
  }

  private groupRegulationsByJurisdiction(regulations: Regulation[]): Record<string, number> {
    return regulations.reduce((acc, regulation) => {
      acc[regulation.jurisdiction] = (acc[regulation.jurisdiction] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupRegulationsByCategory(regulations: Regulation[]): Record<string, number> {
    return regulations.reduce((acc, regulation) => {
      acc[regulation.category] = (acc[regulation.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupRegulationsByType(regulations: Regulation[]): Record<string, number> {
    return regulations.reduce((acc, regulation) => {
      acc[regulation.type] = (acc[regulation.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getLastSyncDate(sources: LegalSource[]): Date | null {
    const activeSources = sources.filter(s => s.active);
    if (activeSources.length === 0) return null;

    return activeSources.reduce((latest, source) => {
      return source.lastSync > latest ? source.lastSync : latest;
    }, activeSources[0].lastSync);
  }

  private getUpcomingEffectiveDates(regulations: Regulation[]): Regulation[] {
    const now = new Date();
    return regulations
      .filter(reg => reg.effectiveDate > now && reg.status === 'active')
      .sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime())
      .slice(0, 10);
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async performScheduledSync(): Promise<void> {
    try {
      await this.syncRegulations();
      this.logger.debug('Scheduled regulation sync completed');
    } catch (error) {
      this.logger.error('Error in scheduled regulation sync:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldRegulations(): Promise<void> {
    try {
      const fiveYearsAgo = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const [id, regulation] of this.regulations) {
        if (regulation.status === 'repealed' && regulation.lastUpdated < fiveYearsAgo) {
          this.regulations.delete(id);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} old repealed regulations`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up old regulations:', error);
    }
  }
}
