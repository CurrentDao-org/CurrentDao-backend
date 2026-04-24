import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type { ConfigType } from '@nestjs/config';
import {
  Contract,
  Keypair,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
} from '@stellar/stellar-sdk';
import stellarConfig from '../config/stellar.config';
import { CustomInstrumentation } from '../tracing/instrumentation/custom-instrumentation';
import { ContractNetwork, ContractType } from './entities/contract.entity';
import {
  ContractCallResult,
  ContractEventRecord,
  GasEstimation,
  InvokeContractRequest,
} from './contracts/contract.types';

type RpcMethod =
  | 'getEvents'
  | 'getHealth'
  | 'getTransaction'
  | 'sendTransaction'
  | 'simulateTransaction';

@Injectable()
export class SorobanClientService {
  private readonly logger = new Logger(SorobanClientService.name);
  private readonly rpcServers = new Map<ContractNetwork, any>();

  constructor(
    private readonly httpService: HttpService,
    @Inject(stellarConfig.KEY)
    private readonly config: ConfigType<typeof stellarConfig>,
    private readonly instrumentation: CustomInstrumentation,
  ) {}

  async invokeContract(
    request: InvokeContractRequest,
  ): Promise<ContractCallResult> {
    return this.instrumentation.instrument(
      'contracts.soroban.invoke',
      async () => {
        const startedAt = Date.now();
        const { transaction, simulation } =
          await this.prepareInvocation(request);
        const gas = this.mapSimulationToGasEstimation(simulation);

        if (request.simulateOnly || !request.signAndSend) {
          return {
            success: true,
            contractId: request.contractId,
            contractType: request.contractType,
            network: request.network,
            method: request.method,
            simulated: true,
            cached: false,
            durationMs: Date.now() - startedAt,
            result: this.normalizeSimulationResult(simulation),
            gas,
            raw: simulation,
          };
        }

        const signerSecretKey =
          request.signerSecretKey || this.config.sourceSecretKey;
        if (!signerSecretKey) {
          throw new BadRequestException(
            'A signer secret key is required for signed Soroban invocations.',
          );
        }

        const assembled = (rpc as any)
          .assembleTransaction(transaction, simulation)
          .build();
        assembled.sign(Keypair.fromSecret(signerSecretKey));

        const submission = await this.submitPreparedTransaction(
          assembled.toXDR(),
          request.network,
        );
        const transactionHash = submission.hash || submission.id;
        const confirmation = transactionHash
          ? await this.pollTransaction(request.network, transactionHash)
          : undefined;

        return {
          success: true,
          contractId: request.contractId,
          contractType: request.contractType,
          network: request.network,
          method: request.method,
          simulated: false,
          cached: false,
          durationMs: Date.now() - startedAt,
          result:
            confirmation?.resultXdr ||
            this.normalizeSimulationResult(simulation),
          gas,
          transactionHash,
          ledger: confirmation?.ledger,
          raw: confirmation || submission,
        };
      },
    );
  }

  async estimateGas(request: InvokeContractRequest): Promise<GasEstimation> {
    const { simulation } = await this.prepareInvocation({
      ...request,
      signAndSend: false,
      simulateOnly: true,
    });

    return this.mapSimulationToGasEstimation(simulation);
  }

  async estimatePreparedTransaction(
    transactionXdr: string,
    network: ContractNetwork,
  ): Promise<GasEstimation> {
    const simulation = await this.rpcRequest(network, 'simulateTransaction', {
      transaction: transactionXdr,
    });

    return this.mapSimulationToGasEstimation(simulation);
  }

  async getContractEvents(
    contractId: string,
    contractType: ContractType,
    network: ContractNetwork,
    startLedger?: number,
  ): Promise<ContractEventRecord[]> {
    const response = await this.rpcRequest(network, 'getEvents', {
      startLedger,
      filters: [
        {
          type: 'contract',
          contractIds: [contractId],
        },
      ],
      pagination: {
        limit: 100,
      },
    });

    const events = response.events || response.records || [];

    return events.map((event: Record<string, any>, index: number) => ({
      id: `${event.ledger || event.ledgerSequence || 0}:${event.txHash || event.tx_hash || index}`,
      contractId,
      contractType,
      network,
      ledger: Number(event.ledger || event.ledgerSequence || 0),
      transactionHash: event.txHash || event.tx_hash,
      topic: (event.topic || event.topics || []).map((item: unknown) =>
        String(item),
      ),
      payload: event.value || event.data || event,
      timestamp: event.timestamp || new Date().toISOString(),
      raw: event,
    }));
  }

  async submitPreparedTransaction(
    transactionXdr: string,
    network: ContractNetwork,
  ): Promise<Record<string, any>> {
    return this.rpcRequest(network, 'sendTransaction', {
      transaction: transactionXdr,
    });
  }

  async getRpcHealth(network: ContractNetwork): Promise<Record<string, any>> {
    try {
      return await this.rpcRequest(network, 'getHealth', {});
    } catch (error) {
      this.logger.warn(
        `Soroban RPC health check failed for ${network}: ${error.message}`,
      );
      throw new ServiceUnavailableException(
        `Soroban RPC health check failed for ${network}`,
      );
    }
  }

