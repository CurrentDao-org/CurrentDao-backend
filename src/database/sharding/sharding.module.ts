import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShardMetadataEntity } from './entities/shard-metadata.entity';
import { ShardRouterService } from './shard-router.service';
import { PartitioningService } from './partitioning.service';
import { RebalancingService } from './rebalancing.service';
import { ShardHealthService } from './monitoring/shard-health.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([ShardMetadataEntity]),
  ],
  providers: [
    ShardRouterService,
    PartitioningService,
    RebalancingService,
    ShardHealthService,
  ],
  exports: [ShardRouterService, PartitioningService, RebalancingService, ShardHealthService],
})
export class ShardingModule {}
