import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AdvancedComplianceService } from './advanced-compliance.service';
import { CreateComplianceRuleDto } from './dto/create-compliance-rule.dto';
import { UpdateComplianceRuleDto } from './dto/update-compliance-rule.dto';
import { ComplianceCheckDto } from './dto/compliance-check.dto';
import { ComplianceReportDto } from './dto/compliance-report.dto';
import { ComplianceQueryDto } from './dto/compliance-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('Advanced Compliance')
@Controller('advanced-compliance')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class AdvancedComplianceController {
  constructor(private readonly advancedComplianceService: AdvancedComplianceService) {}

  @Post('rules')
  @ApiOperation({ summary: 'Create new compliance rule' })
  @ApiResponse({ status: 201, description: 'Compliance rule created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createComplianceRule(@Body() createComplianceRuleDto: CreateComplianceRuleDto) {
    return this.advancedComplianceService.createComplianceRule(createComplianceRuleDto);
  }

  @Get('rules')
  @ApiOperation({ summary: 'Get all compliance rules' })
  @ApiResponse({ status: 200, description: 'Compliance rules retrieved successfully' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'jurisdiction', required: false, description: 'Filter by jurisdiction' })
  @ApiQuery({ name: 'active', required: false, description: 'Filter by active status' })
  async getComplianceRules(@Query() query: ComplianceQueryDto) {
    return this.advancedComplianceService.getComplianceRules(query);
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Get compliance rule by ID' })
  @ApiResponse({ status: 200, description: 'Compliance rule retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Compliance rule not found' })
  @ApiParam({ name: 'id', description: 'Compliance rule ID' })
  async getComplianceRule(@Param('id') id: string) {
    return this.advancedComplianceService.getComplianceRule(id);
  }

  @Put('rules/:id')
  @ApiOperation({ summary: 'Update compliance rule' })
  @ApiResponse({ status: 200, description: 'Compliance rule updated successfully' })
  @ApiResponse({ status: 404, description: 'Compliance rule not found' })
  @ApiParam({ name: 'id', description: 'Compliance rule ID' })
  async updateComplianceRule(
    @Param('id') id: string,
    @Body() updateComplianceRuleDto: UpdateComplianceRuleDto,
  ) {
    return this.advancedComplianceService.updateComplianceRule(id, updateComplianceRuleDto);
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Delete compliance rule' })
  @ApiResponse({ status: 204, description: 'Compliance rule deleted successfully' })
  @ApiResponse({ status: 404, description: 'Compliance rule not found' })
  @ApiParam({ name: 'id', description: 'Compliance rule ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComplianceRule(@Param('id') id: string) {
    return this.advancedComplianceService.deleteComplianceRule(id);
  }

  @Post('check')
  @ApiOperation({ summary: 'Perform real-time compliance check' })
  @ApiResponse({ status: 200, description: 'Compliance check completed' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async performComplianceCheck(@Body() complianceCheckDto: ComplianceCheckDto) {
    return this.advancedComplianceService.performComplianceCheck(complianceCheckDto);
  }

  @Post('check/batch')
  @ApiOperation({ summary: 'Perform batch compliance checks' })
  @ApiResponse({ status: 200, description: 'Batch compliance checks completed' })
  async performBatchComplianceCheck(@Body() complianceChecks: ComplianceCheckDto[]) {
    return this.advancedComplianceService.performBatchComplianceCheck(complianceChecks);
  }

  @Get('monitoring/status')
  @ApiOperation({ summary: 'Get compliance monitoring status' })
  @ApiResponse({ status: 200, description: 'Monitoring status retrieved successfully' })
  async getMonitoringStatus() {
    return this.advancedComplianceService.getMonitoringStatus();
  }

  @Post('monitoring/start')
  @ApiOperation({ summary: 'Start compliance monitoring' })
  @ApiResponse({ status: 200, description: 'Monitoring started successfully' })
  async startMonitoring(@Body() config: any) {
    return this.advancedComplianceService.startMonitoring(config);
  }

  @Post('monitoring/stop')
  @ApiOperation({ summary: 'Stop compliance monitoring' })
  @ApiResponse({ status: 200, description: 'Monitoring stopped successfully' })
  async stopMonitoring() {
    return this.advancedComplianceService.stopMonitoring();
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get compliance reports' })
  @ApiResponse({ status: 200, description: 'Compliance reports retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date filter' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date filter' })
  @ApiQuery({ name: 'type', required: false, description: 'Report type filter' })
  async getComplianceReports(@Query() query: any) {
    return this.advancedComplianceService.getComplianceReports(query);
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate compliance report' })
  @ApiResponse({ status: 200, description: 'Compliance report generated successfully' })
  async generateComplianceReport(@Body() reportConfig: ComplianceReportDto) {
    return this.advancedComplianceService.generateComplianceReport(reportConfig);
  }

  @Get('risk/assessment')
  @ApiOperation({ summary: 'Get compliance risk assessment' })
  @ApiResponse({ status: 200, description: 'Risk assessment retrieved successfully' })
  async getRiskAssessment() {
    return this.advancedComplianceService.getRiskAssessment();
  }

  @Post('risk/assessment/update')
  @ApiOperation({ summary: 'Update risk assessment' })
  @ApiResponse({ status: 200, description: 'Risk assessment updated successfully' })
  async updateRiskAssessment(@Body() riskData: any) {
    return this.advancedComplianceService.updateRiskAssessment(riskData);
  }

  @Get('regulations')
  @ApiOperation({ summary: 'Get current regulations' })
  @ApiResponse({ status: 200, description: 'Regulations retrieved successfully' })
  @ApiQuery({ name: 'jurisdiction', required: false, description: 'Filter by jurisdiction' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  async getRegulations(@Query() query: any) {
    return this.advancedComplianceService.getRegulations(query);
  }

  @Post('regulations/sync')
  @ApiOperation({ summary: 'Sync regulations from legal sources' })
  @ApiResponse({ status: 200, description: 'Regulations synced successfully' })
  async syncRegulations() {
    return this.advancedComplianceService.syncRegulations();
  }

  @Get('changes')
  @ApiOperation({ summary: 'Get regulatory changes' })
  @ApiResponse({ status: 200, description: 'Regulatory changes retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date filter' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date filter' })
  async getRegulatoryChanges(@Query() query: any) {
    return this.advancedComplianceService.getRegulatoryChanges(query);
  }

  @Post('workflow/automate')
  @ApiOperation({ summary: 'Automate compliance workflow' })
  @ApiResponse({ status: 200, description: 'Workflow automation started' })
  async automateWorkflow(@Body() workflowConfig: any) {
    return this.advancedComplianceService.automateWorkflow(workflowConfig);
  }

  @Get('workflow/status')
  @ApiOperation({ summary: 'Get workflow automation status' })
  @ApiResponse({ status: 200, description: 'Workflow status retrieved successfully' })
  async getWorkflowStatus() {
    return this.advancedComplianceService.getWorkflowStatus();
  }

  @Get('audit/trail')
  @ApiOperation({ summary: 'Get compliance audit trail' })
  @ApiResponse({ status: 200, description: 'Audit trail retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date filter' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date filter' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  async getAuditTrail(@Query() query: any) {
    return this.advancedComplianceService.getAuditTrail(query);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get compliance metrics' })
  @ApiResponse({ status: 200, description: 'Compliance metrics retrieved successfully' })
  async getComplianceMetrics() {
    return this.advancedComplianceService.getComplianceMetrics();
  }

  @Post('alerts')
  @ApiOperation({ summary: 'Create compliance alert' })
  @ApiResponse({ status: 201, description: 'Compliance alert created successfully' })
  async createComplianceAlert(@Body() alertData: any) {
    return this.advancedComplianceService.createComplianceAlert(alertData);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get compliance alerts' })
  @ApiResponse({ status: 200, description: 'Compliance alerts retrieved successfully' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by severity' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  async getComplianceAlerts(@Query() query: any) {
    return this.advancedComplianceService.getComplianceAlerts(query);
  }
}
