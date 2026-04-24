import { PartialType } from '@nestjs/swagger';
import { CreateMarketDataDto } from './create-market-data.dto';

export class UpdateMarketDataDto extends PartialType(CreateMarketDataDto) {}
