import { Injectable, Logger } from '@nestjs/common';

export interface AcademicInstitution {
  id: string;
  name: string;
  type: 'university' | 'research_institute' | 'college' | 'laboratory';
  location: {
    country: string;
    city: string;
    timezone: string;
  };
  specialization: string[];
  ranking: {
    world?: number;
    national?: number;
    subject?: Record<string, number>;
  };
  collaborationStatus: 'active' | 'pending' | 'inactive';
  partnershipLevel: 'basic' | 'research' | 'strategic' | 'comprehensive';
  contactInfo: {
    email: string;
    phone?: string;
    website: string;
    department?: string;
  };
  researchAreas: string[];
  facilities: string[];
  activeProjects: number;
  publicationsCount: number;
  partnershipSince: Date;
  lastInteraction: Date;
  metadata: Record<string, any>;
}

export interface IntegrationMetrics {
  totalInstitutions: number;
  activeInstitutions: number;
  institutionsByType: Record<string, number>;
  institutionsByCountry: Record<string, number>;
  totalProjects: number;
  totalPublications: number;
  averagePartnershipDuration: number;
  topInstitutions: Array<{
    institution: AcademicInstitution;
    score: number;
  }>;
}

@Injectable()
export class AcademicIntegrationService {
  private readonly logger = new Logger(AcademicIntegrationService.name);
  private readonly institutions = new Map<string, AcademicInstitution>();

  constructor() {
    this.initializeDefaultInstitutions();
  }

  private initializeDefaultInstitutions() {
    const defaultInstitutions: AcademicInstitution[] = [
      {
        id: 'mit',
        name: 'Massachusetts Institute of Technology',
        type: 'university',
        location: {
          country: 'US',
          city: 'Cambridge',
          timezone: 'America/New_York',
        },
        specialization: ['engineering', 'computer_science', 'physics', 'energy'],
        ranking: {
          world: 1,
          national: 1,
          subject: {
            'computer_science': 1,
            'engineering': 1,
            'physics': 2,
          },
        },
        collaborationStatus: 'active',
        partnershipLevel: 'strategic',
        contactInfo: {
          email: 'research@mit.edu',
          phone: '+1-617-253-1000',
          website: 'https://www.mit.edu',
          department: 'Energy Initiative',
        },
        researchAreas: ['artificial_intelligence', 'energy_systems', 'quantum_computing', 'materials_science'],
        facilities: ['quantum_computing_lab', 'energy_research_center', 'ai_laboratory'],
        activeProjects: 8,
        publicationsCount: 156,
        partnershipSince: new Date('2022-01-15'),
        lastInteraction: new Date(),
        metadata: {
          notableResearchers: ['Prof. John Doe', 'Dr. Jane Smith'],
          fundingAmount: 2500000,
          jointPatents: 12,
        },
      },
      {
        id: 'stanford',
        name: 'Stanford University',
        type: 'university',
        location: {
          country: 'US',
          city: 'Stanford',
          timezone: 'America/Los_Angeles',
        },
        specialization: ['computer_science', 'engineering', 'medicine', 'business'],
        ranking: {
          world: 3,
          national: 2,
          subject: {
            'computer_science': 2,
            'engineering': 3,
            'medicine': 5,
          },
        },
        collaborationStatus: 'active',
        partnershipLevel: 'research',
        contactInfo: {
          email: 'research@stanford.edu',
          website: 'https://www.stanford.edu',
          department: 'AI Laboratory',
        },
        researchAreas: ['machine_learning', 'blockchain', 'sustainable_energy', 'biomedical_engineering'],
        facilities: ['ai_lab', 'sustainable_energy_center', 'bioengineering_facility'],
        activeProjects: 5,
        publicationsCount: 98,
        partnershipSince: new Date('2022-06-01'),
        lastInteraction: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        metadata: {
          notableResearchers: ['Prof. Alan Turing', 'Dr. Grace Hopper'],
          fundingAmount: 1800000,
          jointPatents: 8,
        },
      },
      {
        id: 'oxford',
        name: 'University of Oxford',
        type: 'university',
        location: {
          country: 'UK',
          city: 'Oxford',
          timezone: 'Europe/London',
        },
        specialization: ['computer_science', 'mathematics', 'physics', 'philosophy'],
        ranking: {
          world: 2,
          national: 1,
          subject: {
            'computer_science': 5,
            'mathematics': 1,
            'physics': 3,
          },
        },
        collaborationStatus: 'pending',
        partnershipLevel: 'basic',
        contactInfo: {
          email: 'research@ox.ac.uk',
          website: 'https://www.ox.ac.uk',
          department: 'Department of Computer Science',
        },
        researchAreas: ['quantum_computing', 'formal_methods', 'energy_efficiency', 'cryptocurrency'],
        facilities: ['quantum_computing_center', 'energy_efficiency_lab'],
        activeProjects: 2,
        publicationsCount: 45,
        partnershipSince: new Date('2023-09-01'),
        lastInteraction: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        metadata: {
          notableResearchers: ['Prof. Stephen Hawking', 'Dr. Tim Berners-Lee'],
          fundingAmount: 500000,
          jointPatents: 3,
        },
      },
    ];

    defaultInstitutions.forEach(institution => {
      this.institutions.set(institution.id, institution);
    });

    this.logger.log(`Initialized ${defaultInstitutions.length} academic institutions`);
  }

  async getIntegrations(): Promise<AcademicInstitution[]> {
    return Array.from(this.institutions.values());
  }

