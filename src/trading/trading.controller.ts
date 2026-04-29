import { Controller, Post, Get, Body, Param, Delete } from '@nestjs/common';
import { TradingService } from './trading.service';
import { OrderService } from './order-management/order.service';

@Controller('trading')
export class TradingController {
  constructor(
    private readonly tradingService: TradingService,
    private readonly orderService: OrderService,
  ) {}

  @Post('orders')
  async placeOrder(@Body() orderData: any) {
    return this.orderService.createOrder(orderData);
  }

  @Get('orders/:id')
  async getOrder(@Param('id') id: string) {
    return this.orderService.getOrder(id);
  }

  @Delete('orders/:id')
  async cancelOrder(@Param('id') id: string) {
    return this.orderService.cancelOrder(id);
  }

  @Get('order-book')
  async getOrderBook() {
    return this.tradingService.getOrderBook();
  }

  @Get('trades')
  async getTrades() {
    return this.tradingService.getTrades();
  }
}