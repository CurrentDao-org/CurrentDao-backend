import {
  IsString,
  IsNumber,
  IsObject,
  IsOptional,
  Min,
  Matches,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { IsValidPriceRange } from '../validators/setting.validator';

export class CreateMarketSettingDto {
  @IsString()
  @IsOptional()
  settingKey?: string = 'global';

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Invalid time format, use HH:mm',
  })
  marketStartTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Invalid time format, use HH:mm',
  })
  marketEndTime: string;

  @IsString()
  timezone: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minTradeAmount: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxTradeAmount: number;

  @IsObject()
  @IsValidPriceRange()
  defaultPriceRanges: Record<string, { min: number; max: number }>;

  @IsString()
  @IsOptional()
  createdBy?: string;
}

export class UpdateMarketSettingDto extends PartialType(
  CreateMarketSettingDto,
) {}
