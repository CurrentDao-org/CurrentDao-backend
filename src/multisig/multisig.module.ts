import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MultisigService } from './multisig.service';
import { MultisigWallet } from './entities/multisig-wallet.entity';
import { Signature } from './entities/signature.entity';
import { SignatureCollectionWorkflow } from './workflows/signature-collection.workflow';
import { RecoveryService } from './recovery/recovery.service';

@Module({
  imports: [TypeOrmModule.forFeature([MultisigWallet, Signature])],
  providers: [MultisigService, SignatureCollectionWorkflow, RecoveryService],
  exports: [MultisigService, SignatureCollectionWorkflow, RecoveryService],
  controllers: [],
})
export class MultisigModule {}
