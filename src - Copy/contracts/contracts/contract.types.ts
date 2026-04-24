import { Observable } from 'rxjs';
import {
  ContractCallDto,
  ContractDeploymentDto,
  ContractUpgradeDto,
} from '../dto/contract-call.dto';
import { ContractNetwork, ContractType } from '../entities/contract.entity';

export interface GasEstimation {
  cpuInstructions?: number;
  readBytes?: number;
  writeBytes?: number;
  minResourceFee?: string;
  recommendedFee?: string;
}

export interface ContractEventRecord {
  id: string;
  contractId: string;
  contractType: ContractType;
  network: ContractNetwork;
  ledger?: number;
  transactionHash?: string;
  topic: string[];
  payload: unknown;
  timestamp: string;
  raw?: Record<string, any>;
}

export interface ContractCallResult {
  success: boolean;
  contractId: string;
  contractType: ContractType;
  network: ContractNetwork;
  method: string;
  simulated: boolean;
  cached: boolean;
  durationMs: number;
  result?: unknown;
  gas?: GasEstimation;
  transactionHash?: string;
  ledger?: number;
  raw?: Record<string, any>;
}

export interface ContractDeploymentResult {
  success: boolean;
  contractId: string;
  contractType: ContractType;
  network: ContractNetwork;
  version: string;
  alias?: string;
  transactionHash?: string;
  gas?: GasEstimation;
  metadata?: Record<string, any>;
}

export interface ContractMethodMetadata {
  method: string;
  chainMethod: string;
  readOnly: boolean;
  cacheTtlMs?: number;
  eventTopics?: string[];
}

export interface ResolvedContractMetadata {
  contractId: string;
  contractType: ContractType;
  network: ContractNetwork;
  version?: string;
  alias?: string;
  abi?: Record<string, any>;
  metadata?: Record<string, any>;
  lastProcessedLedger?: number;
  methods: ContractMethodMetadata[];
}

export interface InvokeContractRequest {
  contractId: string;
  contractType: ContractType;
  network: ContractNetwork;
  method: string;
  args?: unknown[];
  signAndSend?: boolean;
  simulateOnly?: boolean;
  signerSecretKey?: string;
  sourcePublicKey?: string;
  timeoutInSeconds?: number;
}

export interface EventStreamHandle {
  key: string;
  stream: Observable<ContractEventRecord>;
}

export interface ContractAdapter {
  readonly contractType: ContractType;
  getMethodMetadata(): ContractMethodMetadata[];
  supportsMethod(method: string): boolean;
  invoke(
    metadata: ResolvedContractMetadata,
    request: ContractCallDto,
  ): Promise<ContractCallResult>;
}

export interface ContractDeployer {
  deployContract(
    request: ContractDeploymentDto,
  ): Promise<ContractDeploymentResult>;
  upgradeContract(
    request: ContractUpgradeDto,
  ): Promise<ContractDeploymentResult>;
}
