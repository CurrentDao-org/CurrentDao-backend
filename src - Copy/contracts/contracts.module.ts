import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import stellarConfig from '../config/stellar.config';
import { ContractEntity } from './entities/contract.entity';
import { ContractService } from './contract.service';
import { SorobanClientService } from './soroban-client.service';
import { TokenContract } from './contracts/token.contract';
import { EscrowContract } from './contracts/escrow.contract';
import { GovernanceContract } from './contracts/governance.contract';
import { DeployerService } from './deployer/deployer.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forFeature(stellarConfig),
    TypeOrmModule.forFeature([ContractEntity]),
  ],
  providers: [
    SorobanClientService,
    TokenContract,
    EscrowContract,
    GovernanceContract,
    DeployerService,
    ContractService,
  ],
  exports: [ContractService, DeployerService, SorobanClientService],
})
export class ContractsModule {}
