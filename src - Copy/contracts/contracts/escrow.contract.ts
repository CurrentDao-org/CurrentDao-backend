import { Injectable } from '@nestjs/common';
import {
  ContractCallDto,
  ContractInvocationMode,
} from '../dto/contract-call.dto';
import { SorobanClientService } from '../soroban-client.service';
import { ContractType } from '../entities/contract.entity';
import {
  ContractAdapter,
  ContractCallResult,
  ContractMethodMetadata,
  ResolvedContractMetadata,
} from './contract.types';

@Injectable()
export class EscrowContract implements ContractAdapter {
  readonly contractType = ContractType.ESCROW;

  private readonly methods: ContractMethodMetadata[] = [
    {
      method: 'createEscrow',
      chainMethod: 'create_escrow',
      readOnly: false,
      eventTopics: ['escrow_created'],
    },
    {
      method: 'fundEscrow',
      chainMethod: 'fund_escrow',
      readOnly: false,
      eventTopics: ['escrow_funded'],
    },
    {
      method: 'releaseEscrow',
      chainMethod: 'release_escrow',
      readOnly: false,
      eventTopics: ['escrow_released'],
    },
    {
      method: 'cancelEscrow',
      chainMethod: 'cancel_escrow',
      readOnly: false,
      eventTopics: ['escrow_cancelled'],
    },
    {
      method: 'getEscrow',
      chainMethod: 'get_escrow',
      readOnly: true,
      cacheTtlMs: 3000,
    },
    {
      method: 'getStatus',
      chainMethod: 'get_status',
      readOnly: true,
      cacheTtlMs: 3000,
    },
  ];

  constructor(private readonly sorobanClient: SorobanClientService) {}

  getMethodMetadata(): ContractMethodMetadata[] {
    return this.methods;
  }

  supportsMethod(method: string): boolean {
    return this.methods.some((candidate) => candidate.method === method);
  }

  async invoke(
    metadata: ResolvedContractMetadata,
    request: ContractCallDto,
  ): Promise<ContractCallResult> {
    const method = this.methods.find(
      (candidate) => candidate.method === request.method,
    );

    return this.sorobanClient.invokeContract({
      contractId: metadata.contractId,
      contractType: this.contractType,
      network: metadata.network,
      method: method?.chainMethod || request.method,
      args: request.args,
      signAndSend:
        request.mode === ContractInvocationMode.SIGNED || !method?.readOnly,
      simulateOnly: request.simulateOnly,
      signerSecretKey: request.signerSecretKey,
      sourcePublicKey: request.sourcePublicKey,
      timeoutInSeconds: request.timeoutInSeconds,
    });
  }
}
