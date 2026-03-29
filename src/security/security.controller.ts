import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SecurityMonitorService } from './monitoring/security-monitor.service';
import { IncidentResponseService } from './response/incident-response.service';
import { SecurityEvent } from './entities/security-event.entity';

@ApiTags('Security')
@Controller('security')
export class SecurityController {
  constructor(
    private readonly securityMonitor: SecurityMonitorService,
    private readonly incidentResponse: IncidentResponseService,
  ) {}

  @Get('events')
  @ApiOperation({ summary: 'Get recent security events' })
  @ApiResponse({ status: 200, description: 'Returns recent security events' })
  async getRecentEvents(
    @Query('limit') limit: number = 50,
  ): Promise<SecurityEvent[]> {
    return this.securityMonitor.getRecentEvents(limit);
  }

  @Get('events/unresolved')
  @ApiOperation({ summary: 'Get unresolved security events' })
  @ApiResponse({
    status: 200,
    description: 'Returns unresolved security events',
  })
  async getUnresolvedEvents(): Promise<SecurityEvent[]> {
    return this.securityMonitor.getUnresolvedEvents();
  }

  @Post('events/:id/resolve')
  @ApiOperation({ summary: 'Resolve a security event' })
  @ApiResponse({ status: 200, description: 'Event resolved successfully' })
  async resolveEvent(
    @Param('id') eventId: string,
    @Body('resolvedBy') resolvedBy: string,
  ): Promise<SecurityEvent> {
    return this.securityMonitor.resolveEvent(eventId, resolvedBy);
  }

  @Post('events/:id/false-positive')
  @ApiOperation({ summary: 'Mark event as false positive' })
  @ApiResponse({ status: 200, description: 'Event marked as false positive' })
  async markAsFalsePositive(@Param('id') eventId: string): Promise<void> {
    await this.securityMonitor.markAsFalsePositive(eventId);
  }

  @Post('events/:id/true-positive')
  @ApiOperation({ summary: 'Mark event as true positive' })
  @ApiResponse({ status: 200, description: 'Event marked as true positive' })
  async markAsTruePositive(@Param('id') eventId: string): Promise<void> {
    await this.securityMonitor.markAsTruePositive(eventId);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get security metrics' })
  @ApiResponse({ status: 200, description: 'Returns security metrics' })
  async getMetrics(
    @Query('start') start: string,
    @Query('end') end: string,
  ): Promise<any> {
    return this.securityMonitor.getSecurityMetrics({
      start: new Date(start),
      end: new Date(end),
    });
  }

  @Post('incidents/create-from-event')
  @ApiOperation({ summary: 'Create incident from security event' })
  @ApiResponse({ status: 200, description: 'Incident created successfully' })
  async createIncidentFromEvent(
    @Body('eventId') eventId: string,
  ): Promise<any> {
    // In production, fetch the actual event
    const event = new SecurityEvent();
    event.id = eventId;
    return this.incidentResponse.createIncidentFromEvent(event);
  }

  @Post('monitor/transaction')
  @ApiOperation({ summary: 'Monitor a transaction for suspicious activity' })
  @ApiResponse({
    status: 200,
    description: 'Transaction monitored successfully',
  })
  async monitorTransaction(@Body() transactionData: any): Promise<void> {
    await this.securityMonitor.monitorTransaction(transactionData);
  }
}
