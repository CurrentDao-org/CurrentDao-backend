import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BridgeService } from './bridge.service';
import { CreateBridgeTransactionDto } from './dto/bridge.dto';

@ApiTags('Bridge')
@Controller('bridge')
export class BridgeController {
  constructor(private readonly bridgeService: BridgeService) {}

  @Post('transactions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create cross-chain bridge transaction' })
  @ApiResponse({ status: 201, description: 'Bridge transaction created' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 500, description: 'Server error' })
  async createBridgeTransaction(
    @Body(ValidationPipe) payload: CreateBridgeTransactionDto,
  ) {
    return this.bridgeService.createTransaction(payload);
  }

  @Get('transactions/:transactionId')
  @ApiOperation({ summary: 'Fetch bridge transaction by ID' })
  @ApiParam({ name: 'transactionId', description: 'Bridge transaction ID' })
  @ApiResponse({ status: 200, description: 'Bridge transaction returned' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransaction(@Param('transactionId') transactionId: string) {
    return this.bridgeService.getTransaction(transactionId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List all bridge transactions' })
  @ApiResponse({ status: 200, description: 'Bridge transactions list returned' })
  async listTransactions() {
    return this.bridgeService.listTransactions();
  }
}
