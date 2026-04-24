import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { EnergyService } from './energy.service';
import { CreateEnergyTradeDto } from './dto/create-energy-trade.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('energy')
@ApiTags('energy')
export class EnergyController {
  constructor(private readonly energyService: EnergyService) {}

  @Get()
  @ApiOperation({ summary: 'Get all energy trades' })
  async findAll() {
    return this.energyService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get energy trade by ID' })
  async findOne(@Param('id') id: string) {
    return this.energyService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new energy trade' })
  async create(@Body() createEnergyTradeDto: CreateEnergyTradeDto) {
    return this.energyService.create(createEnergyTradeDto);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute energy trade' })
  async executeTrade(@Param('id') id: string) {
    return this.energyService.executeTrade(id);
  }

  @Get('market-price')
  @ApiOperation({ summary: 'Get current market price' })
  async getMarketPrice() {
    return this.energyService.getMarketPrice();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user energy trades' })
  async getUserTrades(@Param('userId') userId: string) {
    return this.energyService.getUserTrades(userId);
  }
}
