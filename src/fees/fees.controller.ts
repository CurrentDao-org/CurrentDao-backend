/**
 * Fees Controller
 * 
 * REST API for fee calculation and management.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FeesService } from './fees.service';
import { CalculateFeeDto } from './dto/calculate-fee.dto';
import { FeeStructure } from './entities/fee-structure.entity';
import { FeeTransaction } from './entities/fee-transaction.entity';

@ApiTags('Fees')
@Controller('api/fees')
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate fee for a transaction' })
  @ApiResponse({ status: 200, description: 'Fee calculated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiBearerAuth()
  async calculateFee(@Body() dto: CalculateFeeDto) {
    return this.feesService.calculateFee(dto);
  }

  @Get('structures')
  @ApiOperation({ summary: 'Get all fee structures' })
  @ApiResponse({ status: 200, description: 'Returns all active fee structures' })
  @ApiBearerAuth()
  getAllFeeStructures(): FeeStructure[] {
    return this.feesService.getAllFeeStructures();
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get fee transaction by ID' })
  @ApiResponse({ status: 200, description: 'Returns fee transaction details' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiBearerAuth()
  getFeeTransaction(@Param('id', ParseUUIDPipe) id: string): FeeTransaction | null {
    return this.feesService.getFeeTransaction(id);
  }

  @Post('transactions/:id/status')
  @ApiOperation({ summary: 'Update fee transaction status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiBearerAuth()
  updateTransactionStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.feesService.updateTransactionStatus(id, status as any);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get fee analytics' })
  @ApiResponse({ status: 200, description: 'Returns fee analytics for the period' })
  @ApiBearerAuth()
  getFeeAnalytics(
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return this.feesService.getFeeAnalytics({ start: startDate, end: endDate });
  }
}