  async addIntegration(integrationData: any): Promise<AcademicInstitution> {
    const institution: AcademicInstitution = {
      id: `institution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...integrationData,
      specialization: integrationData.specialization || [],
      ranking: integrationData.ranking || {},
      collaborationStatus: 'pending',
      partnershipLevel: 'basic',
      contactInfo: integrationData.contactInfo,
      researchAreas: integrationData.researchAreas || [],
      facilities: integrationData.facilities || [],
      activeProjects: 0,
      publicationsCount: 0,
      partnershipSince: new Date(),
      lastInteraction: new Date(),
      metadata: integrationData.metadata || {},
    };

    this.institutions.set(institution.id, institution);
    this.logger.log(`Added academic institution: ${institution.name}`);
    
    return institution;
  }

  async updateInstitution(id: string, updateData: any): Promise<AcademicInstitution> {
    const institution = this.institutions.get(id);
    if (!institution) {
      throw new Error('Academic institution not found');
    }

    const updatedInstitution = {
      ...institution,
      ...updateData,
      lastInteraction: new Date(),
    };

    this.institutions.set(id, updatedInstitution);
    this.logger.log(`Updated academic institution: ${updatedInstitution.name}`);
    
    return updatedInstitution;
  }

  async removeInstitution(id: string): Promise<void> {
    const deleted = this.institutions.delete(id);
    if (!deleted) {
      throw new Error('Academic institution not found');
    }
    this.logger.log(`Removed academic institution: ${id}`);
  }

  async getIntegrationMetrics(): Promise<IntegrationMetrics> {
    const institutions = Array.from(this.institutions.values());
    
    return {
      totalInstitutions: institutions.length,
      activeInstitutions: institutions.filter(inst => inst.collaborationStatus === 'active').length,
      institutionsByType: this.groupInstitutionsByType(institutions),
      institutionsByCountry: this.groupInstitutionsByCountry(institutions),
      totalProjects: institutions.reduce((sum, inst) => sum + inst.activeProjects, 0),
      totalPublications: institutions.reduce((sum, inst) => sum + inst.publicationsCount, 0),
      averagePartnershipDuration: this.calculateAveragePartnershipDuration(institutions),
      topInstitutions: this.getTopInstitutions(institutions),
    };
  }

  private groupInstitutionsByType(institutions: AcademicInstitution[]): Record<string, number> {
    return institutions.reduce((acc, institution) => {
      acc[institution.type] = (acc[institution.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupInstitutionsByCountry(institutions: AcademicInstitution[]): Record<string, number> {
    return institutions.reduce((acc, institution) => {
      acc[institution.location.country] = (acc[institution.location.country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateAveragePartnershipDuration(institutions: AcademicInstitution[]): number {
    if (institutions.length === 0) return 0;

    const totalDuration = institutions.reduce((sum, institution) => {
      return sum + (Date.now() - institution.partnershipSince.getTime());
    }, 0);

    return totalDuration / institutions.length / (1000 * 60 * 60 * 24 * 365); // years
  }

  private getTopInstitutions(institutions: AcademicInstitution[]): Array<{ institution: AcademicInstitution; score: number }> {
    return institutions
      .map(institution => ({
        institution,
        score: this.calculateInstitutionScore(institution),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  private calculateInstitutionScore(institution: AcademicInstitution): number {
    let score = 0;

    // Ranking score (30% weight)
    if (institution.ranking.world) {
      score += (100 - institution.ranking.world) * 0.3;
    }

    // Partnership level score (25% weight)
    const partnershipScores = {
      basic: 25,
      research: 50,
      strategic: 75,
      comprehensive: 100,
    };
    score += partnershipScores[institution.partnershipLevel] * 0.25;

    // Active projects score (20% weight)
    score += Math.min(institution.activeProjects * 10, 100) * 0.2;

    // Publications score (15% weight)
    score += Math.min(institution.publicationsCount, 100) * 0.15;

    // Collaboration status score (10% weight)
    const collaborationScores = {
      active: 100,
      pending: 50,
      inactive: 0,
    };
    score += collaborationScores[institution.collaborationStatus] * 0.1;

    return Math.round(score);
  }

  async getInstitution(id: string): Promise<AcademicInstitution | undefined> {
    return this.institutions.get(id);
  }

  async searchInstitutions(query: string): Promise<AcademicInstitution[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.institutions.values()).filter(institution =>
      institution.name.toLowerCase().includes(searchTerm) ||
      institution.specialization.some(spec => spec.toLowerCase().includes(searchTerm)) ||
      institution.researchAreas.some(area => area.toLowerCase().includes(searchTerm))
    );
  }

  async getCollaborationOpportunities(): Promise<any> {
    const institutions = Array.from(this.institutions.values());
    
    return {
      highPotentialPartners: institutions
        .filter(inst => inst.collaborationStatus === 'pending' && inst.ranking.world && inst.ranking.world <= 10)
        .map(inst => ({
          institution: inst.name,
          id: inst.id,
          potentialProjects: ['AI research', 'Energy optimization', 'Blockchain applications'],
          estimatedSuccessRate: 0.85,
        })),
      activeCollaborations: institutions
        .filter(inst => inst.collaborationStatus === 'active')
        .map(inst => ({
          institution: inst.name,
          id: inst.id,
          currentProjects: inst.activeProjects,
          partnershipLevel: inst.partnershipLevel,
          lastInteraction: inst.lastInteraction,
        })),
      recommendedActions: [
        'Follow up with Oxford University regarding pending partnership',
        'Expand collaboration with MIT to include quantum computing research',
        'Explore joint funding opportunities with Stanford University',
      ],
    };
  }
}
