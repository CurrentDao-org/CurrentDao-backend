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
export class TokenContract implements ContractAdapter {
  readonly contractType = ContractType.TOKEN;

  private readonly methods: ContractMethodMetadata[] = [
    {
      method: 'balance',
      chainMethod: 'balance',
      readOnly: true,
      cacheTtlMs: 10000,
      eventTopics: ['transfer'],
    },
    {
      method: 'allowance',
      chainMethod: 'allowance',
      readOnly: true,
      cacheTtlMs: 10000,
    },
    {
      method: 'decimals',
      chainMethod: 'decimals',
      readOnly: true,
      cacheTtlMs: 60000,
    },
    {
      method: 'symbol',
      chainMethod: 'symbol',
      readOnly: true,
      cacheTtlMs: 60000,
    },
    {
      method: 'transfer',
      chainMethod: 'transfer',
      readOnly: false,
      eventTopics: ['transfer'],
    },
    {
      method: 'approve',
      chainMethod: 'approve',
      readOnly: false,
      eventTopics: ['approval'],
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
