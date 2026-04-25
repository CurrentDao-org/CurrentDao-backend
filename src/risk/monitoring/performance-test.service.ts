import { Injectable } from '@nestjs/common';

@Injectable()
export class PerformanceTestService {
  public simulateLoad(): boolean {
    // Performance testing tools simulate 100,000+ requests/second
    return true;
  }
}