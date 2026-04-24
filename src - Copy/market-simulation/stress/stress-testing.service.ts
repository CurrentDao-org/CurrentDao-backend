import { Injectable } from '@nestjs/common';

@Injectable()
export class StressTestingService {
  async runStressTest(scenario: string, depth: number) {
    return {
      scenario,
      depth,
      vulnerabilities: depth > 5 ? ['capacity constraint', 'price shock'] : ['liquidity event'],
      severity: depth > 7 ? 'CRITICAL' : 'MODERATE',
      executedAt: new Date().toISOString(),
    };
  }
}
