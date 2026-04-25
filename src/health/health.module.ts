import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { StellarHealthIndicator } from './indicators/stellar.health';
import { MemoryHealthIndicator } from './indicators/memory.health';

@Module({
  imports: [
    TypeOrmModule.forRoot(),
  ],
  controllers: [HealthController],
  providers: [
    HealthService,
    DatabaseHealthIndicator,
    StellarHealthIndicator,
    MemoryHealthIndicator,
  ],
  exports: [HealthService],
})
export class HealthModule {}
