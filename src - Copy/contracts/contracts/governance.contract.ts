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
export class GovernanceContract implements ContractAdapter {
  readonly contractType = ContractType.GOVERNANCE;

  private readonly methods: ContractMethodMetadata[] = [
    {
      method: 'createProposal',
      chainMethod: 'create_proposal',
      readOnly: false,
      eventTopics: ['proposal_created'],
    },
    {
      method: 'vote',
      chainMethod: 'vote',
      readOnly: false,
      eventTopics: ['vote_cast'],
    },
    {
      method: 'getProposal',
      chainMethod: 'get_proposal',
      readOnly: true,
      cacheTtlMs: 5000,
    },
    {
      method: 'getProposalStatus',
      chainMethod: 'get_proposal_status',
      readOnly: true,
      cacheTtlMs: 5000,
    },
    {
      method: 'executeProposal',
      chainMethod: 'execute_proposal',
      readOnly: false,
      eventTopics: ['proposal_executed'],
    },
    {
      method: 'getQuorum',
      chainMethod: 'get_quorum',
      readOnly: true,
      cacheTtlMs: 30000,
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