  private async prepareInvocation(
    request: InvokeContractRequest,
  ): Promise<{ transaction: any; simulation: Record<string, any> }> {
    const account = await this.getRpcServer(request.network).getAccount(
      this.resolveSourcePublicKey(
        request.sourcePublicKey,
        request.signerSecretKey,
      ),
    );

    const contract = new Contract(request.contractId);
    const timeout = request.timeoutInSeconds || 30;
    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: this.getNetworkConfig(request.network)
        .networkPassphrase,
    })
      .addOperation(
        contract.call(
          request.method,
          ...(request.args || []).map((arg) => this.toScVal(arg)),
        ),
      )
      .setTimeout(timeout)
      .build();

    const simulation = await this.getRpcServer(
      request.network,
    ).simulateTransaction(transaction);
    if ((simulation as Record<string, any>).error) {
      throw new ServiceUnavailableException(
        (simulation as Record<string, any>).error,
      );
    }

    return { transaction, simulation };
  }

  private getRpcServer(network: ContractNetwork): any {
    if (!this.rpcServers.has(network)) {
      const sorobanRpcUrl = this.getNetworkConfig(network).sorobanRpcUrl;
      this.rpcServers.set(
        network,
        new (rpc as any).Server(sorobanRpcUrl, {
          allowHttp: sorobanRpcUrl.startsWith('http://'),
        }),
      );
    }

    return this.rpcServers.get(network);
  }

  private getNetworkConfig(network: ContractNetwork) {
    return this.config.networks[network];
  }

  private resolveSourcePublicKey(
    sourcePublicKey?: string,
    signerSecretKey?: string,
  ): string {
    if (sourcePublicKey) {
      return sourcePublicKey;
    }

    if (signerSecretKey) {
      return Keypair.fromSecret(signerSecretKey).publicKey();
    }

    if (this.config.sourceSecretKey) {
      return Keypair.fromSecret(this.config.sourceSecretKey).publicKey();
    }

    if (this.config.sourcePublicKey) {
      return this.config.sourcePublicKey;
    }

    throw new BadRequestException(
      'STELLAR_SOURCE_PUBLIC_KEY or STELLAR_SOURCE_SECRET_KEY must be configured.',
    );
  }

  private toScVal(value: unknown) {
    if (value === undefined) {
      return nativeToScVal(null);
    }

    if (typeof value === 'bigint') {
      return nativeToScVal(value.toString());
    }

    return nativeToScVal(value as any);
  }

  private normalizeSimulationResult(simulation: Record<string, any>): unknown {
    try {
      if (simulation.result?.retval) {
        return scValToNative(simulation.result.retval);
      }

      if (simulation.results?.[0]?.xdr) {
        return simulation.results[0].xdr;
      }
    } catch (error) {
      this.logger.debug(
        `Falling back to raw simulation result: ${error.message}`,
      );
    }

    return simulation.result || simulation.results || simulation;
  }

  private mapSimulationToGasEstimation(
    simulation: Record<string, any>,
  ): GasEstimation {
    const cost = simulation.cost || simulation.transactionData?.resources || {};
    const minResourceFee =
      simulation.minResourceFee || simulation.min_resource_fee;

    return {
      cpuInstructions: Number(cost.cpuInsns || cost.cpuInstructions || 0),
      readBytes: Number(cost.memBytes || cost.readBytes || 0),
      writeBytes: Number(cost.writeBytes || 0),
      minResourceFee: minResourceFee ? String(minResourceFee) : undefined,
      recommendedFee: minResourceFee
        ? String(Math.ceil(Number(minResourceFee) * 1.1))
        : undefined,
    };
  }

  private async rpcRequest(
    network: ContractNetwork,
    method: RpcMethod,
    params: Record<string, any>,
  ): Promise<Record<string, any>> {
    const endpoint = this.getNetworkConfig(network).sorobanRpcUrl;
    const response = await this.httpService.axiosRef.post(
      endpoint,
      {
        jsonrpc: '2.0',
        id: `${method}-${Date.now()}`,
        method,
        params,
      },
      {
        timeout: this.config.rpcTimeoutMs,
      },
    );

    if (response.data?.error) {
      throw new ServiceUnavailableException(
        response.data.error.message || `Soroban RPC method ${method} failed.`,
      );
    }

    return response.data?.result || response.data;
  }

  private async pollTransaction(
    network: ContractNetwork,
    transactionHash: string,
  ): Promise<Record<string, any> | undefined> {
    const deadline = Date.now() + this.config.submissionTimeoutMs;

    while (Date.now() < deadline) {
      const transaction = await this.rpcRequest(network, 'getTransaction', {
        hash: transactionHash,
      });

      if (
        transaction.status &&
        transaction.status !== 'NOT_FOUND' &&
        transaction.status !== 'PENDING'
      ) {
        return transaction;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return undefined;
  }
}
