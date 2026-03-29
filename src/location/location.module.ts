import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationService } from './location.service';
import { Location } from './entities/location.entity';
import { GridZone } from './entities/grid-zone.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Location, GridZone])],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
