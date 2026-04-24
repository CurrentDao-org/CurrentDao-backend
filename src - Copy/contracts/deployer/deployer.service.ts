import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ContractDeploymentDto,
  ContractUpgradeDto,
} from '../dto/contract-call.dto';
import {
  ContractEntity,
  ContractNetwork,
  ContractStatus,
} from '../entities/contract.entity';
import {
  ContractDeployer,
  ContractDeploymentResult,
} from '../contracts/contract.types';
import { SorobanClientService } from '../soroban-client.service';

@Injectable()
export class DeployerService implements ContractDeployer {
  private readonly logger = new Logger(DeployerService.name);

  constructor(
    @InjectRepository(ContractEntity)
    private readonly contractRepository: Repository<ContractEntity>,
    private readonly sorobanClient: SorobanClientService,
  ) {}

  async deployContract(
    request: ContractDeploymentDto,
  ): Promise<ContractDeploymentResult> {
    const network = request.network || ContractNetwork.TESTNET;

    if (!request.contractId && !request.prebuiltTransactionXdr) {
      throw new BadRequestException(
        'Deployment requires either a contractId or a prebuiltTransactionXdr.',
      );
    }

    const gas = request.prebuiltTransactionXdr
      ? await this.sorobanClient.estimatePreparedTransaction(
          request.prebuiltTransactionXdr,
          network,
        )
      : undefined;

    const submission = request.prebuiltTransactionXdr
      ? await this.sorobanClient.submitPreparedTransaction(
          request.prebuiltTransactionXdr,
          network,
        )
      : undefined;

    const contractId =
      request.contractId ||
      submission?.contractId ||
      submission?.result?.contractId;
    if (!contractId) {
      throw new BadRequestException(
        'Unable to determine deployed contractId from deployment request.',
      );
    }

    const version = request.version || new Date().toISOString();
    const activeContract = await this.contractRepository.findOne({
      where: {
        contractType: request.contractType,
        network,
        isActive: true,
      },
    });

    if (activeContract) {
      activeContract.isActive = false;
      activeContract.status = ContractStatus.INACTIVE;
      await this.contractRepository.save(activeContract);
    }

    const entity = this.contractRepository.create({
      contractType: request.contractType,
      network,
      contractId,
      alias: request.alias,
      version,
      abi: request.abi,
      metadata: request.metadata,
      deploymentMetadata: {
        ...request.deploymentMetadata,
        submission,
      },
      deploymentTxHash:
        request.deploymentTxHash || submission?.hash || submission?.id,
      previousContractId: activeContract?.contractId,
      deployedBy: request.signerSecretKey
        ? 'runtime-signer'
        : 'external-pipeline',
      metadataCacheKey: `${request.contractType}:${network}:${version}`,
      status: ContractStatus.ACTIVE,
      isActive: true,
    });

    await this.contractRepository.save(entity);
    this.logger.log(
      `Registered ${request.contractType} contract ${contractId} on ${network} version ${version}`,
    );

    return {
      success: true,
      contractId,
      contractType: request.contractType,
      network,
      version,
      alias: request.alias,
      transactionHash: entity.deploymentTxHash,
      gas,
      metadata: entity.metadata,
    };
  }

  async upgradeContract(
    request: ContractUpgradeDto,
  ): Promise<ContractDeploymentResult> {
    const existing = await this.contractRepository.findOne({
      where: {
        contractId: request.previousContractId,
        network: request.network || ContractNetwork.TESTNET,
      },
    });

    if (!existing) {
      throw new BadRequestException(
        `Cannot upgrade missing contract ${request.previousContractId}.`,
      );
    }

    const result = await this.deployContract(request);
    await this.contractRepository.update(
      { id: existing.id },
      {
        isActive: request.activate === false,
        status:
          request.activate === false
            ? ContractStatus.INACTIVE
            : ContractStatus.DEPRECATED,
        upgradeTxHash: result.transactionHash,
      },
    );

    await this.contractRepository.update(
      {
        contractId: result.contractId,
        network: result.network,
      },
      {
        previousContractId: existing.contractId,
      },
    );

    return result;
  }
}
