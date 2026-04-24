import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, Min, Max, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderType, OrderPriority } from '../entities/order.entity';

export class CreateOrderDto {
  @IsString()
  userId: string;

  @IsString()
  symbol: string;

  @IsEnum(OrderType)
  type: OrderType;

  @IsNumber()
  @Min(0.00000001)
  @Type(() => Number)
  quantity: number;

  @IsNumber()
  @Min(0.00000001)
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsEnum(OrderPriority)
  priority?: OrderPriority = OrderPriority.MEDIUM;

  @IsOptional()
  @IsBoolean()
  isIceberg?: boolean = false;

  @ValidateIf(o => o.isIceberg === true)
  @IsNumber()
  @Min(0.00000001)
  @Type(() => Number)
  icebergVisibleQuantity?: number;

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean = false;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  expiryTime?: number;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class BulkCreateOrderDto {
  @IsString()
  userId: string;

  orders: CreateOrderDto[];
}

export class CancelOrderDto {
  @IsString()
  orderId: string;

  @IsString()
  userId: string;

  @IsOptional()
  reason?: string;
}

export class ModifyOrderDto {
  @IsString()
  orderId: string;

  @IsString()
  userId: string;

  @IsOptional()
  @IsNumber()
  @Min(0.00000001)
  @Type(() => Number)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.00000001)
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsEnum(OrderPriority)
  priority?: OrderPriority;
}
