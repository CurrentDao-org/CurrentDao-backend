import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ResearchPlatformService } from './research-platform.service';
import { CreateResearchProjectDto } from './dto/create-research-project.dto';
import { UpdateResearchProjectDto } from './dto/update-research-project.dto';
import { ResearchQueryDto } from './dto/research-query.dto';
import { CollaborationDto } from './dto/collaboration.dto';
import { InnovationLabDto } from './dto/innovation-lab.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('Research Platform')
@Controller('research-platform')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class ResearchPlatformController {
  constructor(private readonly researchPlatformService: ResearchPlatformService) {}

  @Post('projects')
  @ApiOperation({ summary: 'Create new research project' })
  @ApiResponse({ status: 201, description: 'Research project created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createResearchProject(@Body() createResearchProjectDto: CreateResearchProjectDto) {
    return this.researchPlatformService.createResearchProject(createResearchProjectDto);
  }

  @Get('projects')
  @ApiOperation({ summary: 'Get all research projects' })
  @ApiResponse({ status: 200, description: 'Research projects retrieved successfully' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset results' })
  async getResearchProjects(@Query() query: ResearchQueryDto) {
    return this.researchPlatformService.getResearchProjects(query);
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'Get research project by ID' })
  @ApiResponse({ status: 200, description: 'Research project retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Research project not found' })
  @ApiParam({ name: 'id', description: 'Research project ID' })
  async getResearchProject(@Param('id') id: string) {
    return this.researchPlatformService.getResearchProject(id);
  }

  @Put('projects/:id')
  @ApiOperation({ summary: 'Update research project' })
  @ApiResponse({ status: 200, description: 'Research project updated successfully' })
  @ApiResponse({ status: 404, description: 'Research project not found' })
  @ApiParam({ name: 'id', description: 'Research project ID' })
  async updateResearchProject(
    @Param('id') id: string,
    @Body() updateResearchProjectDto: UpdateResearchProjectDto,
  ) {
    return this.researchPlatformService.updateResearchProject(id, updateResearchProjectDto);
  }

  @Delete('projects/:id')
  @ApiOperation({ summary: 'Delete research project' })
  @ApiResponse({ status: 204, description: 'Research project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Research project not found' })
  @ApiParam({ name: 'id', description: 'Research project ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteResearchProject(@Param('id') id: string) {
    return this.researchPlatformService.deleteResearchProject(id);
  }

  @Get('datasets')
  @ApiOperation({ summary: 'Get available research datasets' })
  @ApiResponse({ status: 200, description: 'Research datasets retrieved successfully' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results' })
  async getResearchDatasets(@Query() query: any) {
    return this.researchPlatformService.getResearchDatasets(query);
  }

  @Post('datasets/:id/access')
  @ApiOperation({ summary: 'Request access to research dataset' })
  @ApiResponse({ status: 200, description: 'Access request submitted successfully' })
  @ApiParam({ name: 'id', description: 'Dataset ID' })
  async requestDatasetAccess(@Param('id') id: string, @Body() requestData: any) {
    return this.researchPlatformService.requestDatasetAccess(id, requestData);
  }

  @Get('innovation-lab')
  @ApiOperation({ summary: 'Get innovation lab status and projects' })
  @ApiResponse({ status: 200, description: 'Innovation lab status retrieved successfully' })
  async getInnovationLabStatus() {
    return this.researchPlatformService.getInnovationLabStatus();
  }

  @Post('innovation-lab/prototypes')
  @ApiOperation({ summary: 'Create new prototype in innovation lab' })
  @ApiResponse({ status: 201, description: 'Prototype created successfully' })
  async createPrototype(@Body() innovationLabDto: InnovationLabDto) {
    return this.researchPlatformService.createPrototype(innovationLabDto);
  }

  @Get('innovation-lab/prototypes')
  @ApiOperation({ summary: 'Get innovation lab prototypes' })
  @ApiResponse({ status: 200, description: 'Prototypes retrieved successfully' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  async getPrototypes(@Query() query: any) {
    return this.researchPlatformService.getPrototypes(query);
  }

  @Post('collaboration/spaces')
  @ApiOperation({ summary: 'Create collaboration space' })
  @ApiResponse({ status: 201, description: 'Collaboration space created successfully' })
  async createCollaborationSpace(@Body() collaborationDto: CollaborationDto) {
    return this.researchPlatformService.createCollaborationSpace(collaborationDto);
  }

  @Get('collaboration/spaces')
  @ApiOperation({ summary: 'Get collaboration spaces' })
  @ApiResponse({ status: 200, description: 'Collaboration spaces retrieved successfully' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  async getCollaborationSpaces(@Query() query: any) {
    return this.researchPlatformService.getCollaborationSpaces(query);
  }

  @Post('collaboration/spaces/:id/join')
  @ApiOperation({ summary: 'Join collaboration space' })
  @ApiResponse({ status: 200, description: 'Joined collaboration space successfully' })
  @ApiParam({ name: 'id', description: 'Collaboration space ID' })
  async joinCollaborationSpace(@Param('id') id: string, @Body() joinData: any) {
    return this.researchPlatformService.joinCollaborationSpace(id, joinData);
  }

  @Get('experimental/features')
  @ApiOperation({ summary: 'Get experimental features' })
  @ApiResponse({ status: 200, description: 'Experimental features retrieved successfully' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  async getExperimentalFeatures(@Query() query: any) {
    return this.researchPlatformService.getExperimentalFeatures(query);
  }

  @Post('experimental/features/:id/test')
  @ApiOperation({ summary: 'Test experimental feature' })
  @ApiResponse({ status: 200, description: 'Feature test initiated successfully' })
  @ApiParam({ name: 'id', description: 'Feature ID' })
  async testExperimentalFeature(@Param('id') id: string, @Body() testData: any) {
    return this.researchPlatformService.testExperimentalFeature(id, testData);
  }

  @Get('publications')
  @ApiOperation({ summary: 'Get research publications' })
  @ApiResponse({ status: 200, description: 'Publications retrieved successfully' })
  @ApiQuery({ name: 'year', required: false, description: 'Filter by year' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'author', required: false, description: 'Filter by author' })
  async getPublications(@Query() query: any) {
    return this.researchPlatformService.getPublications(query);
  }

  @Post('publications')
  @ApiOperation({ summary: 'Create new publication' })
  @ApiResponse({ status: 201, description: 'Publication created successfully' })
  async createPublication(@Body() publicationData: any) {
    return this.researchPlatformService.createPublication(publicationData);
  }

  @Get('academic/integrations')
  @ApiOperation({ summary: 'Get academic institution integrations' })
  @ApiResponse({ status: 200, description: 'Academic integrations retrieved successfully' })
  async getAcademicIntegrations() {
    return this.researchPlatformService.getAcademicIntegrations();
  }

  @Post('academic/integrations')
  @ApiOperation({ summary: 'Add academic institution integration' })
  @ApiResponse({ status: 201, description: 'Academic integration added successfully' })
  async addAcademicIntegration(@Body() integrationData: any) {
    return this.researchPlatformService.addAcademicIntegration(integrationData);
  }

  @Get('innovation-tracking/metrics')
  @ApiOperation({ summary: 'Get innovation tracking metrics' })
  @ApiResponse({ status: 200, description: 'Innovation metrics retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, description: 'Time period' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  async getInnovationMetrics(@Query() query: any) {
    return this.researchPlatformService.getInnovationMetrics(query);
  }

  @Get('management/analytics')
  @ApiOperation({ summary: 'Get research platform analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date' })
  async getAnalytics(@Query() query: any) {
    return this.researchPlatformService.getAnalytics(query);
  }

  @Get('data/management')
  @ApiOperation({ summary: 'Get data management overview' })
  @ApiResponse({ status: 200, description: 'Data management overview retrieved successfully' })
  async getDataManagementOverview() {
    return this.researchPlatformService.getDataManagementOverview();
  }

  @Post('data/management/cleanup')
  @ApiOperation({ summary: 'Initiate data cleanup' })
  @ApiResponse({ status: 200, description: 'Data cleanup initiated successfully' })
  async initDataCleanup(@Body() cleanupConfig: any) {
    return this.researchPlatformService.initDataCleanup(cleanupConfig);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get research platform status' })
  @ApiResponse({ status: 200, description: 'Platform status retrieved successfully' })
  async getPlatformStatus() {
    return this.researchPlatformService.getPlatformStatus();
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get research platform statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getPlatformStatistics() {
    return this.researchPlatformService.getPlatformStatistics();
  }
}
