import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerOptionsFactory, ThrottlerModuleOptions } from '@nestjs/throttler';

@Injectable()
export class DdosProtectionService implements ThrottlerOptionsFactory {
  private readonly logger = new Logger(DdosProtectionService.name);

  createThrottlerOptions(): ThrottlerModuleOptions {
    this.logger.log('Configuring DDoS protection via Throttler...');
    return [
      {
        name: 'short',
        ttl: 1000,   // 1 second
        limit: 10,   // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 10000,  // 10 seconds
        limit: 50,  // 50 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000,  // 1 minute
        limit: 100, // 100 requests per minute
      },
    ];
  }

  /**
   * Log blocked requests
   */
  logBlockedRequest(ip: string, reason: string) {
    this.logger.warn(`DDoS protection blocked request from IP: ${ip}. Reason: ${reason}`);
  }
}
