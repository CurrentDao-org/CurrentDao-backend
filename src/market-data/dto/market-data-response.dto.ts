import { ApiProperty } from '@nestjs/swagger';

export class MarketDataResponseDto {
  @ApiProperty({ description: 'Market data ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: 'Trading symbol', example: 'BTC/USD' })
  symbol: string;

  @ApiProperty({ description: 'Current price', example: 45000.50 })
  price: number;

  @ApiProperty({ description: 'Trading volume', example: 1234567.89 })
  volume?: number;

  @ApiProperty({ description: 'High price', example: 46000.00 })
  high?: number;

  @ApiProperty({ description: 'Low price', example: 44000.00 })
  low?: number;

  @ApiProperty({ description: 'Open price', example: 44500.00 })
  open?: number;

  @ApiProperty({ description: 'Close price', example: 45200.00 })
  close?: number;

  @ApiProperty({ description: 'Bid price', example: 44999.50 })
  bid?: number;

  @ApiProperty({ description: 'Ask price', example: 45001.50 })
  ask?: number;

  @ApiProperty({ description: 'Spread', example: 2.00 })
  spread?: number;

  @ApiProperty({ description: 'Data source', example: 'binance' })
  source: string;

  @ApiProperty({ description: 'Quality score', example: 95.5 })
  qualityScore: number;

  @ApiProperty({ description: 'Timestamp', example: '2024-01-01T12:00:00Z' })
  timestamp: Date;
}
