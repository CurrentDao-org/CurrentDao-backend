import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  SettlementRequestDto,
  SettlementResponseDto,
  NettingRequestDto,
  MarginCallDto,
  SettlementStatusDto,
} from './dto/settlement.dto';

@ApiTags('settlement')
@Controller('settlement')
export class SettlementController {
  private readonly logger = new Logger(SettlementController.name);

  constructor(private readonly settlementService: SettlementService) {}

  @Post('initiate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate multi-party settlement' })
  @ApiResponse({ status: 200, description: 'Settlement initiated successfully' })
  async initiateSettlement(
    @Body() settlementRequest: SettlementRequestDto,
  ): Promise<SettlementResponseDto> {
    this.logger.log(`Initiating settlement for ${settlementRequest.parties.length} parties`);
    return this.settlementService.initiateSettlement(settlementRequest);
  }

  @Post('netting')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perform netting for settlement optimization' })
  @ApiResponse({ status: 200, description: 'Netting completed successfully' })
  async performNetting(
    @Body() nettingRequest: NettingRequestDto,
  ): Promise<SettlementResponseDto> {
    this.logger.log(`Performing netting for ${nettingRequest.transactions.length} transactions`);
    return this.settlementService.performNetting(nettingRequest);
  }

  @Get('status/:settlementId')
  @ApiOperation({ summary: 'Get settlement status' })
  @ApiResponse({ status: 200, description: 'Settlement status retrieved successfully' })
  async getSettlementStatus(
    @Param('settlementId') settlementId: string,
  ): Promise<SettlementStatusDto> {
    return this.settlementService.getSettlementStatus(settlementId);
  }

  @Get('monitoring')
  @ApiOperation({ summary: 'Get real-time settlement monitoring data' })
  @ApiResponse({ status: 200, description: 'Monitoring data retrieved successfully' })
  async getMonitoringData(
    @Query('timeRange') timeRange?: string,
  ): Promise<any> {
    return this.settlementService.getMonitoringData(timeRange);
  }

  @Post('margin-call')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Issue margin call' })
  @ApiResponse({ status: 200, description: 'Margin call issued successfully' })
  async issueMarginCall(
    @Body() marginCall: MarginCallDto,
  ): Promise<any> {
    this.logger.log(`Issuing margin call for party ${marginCall.partyId}`);
    return this.settlementService.issueMarginCall(marginCall);
  }

  @Get('risk-assessment/:partyId')
  @ApiOperation({ summary: 'Get party risk assessment' })
  @ApiResponse({ status: 200, description: 'Risk assessment retrieved successfully' })
  async getRiskAssessment(
    @Param('partyId') partyId: string,
  ): Promise<any> {
    return this.settlementService.getRiskAssessment(partyId);
  }

  @Get('settlements')
  @ApiOperation({ summary: 'Get all settlements with pagination' })
  @ApiResponse({ status: 200, description: 'Settlements retrieved successfully' })
  async getSettlements(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
  ): Promise<any> {
    return this.settlementService.getSettlements(page, limit, status);
  }

  @Post('optimize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Optimize settlement algorithms' })
  @ApiResponse({ status: 200, description: 'Settlement optimized successfully' })
  async optimizeSettlement(
    @Body() optimizationRequest: any,
  ): Promise<any> {
    this.logger.log('Optimizing settlement algorithms');
    return this.settlementService.optimizeSettlement(optimizationRequest);
  }
}
