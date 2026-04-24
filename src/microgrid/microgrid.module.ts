import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { MicrogridController } from './microgrid.controller';
import { MicrogridService } from './microgrid.service';
import { GridIntegrationService } from './smart-grid/grid-integration.service';
import { EnergyManagementService } from './energy/energy-management.service';
import { LoadBalancingService } from './balancing/load-balancing.service';
import { StorageManagementService } from './storage/storage-management.service';
import { GridMonitorService } from './monitoring/grid-monitor.service';
import { DERIntegrationService } from './energy/der-integration.service';
import { TradingIntegrationService } from './energy/trading-integration.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([]),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100,
    }),
  ],
  controllers: [MicrogridController],
  providers: [
    MicrogridService,
    GridIntegrationService,
    EnergyManagementService,
    LoadBalancingService,
    StorageManagementService,
    GridMonitorService,
    DERIntegrationService,
    TradingIntegrationService,
  ],
  exports: [
    MicrogridService,
    GridIntegrationService,
    EnergyManagementService,
    LoadBalancingService,
    StorageManagementService,
    GridMonitorService,
    DERIntegrationService,
    TradingIntegrationService,
  ],
})
export class MicrogridModule {}
