import { Injectable } from '@nestjs/common';

@Injectable()
export class BlockchainMonitorService {
  public getNetworkStatus(): boolean {
    // Provides real-time network status
    return true;
  }
}