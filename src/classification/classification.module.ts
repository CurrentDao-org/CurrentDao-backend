/**
 * Classification Module
 *
 * Module for managing energy classifications, quality ratings, and certifications.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassificationService } from './classification.service';
import { EnergyCategory } from './entities/energy-category.entity';
import { EnergyQuality } from './entities/energy-quality.entity';
import { Certification } from './entities/certification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EnergyCategory, EnergyQuality, Certification]),
  ],
  providers: [ClassificationService],
  exports: [ClassificationService, TypeOrmModule],
})
export class ClassificationModule {}
