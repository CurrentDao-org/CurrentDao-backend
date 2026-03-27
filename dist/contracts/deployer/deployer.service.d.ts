import { Repository } from 'typeorm';
import { ContractDeploymentDto, ContractUpgradeDto } from '../dto/contract-call.dto';
import { ContractEntity } from '../entities/contract.entity';
import { ContractDeployer, ContractDeploymentResult } from '../contracts/contract.types';
import { SorobanClientService } from '../soroban-client.service';
export declare class DeployerService implements ContractDeployer {
    private readonly contractRepository;
    private readonly sorobanClient;
    private readonly logger;
    constructor(contractRepository: Repository<ContractEntity>, sorobanClient: SorobanClientService);
    deployContract(request: ContractDeploymentDto): Promise<ContractDeploymentResult>;
    upgradeContract(request: ContractUpgradeDto): Promise<ContractDeploymentResult>;
}
