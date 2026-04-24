import {
  BadRequestException,
  Injectable,
  Inject,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, Subject } from 'rxjs';
import type { ConfigType } from '@nestjs/config';
import { MetricsCollectorService } from '../apm/metrics/metrics-collector.service';
import { CustomInstrumentation } from '../tracing/instrumentation/custom-instrumentation';
import stellarConfig from '../config/stellar.config';
import {
  ContractCallDto,
  ContractDeploymentDto,
  ContractEventListenerDto,
  ContractUpgradeDto,
} from './dto/contract-call.dto';
import {
  ContractEntity,
  ContractNetwork,
  ContractType,
} from './entities/contract.entity';
import {
  ContractAdapter,
  ContractCallResult,
  ContractDeploymentResult,
  ContractEventRecord,
  EventStreamHandle,
  GasEstimation,
  ResolvedContractMetadata,
} from './contracts/contract.types';
import { TokenContract } from './contracts/token.contract';
import { EscrowContract } from './contracts/escrow.contract';
import { GovernanceContract } from './contracts/governance.contract';
import { DeployerService } from './deployer/deployer.service';
import { SorobanClientService } from './soroban-client.service';

interface MetadataCacheEntry {
  expiresAt: number;
  metadata: ResolvedContractMetadata;
}

@Injectable()
export class ContractService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ContractService.name);
  private readonly metadataCache = new Map<string, MetadataCacheEntry>();
  private readonly eventIntervals = new Map<string, NodeJS.Timeout>();
  private readonly eventSubject = new Subject<ContractEventRecord>();
  private readonly lastPollAt = new Map<string, string>();

  constructor(
    @InjectRepository(ContractEntity)
    private readonly contractRepository: Repository<ContractEntity>,
    @Inject(stellarConfig.KEY)
    private readonly config: ConfigType<typeof stellarConfig>,
    private readonly metricsCollector: MetricsCollectorService,
    private readonly instrumentation: CustomInstrumentation,
    private readonly sorobanClient: SorobanClientService,
    private readonly tokenContract: TokenContract,
    private readonly escrowContract: EscrowContract,
    private readonly governanceContract: GovernanceContract,
    private readonly deployerService: DeployerService,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const contractType of Object.values(ContractType)) {
      for (const network of Object.values(ContractNetwork)) {
        try {
          await this.resolveContractMetadata(contractType, network);
        } catch (error) {
          this.logger.debug(
            `Skipping metadata warmup for ${contractType}/${network}: ${error.message}`,
          );
        }
      }
    }
  }

  onModuleDestroy(): void {
    for (const interval of this.eventIntervals.values()) {
      clearInterval(interval);
    }

    this.eventIntervals.clear();
    this.eventSubject.complete();
  }

  async invokeContract(request: ContractCallDto): Promise<ContractCallResult> {
    return this.instrumentation.instrument(
      'contracts.service.invoke',
      async () => {
        const metadata = await this.resolveContractMetadata(
          request.contractType,
          this.resolveNetwork(request.network),
        );

        const adapter = this.getAdapter(request.contractType);
        if (!adapter.supportsMethod(request.method)) {
          throw new BadRequestException(
            `Method ${request.method} is not supported by ${request.contractType} contract wrapper.`,
          );
        }

        const result = await adapter.invoke(metadata, request);
        this.metricsCollector.trackBusinessMetric(
          `contracts.invoke.${request.contractType}.${request.method}`,
        );

        return result;
      },
    );
  }

  async estimateGas(request: ContractCallDto): Promise<GasEstimation> {
    const metadata = await this.resolveContractMetadata(
      request.contractType,
      this.resolveNetwork(request.network),
    );

    return this.sorobanClient.estimateGas({
      contractId: metadata.contractId,
      contractType: request.contractType,
      network: metadata.network,
      method: this.resolveMethod(
        metadata,
        request.contractType,
        request.method,
      ),
      args: request.args,
      signerSecretKey: request.signerSecretKey,
      sourcePublicKey: request.sourcePublicKey,
      timeoutInSeconds: request.timeoutInSeconds,
    });
  }

  async deployContract(
    request: ContractDeploymentDto,
  ): Promise<ContractDeploymentResult> {
    return this.deployerService.deployContract(request);
  }

  async upgradeContract(
    request: ContractUpgradeDto,
  ): Promise<ContractDeploymentResult> {
    return this.deployerService.upgradeContract(request);
  }

  async listenToEvents(
    request: ContractEventListenerDto,
  ): Promise<EventStreamHandle> {
    const network = this.resolveNetwork(request.network);
    const metadata = await this.resolveContractMetadata(
      request.contractType,
      network,
    );
    const key = `${request.contractType}:${network}`;

    if (this.eventIntervals.has(key)) {
      return {
        key,
        stream: this.eventSubject.asObservable(),
      };
    }

    const interval = setInterval(async () => {
      try {
        const latestMetadata = await this.resolveContractMetadata(
          request.contractType,
          network,
          true,
        );
        const startLedger =
          request.startLedger || latestMetadata.lastProcessedLedger || 0;
        const events = await this.sorobanClient.getContractEvents(
          latestMetadata.contractId,
          request.contractType,
          network,
          startLedger > 0 ? startLedger + 1 : undefined,
        );

        if (events.length === 0) {
          return;
        }

        const lastLedger = events.reduce(
          (current, event) => Math.max(current, event.ledger || current),
          startLedger,
        );
        this.lastPollAt.set(key, new Date().toISOString());

        await this.persistLedgerCursor(
          latestMetadata.contractId,
          network,
          lastLedger,
        );
        for (const event of events) {
          this.metricsCollector.trackBusinessMetric(
            `contracts.events.${request.contractType}`,
          );
          this.eventSubject.next(event);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to poll ${request.contractType} events on ${network}: ${error.message}`,
        );
      }
    }, this.config.eventPollingIntervalMs);

    interval.unref?.();
    this.eventIntervals.set(key, interval);

    return {
      key,
      stream: this.eventSubject.asObservable(),
    };
  }

  async stopEventListener(
    contractType: ContractType,
    network?: ContractNetwork,
  ): Promise<void> {
    const resolvedNetwork = this.resolveNetwork(network);
    const key = `${contractType}:${resolvedNetwork}`;
    const interval = this.eventIntervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.eventIntervals.delete(key);
    }
  }

  getEventStream(): Observable<ContractEventRecord> {
    return this.eventSubject.asObservable();
  }

  async getHealthStatus(): Promise<Record<string, any>> {
    const statuses = await Promise.allSettled(
      Object.values(ContractNetwork).map(async (network) => ({
        network,
        health: await this.sorobanClient.getRpcHealth(network),
      })),
    );

    const unhealthy = statuses.filter((result) => result.status === 'rejected');

    return {
      status: unhealthy.length === 0 ? 'healthy' : 'degraded',
      defaultNetwork: this.config.defaultNetwork,
      activeListeners: this.eventIntervals.size,
      cachedContracts: this.metadataCache.size,
      lastEventPollAt: Object.fromEntries(this.lastPollAt.entries()),
      networks: statuses.map((result, index) => {
        const network = Object.values(ContractNetwork)[index];
        return result.status === 'fulfilled'
          ? { network, status: 'healthy', details: result.value.health }
          : { network, status: 'degraded', error: result.reason.message };
      }),
    };
  }

  private async resolveContractMetadata(
    contractType: ContractType,
    network: ContractNetwork,
    forceRefresh = false,
  ): Promise<ResolvedContractMetadata> {
    const cacheKey = `${contractType}:${network}`;
    const cached = this.metadataCache.get(cacheKey);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return cached.metadata;
    }

    const adapter = this.getAdapter(contractType);
    const entity = await this.contractRepository.findOne({
      where: {
        contractType,
        network,
        isActive: true,
      },
      order: {
        updatedAt: 'DESC',
      },
    });

    const configuredContractId = this.config.contracts[contractType]?.[network];
    const contractId = entity?.contractId || configuredContractId;
    if (!contractId) {
      throw new ServiceUnavailableException(
        `No ${contractType} contract is configured for ${network}.`,
      );
    }

    const metadata: ResolvedContractMetadata = {
      contractId,
      contractType,
      network,
      version: entity?.version,
      alias: entity?.alias,
      abi: entity?.abi || {
        methods: adapter.getMethodMetadata(),
      },
      metadata: {
        ...(entity?.metadata || {}),
        contractId,
        contractType,
        network,
      },
      lastProcessedLedger: entity?.lastProcessedLedger
        ? Number(entity.lastProcessedLedger)
        : undefined,
      methods: adapter.getMethodMetadata(),
    };

    this.metadataCache.set(cacheKey, {
      metadata,
      expiresAt: Date.now() + this.config.metadataCacheTtlMs,
    });

    return metadata;
  }

  private getAdapter(contractType: ContractType): ContractAdapter {
    switch (contractType) {
      case ContractType.TOKEN:
        return this.tokenContract;
      case ContractType.ESCROW:
        return this.escrowContract;
      case ContractType.GOVERNANCE:
        return this.governanceContract;
      default:
        throw new BadRequestException(
          `Unsupported contract type: ${contractType}`,
        );
    }
  }

  private resolveNetwork(network?: ContractNetwork): ContractNetwork {
    if (network) {
      return network;
    }

    return this.config.defaultNetwork === 'mainnet'
      ? ContractNetwork.MAINNET
      : ContractNetwork.TESTNET;
  }

  private resolveMethod(
    metadata: ResolvedContractMetadata,
    contractType: ContractType,
    method: string,
  ): string {
    const methodMetadata = metadata.methods.find(
      (candidate) => candidate.method === method,
    );
    if (!methodMetadata) {
      throw new BadRequestException(
        `Method ${method} is not available for ${contractType}.`,
      );
    }

    return methodMetadata.chainMethod;
  }

  private async persistLedgerCursor(
    contractId: string,
    network: ContractNetwork,
    ledger: number,
  ): Promise<void> {
    await this.contractRepository.update(
      {
        contractId,
        network,
      },
      {
        lastProcessedLedger: String(ledger),
        lastEventAt: new Date(),
      },
    );

    this.metadataCache.delete(`token:${network}`);
    this.metadataCache.delete(`escrow:${network}`);
    this.metadataCache.delete(`governance:${network}`);
  }
}
