import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnergyController } from './energy.controller';
import { EnergyService } from './energy.service';
import { EnergyListing } from './entities/energy-listing.entity';
import { Bid } from './entities/bid.entity';
import { Trade } from './entities/trade.entity';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { APP_FILTER } from '@nestjs/core';

@Module({
  imports: [TypeOrmModule.forFeature([EnergyListing, Bid, Trade])],
  controllers: [EnergyController],
  providers: [
    EnergyService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
  exports: [EnergyService],
})
export class EnergyModule {}
