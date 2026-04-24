import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { GasUsage } from './entities/gas-usage.entity';
import { GasEstimatorService } from './gas-estimator.service';
import { FeePredictionAlgorithm } from './algorithms/fee-prediction.algorithm';
import { BatchingService } from './batching/batching.service';
import { GasOptimizerService } from './optimizer/gas-optimizer.service';
import { SorobanClientService } from '../contracts/soroban-client.service';
import { CustomInstrumentation } from '../tracing/instrumentation/custom-instrumentation';

@Module({
  imports: [TypeOrmModule.forFeature([GasUsage]), HttpModule],
  providers: [
    GasEstimatorService,
    FeePredictionAlgorithm,
    BatchingService,
    GasOptimizerService,
    SorobanClientService,
    CustomInstrumentation,
  ],
  exports: [GasEstimatorService, BatchingService],
})
export class GasModule {}
