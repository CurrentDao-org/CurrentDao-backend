import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateResearchProjectDto } from './dto/create-research-project.dto';
import { UpdateResearchProjectDto } from './dto/update-research-project.dto';
import { ResearchQueryDto } from './dto/research-query.dto';
import { CollaborationDto } from './dto/collaboration.dto';
import { InnovationLabDto } from './dto/innovation-lab.dto';
import { ResearchDataService } from './data/research-data.service';
import { InnovationLabService } from './innovation/innovation-lab.service';
import { CollaborationPlatformService } from './collaboration/collaboration-platform.service';
import { ExperimentalApiService } from './experimental/experimental-api.service';
import { ResearchManagementService } from './management/research-management.service';
import { InnovationTrackerService } from './innovation-tracking/innovation-tracker.service';
import { AcademicIntegrationService } from './academic/academic-integration.service';

export interface ResearchProject {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  leadResearcher: string;
  teamMembers: string[];
  objectives: string[];
  expectedOutcomes: string[];
  budget?: number;
  startDate?: Date;
  expectedCompletionDate?: Date;
  requiredDatasets: string[];
  requiredEquipment: string[];
  collaborationPartners: string[];
  fundingSources: string[];
  riskAssessment?: string;
  successMetrics: string[];
  tags: string[];
  confidentialityLevel?: string;
  publicationRights?: boolean;
  intellectualPropertyOwnership?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResearchDataset {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  size: string;
  format: string;
  source: string;
  accessLevel: string;
  license: string;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollaborationSpace {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  leadOrganization: string;
  partnerOrganizations: string[];
  leadResearcher?: string;
  teamMembers: string[];
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  objectives: string[];
  expectedOutcomes: string[];
  collaborationAgreement?: string;
  dataSharingTerms?: string;
  intellectualPropertyTerms?: string;
  publicationRights?: string;
  confidentialityLevel?: string;
  meetingSchedule?: string;
  communicationChannels: string[];
  milestones: string[];
  riskAssessment?: string;
  successMetrics: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InnovationPrototype {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  category: string;
  leadResearcher: string;
  teamMembers: string[];
  hypothesis?: string;
  technicalApproach?: string;
  requiredResources: string[];
  budget?: number;
  startDate?: Date;
  expectedCompletionDate?: Date;
  successCriteria: string[];
  testingMethodology?: string;
  validationApproach?: string;
  potentialApplications: string[];
  marketPotential?: string;
  competitiveAdvantage?: string;
  riskFactors: string[];
  mitigationStrategies: string[];
  intellectualPropertyStrategy?: string;
  commercializationPlan?: string;
  milestones: string[];
  keyPerformanceIndicators: string[];
  stakeholders: string[];
  confidentialityLevel?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ResearchPlatformService implements OnModuleInit {
  private readonly logger = new Logger(ResearchPlatformService.name);
  private readonly researchProjects = new Map<string, ResearchProject>();
  private readonly researchDatasets = new Map<string, ResearchDataset>();
  private readonly collaborationSpaces = new Map<string, CollaborationSpace>();
  private readonly innovationPrototypes = new Map<string, InnovationPrototype>();

  constructor(
    private readonly researchDataService: ResearchDataService,
    private readonly innovationLabService: InnovationLabService,
    private readonly collaborationPlatformService: CollaborationPlatformService,
    private readonly experimentalApiService: ExperimentalApiService,
    private readonly researchManagementService: ResearchManagementService,
    private readonly innovationTrackerService: InnovationTrackerService,
    private readonly academicIntegrationService: AcademicIntegrationService,
  ) {}

  async onModuleInit() {
    this.logger.log('Research Platform Service initialized');
    await this.initializeDefaultDatasets();
  }

  private async initializeDefaultDatasets() {
    const defaultDatasets: ResearchDataset[] = [
      {
        id: 'energy_prices_historical',
        name: 'Historical Energy Prices',
        description: 'Comprehensive historical energy price data across multiple markets',
        category: 'energy',
        type: 'time_series',
        size: '500GB',
        format: 'parquet',
        source: 'market_data_aggregation',
        accessLevel: 'restricted',
        license: 'research_only',
        tags: ['energy', 'prices', 'historical', 'market'],
        metadata: {
          dateRange: '2010-2024',
          markets: ['US', 'EU', 'Asia'],
          frequency: 'hourly',
          quality: 'high',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'weather_patterns',
        name: 'Global Weather Patterns',
        description: 'Global weather data for energy consumption correlation studies',
        category: 'environmental',
        type: 'meteorological',
        size: '1TB',
        format: 'netcdf',
        source: 'noaa',
        accessLevel: 'open',
        license: 'public_domain',
        tags: ['weather', 'climate', 'environmental', 'energy'],
        metadata: {
          dateRange: '2000-2024',
          coverage: 'global',
          resolution: '1km',
          variables: ['temperature', 'humidity', 'wind_speed', 'solar_irradiance'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'trading_volumes',
        name: 'Energy Trading Volumes',
        description: 'Detailed trading volume data for energy commodities',
        category: 'trading',
        type: 'transactional',
        size: '200GB',
        format: 'csv',
        source: 'exchange_data',
        accessLevel: 'restricted',
        license: 'confidential',
        tags: ['trading', 'volumes', 'commodities', 'energy'],
        metadata: {
          dateRange: '2015-2024',
          exchanges: ['NYMEX', 'ICE', 'EEX'],
          commodities: ['crude_oil', 'natural_gas', 'electricity'],
          granularity: 'trade_level',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    defaultDatasets.forEach(dataset => {
      this.researchDatasets.set(dataset.id, dataset);
    });

    this.logger.log(`Initialized ${defaultDatasets.length} default research datasets`);
  }

  async createResearchProject(createResearchProjectDto: CreateResearchProjectDto): Promise<ResearchProject> {
    try {
      const project: ResearchProject = {
        id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...createResearchProjectDto,
        teamMembers: createResearchProjectDto.teamMembers || [],
        objectives: createResearchProjectDto.objectives || [],
        expectedOutcomes: createResearchProjectDto.expectedOutcomes || [],
        requiredDatasets: createResearchProjectDto.requiredDatasets || [],
        requiredEquipment: createResearchProjectDto.requiredEquipment || [],
        collaborationPartners: createResearchProjectDto.collaborationPartners || [],
        fundingSources: createResearchProjectDto.fundingSources || [],
        successMetrics: createResearchProjectDto.successMetrics || [],
        tags: createResearchProjectDto.tags || [],
        startDate: createResearchProjectDto.startDate ? new Date(createResearchProjectDto.startDate) : undefined,
        expectedCompletionDate: createResearchProjectDto.expectedCompletionDate ? new Date(createResearchProjectDto.expectedCompletionDate) : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.researchProjects.set(project.id, project);
      
      this.logger.log(`Created research project: ${project.title}`);
      return project;
    } catch (error) {
      this.logger.error('Error creating research project:', error);
      throw error;
    }
  }

  async getResearchProjects(query: ResearchQueryDto): Promise<ResearchProject[]> {
    try {
      let projects = Array.from(this.researchProjects.values());

      // Apply filters
      if (query.status) {
        projects = projects.filter(project => project.status === query.status);
      }

      if (query.category) {
        projects = projects.filter(project => project.category === query.category);
      }

      if (query.priority) {
        projects = projects.filter(project => project.priority === query.priority);
      }

      if (query.leadResearcher) {
        projects = projects.filter(project => project.leadResearcher === query.leadResearcher);
      }

      if (query.tags && query.tags.length > 0) {
        projects = projects.filter(project => 
          query.tags!.some(tag => project.tags.includes(tag))
        );
      }

      if (query.search) {
        const searchTerm = query.search.toLowerCase();
        projects = projects.filter(project => 
          project.title.toLowerCase().includes(searchTerm) ||
          project.description.toLowerCase().includes(searchTerm)
        );
      }

      if (query.startDate && query.endDate) {
        const startDate = new Date(query.startDate);
        const endDate = new Date(query.endDate);
        projects = projects.filter(project => 
          project.startDate && project.startDate >= startDate && project.startDate <= endDate
        );
      }

      // Apply sorting
      if (query.sortBy) {
        projects.sort((a, b) => {
          const aValue = a[query.sortBy as keyof ResearchProject];
          const bValue = b[query.sortBy as keyof ResearchProject];
          
          if (query.sortOrder === 'desc') {
            return bValue > aValue ? 1 : -1;
          }
          return aValue > bValue ? 1 : -1;
        });
      }

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || 100;
      
      return projects.slice(offset, offset + limit);
    } catch (error) {
      this.logger.error('Error fetching research projects:', error);
      throw error;
    }
  }

  async getResearchProject(id: string): Promise<ResearchProject> {
    const project = this.researchProjects.get(id);
    if (!project) {
      throw new Error('Research project not found');
    }
    return project;
  }

  async updateResearchProject(id: string, updateResearchProjectDto: UpdateResearchProjectDto): Promise<ResearchProject> {
    try {
      const project = this.researchProjects.get(id);
      if (!project) {
        throw new Error('Research project not found');
      }

      const updatedProject = {
        ...project,
        ...updateResearchProjectDto,
        updatedAt: new Date(),
      };

      this.researchProjects.set(id, updatedProject);
      
      this.logger.log(`Updated research project: ${updatedProject.title}`);
      return updatedProject;
    } catch (error) {
      this.logger.error('Error updating research project:', error);
      throw error;
    }
  }

  async deleteResearchProject(id: string): Promise<void> {
    try {
      const project = this.researchProjects.get(id);
      if (!project) {
        throw new Error('Research project not found');
      }

      this.researchProjects.delete(id);
      
      this.logger.log(`Deleted research project: ${project.title}`);
    } catch (error) {
      this.logger.error('Error deleting research project:', error);
      throw error;
    }
  }

  async getResearchDatasets(query: any): Promise<ResearchDataset[]> {
    try {
      let datasets = Array.from(this.researchDatasets.values());

      if (query.category) {
        datasets = datasets.filter(dataset => dataset.category === query.category);
      }

      if (query.type) {
        datasets = datasets.filter(dataset => dataset.type === query.type);
      }

      if (query.accessLevel) {
        datasets = datasets.filter(dataset => dataset.accessLevel === query.accessLevel);
      }

      if (query.tags && query.tags.length > 0) {
        datasets = datasets.filter(dataset => 
          query.tags!.some(tag => dataset.tags.includes(tag))
        );
      }

      const offset = query.offset || 0;
      const limit = query.limit || 100;

      return datasets
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(offset, offset + limit);
    } catch (error) {
      this.logger.error('Error fetching research datasets:', error);
      throw error;
    }
  }

  async requestDatasetAccess(id: string, requestData: any): Promise<any> {
    try {
      const dataset = this.researchDatasets.get(id);
      if (!dataset) {
        throw new Error('Dataset not found');
      }

      // Mock implementation - in production, this would create an access request
      return {
        datasetId: id,
        requestId: `request_${Date.now()}`,
        status: 'pending',
        requestedBy: requestData.userId,
        requestedAt: new Date(),
        estimatedApprovalTime: '3-5 business days',
      };
    } catch (error) {
      this.logger.error('Error requesting dataset access:', error);
      throw error;
    }
  }

  async getInnovationLabStatus(): Promise<any> {
    return this.innovationLabService.getStatus();
  }

  async createPrototype(innovationLabDto: InnovationLabDto): Promise<InnovationPrototype> {
    try {
      const prototype: InnovationPrototype = {
        id: `prototype_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...innovationLabDto,
        teamMembers: innovationLabDto.teamMembers || [],
        requiredResources: innovationLabDto.requiredResources || [],
        potentialApplications: innovationLabDto.potentialApplications || [],
        riskFactors: innovationLabDto.riskFactors || [],
        mitigationStrategies: innovationLabDto.mitigationStrategies || [],
        milestones: innovationLabDto.milestones || [],
        keyPerformanceIndicators: innovationLabDto.keyPerformanceIndicators || [],
        stakeholders: innovationLabDto.stakeholders || [],
        startDate: innovationLabDto.startDate ? new Date(innovationLabDto.startDate) : undefined,
        expectedCompletionDate: innovationLabDto.expectedCompletionDate ? new Date(innovationLabDto.expectedCompletionDate) : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.innovationPrototypes.set(prototype.id, prototype);
      
      this.logger.log(`Created innovation prototype: ${prototype.title}`);
      return prototype;
    } catch (error) {
      this.logger.error('Error creating prototype:', error);
      throw error;
    }
  }

  async getPrototypes(query: any): Promise<InnovationPrototype[]> {
    try {
      let prototypes = Array.from(this.innovationPrototypes.values());

      if (query.status) {
        prototypes = prototypes.filter(prototype => prototype.status === query.status);
      }

      if (query.category) {
        prototypes = prototypes.filter(prototype => prototype.category === query.category);
      }

      if (query.type) {
        prototypes = prototypes.filter(prototype => prototype.type === query.type);
      }

      if (query.leadResearcher) {
        prototypes = prototypes.filter(prototype => prototype.leadResearcher === query.leadResearcher);
      }

      const offset = query.offset || 0;
      const limit = query.limit || 100;

      return prototypes
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(offset, offset + limit);
    } catch (error) {
      this.logger.error('Error fetching prototypes:', error);
      throw error;
    }
  }

  async createCollaborationSpace(collaborationDto: CollaborationDto): Promise<CollaborationSpace> {
    try {
      const collaboration: CollaborationSpace = {
        id: `collaboration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...collaborationDto,
        teamMembers: collaborationDto.teamMembers || [],
        objectives: collaborationDto.objectives || [],
        expectedOutcomes: collaborationDto.expectedOutcomes || [],
        communicationChannels: collaborationDto.communicationChannels || [],
        milestones: collaborationDto.milestones || [],
        successMetrics: collaborationDto.successMetrics || [],
        startDate: collaborationDto.startDate ? new Date(collaborationDto.startDate) : undefined,
        endDate: collaborationDto.endDate ? new Date(collaborationDto.endDate) : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.collaborationSpaces.set(collaboration.id, collaboration);
      
      this.logger.log(`Created collaboration space: ${collaboration.title}`);
      return collaboration;
    } catch (error) {
      this.logger.error('Error creating collaboration space:', error);
      throw error;
    }
  }

  async getCollaborationSpaces(query: any): Promise<CollaborationSpace[]> {
    try {
      let collaborations = Array.from(this.collaborationSpaces.values());

      if (query.type) {
        collaborations = collaborations.filter(collab => collab.type === query.type);
      }

      if (query.status) {
        collaborations = collaborations.filter(collab => collab.status === query.status);
      }

      if (query.leadOrganization) {
        collaborations = collaborations.filter(collab => collab.leadOrganization === query.leadOrganization);
      }

      const offset = query.offset || 0;
      const limit = query.limit || 100;

      return collaborations
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(offset, offset + limit);
    } catch (error) {
      this.logger.error('Error fetching collaboration spaces:', error);
      throw error;
    }
  }

  async joinCollaborationSpace(id: string, joinData: any): Promise<any> {
    try {
      const collaboration = this.collaborationSpaces.get(id);
      if (!collaboration) {
        throw new Error('Collaboration space not found');
      }

      // Mock implementation - in production, this would handle joining logic
      return {
        collaborationId: id,
        userId: joinData.userId,
        status: 'pending_approval',
        requestedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Error joining collaboration space:', error);
      throw error;
    }
  }

  async getExperimentalFeatures(query: any): Promise<any> {
    return this.experimentalApiService.getFeatures(query);
  }

  async testExperimentalFeature(id: string, testData: any): Promise<any> {
    return this.experimentalApiService.testFeature(id, testData);
  }

  async getPublications(query: any): Promise<any> {
    return this.researchManagementService.getPublications(query);
  }

  async createPublication(publicationData: any): Promise<any> {
    return this.researchManagementService.createPublication(publicationData);
  }

  async getAcademicIntegrations(): Promise<any> {
    return this.academicIntegrationService.getIntegrations();
  }

  async addAcademicIntegration(integrationData: any): Promise<any> {
    return this.academicIntegrationService.addIntegration(integrationData);
  }

  async getInnovationMetrics(query: any): Promise<any> {
    return this.innovationTrackerService.getMetrics(query);
  }

  async getAnalytics(query: any): Promise<any> {
    return this.researchManagementService.getAnalytics(query);
  }

  async getDataManagementOverview(): Promise<any> {
    return this.researchDataService.getOverview();
  }

  async initDataCleanup(cleanupConfig: any): Promise<any> {
    return this.researchDataService.initCleanup(cleanupConfig);
  }

  async getPlatformStatus(): Promise<any> {
    return {
      status: 'operational',
      projects: this.researchProjects.size,
      datasets: this.researchDatasets.size,
      collaborations: this.collaborationSpaces.size,
      prototypes: this.innovationPrototypes.size,
      uptime: '99.9%',
      lastUpdated: new Date(),
    };
  }

  async getPlatformStatistics(): Promise<any> {
    const projects = Array.from(this.researchProjects.values());
    const datasets = Array.from(this.researchDatasets.values());
    const collaborations = Array.from(this.collaborationSpaces.values());
    const prototypes = Array.from(this.innovationPrototypes.values());

    return {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'active').length,
      projectsByCategory: this.groupProjectsByCategory(projects),
      totalDatasets: datasets.length,
      datasetsByCategory: this.groupDatasetsByCategory(datasets),
      totalCollaborations: collaborations.length,
      activeCollaborations: collaborations.filter(c => c.status === 'active').length,
      totalPrototypes: prototypes.length,
      prototypesByStatus: this.groupPrototypesByStatus(prototypes),
      averageProjectDuration: this.calculateAverageProjectDuration(projects),
      successRate: this.calculateSuccessRate(projects),
    };
  }

  private groupProjectsByCategory(projects: ResearchProject[]): Record<string, number> {
    return projects.reduce((acc, project) => {
      acc[project.category] = (acc[project.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupDatasetsByCategory(datasets: ResearchDataset[]): Record<string, number> {
    return datasets.reduce((acc, dataset) => {
      acc[dataset.category] = (acc[dataset.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupPrototypesByStatus(prototypes: InnovationPrototype[]): Record<string, number> {
    return prototypes.reduce((acc, prototype) => {
      acc[prototype.status] = (acc[prototype.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateAverageProjectDuration(projects: ResearchProject[]): number {
    const completedProjects = projects.filter(p => p.status === 'completed' && p.startDate && p.expectedCompletionDate);
    if (completedProjects.length === 0) return 0;

    const totalDuration = completedProjects.reduce((sum, project) => {
      return sum + (project.expectedCompletionDate!.getTime() - project.startDate!.getTime());
    }, 0);

    return totalDuration / completedProjects.length / (1000 * 60 * 60 * 24); // days
  }

  private calculateSuccessRate(projects: ResearchProject[]): number {
    const completedProjects = projects.filter(p => p.status === 'completed');
    if (projects.length === 0) return 0;

    return (completedProjects.length / projects.length) * 100;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async performScheduledMaintenance(): Promise<void> {
    try {
      // Clean up old data
      await this.cleanupOldData();
      
      // Update statistics
      await this.updateStatistics();
      
      this.logger.debug('Scheduled maintenance completed');
    } catch (error) {
      this.logger.error('Error in scheduled maintenance:', error);
    }
  }

  private async cleanupOldData(): Promise<void> {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    
    // Clean up old completed projects
    for (const [id, project] of this.researchProjects) {
      if (project.status === 'completed' && project.updatedAt < oneYearAgo) {
        this.researchProjects.delete(id);
      }
    }
  }

  private async updateStatistics(): Promise<void> {
    // This would typically update a statistics cache or database
    this.logger.debug('Statistics updated');
  }
}
