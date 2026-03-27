import type { Response } from 'express';
import { ContractService } from './contracts/contract.service';
export declare class HealthController {
    private readonly contractService;
    constructor(contractService: ContractService);
    healthCheck(res: Response): Promise<Response<any, Record<string, any>>>;
    readinessCheck(res: Response): Promise<Response<any, Record<string, any>>>;
}
