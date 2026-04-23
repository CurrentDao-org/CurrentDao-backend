import { Injectable } from '@nestjs/common';

@Injectable()
export class CacheAnalyticsService {
  private hits = 0;
  private misses = 0;
  private writes = 0;
  private invalidations = 0;

  recordHit(): void {
    this.hits += 1;
  }

  recordMiss(): void {
    this.misses += 1;
  }

  recordWrite(): void {
    this.writes += 1;
  }

  recordInvalidate(): void {
    this.invalidations += 1;
  }

  getMetrics() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      writes: this.writes,
      invalidations: this.invalidations,
      hitRatio: total === 0 ? 0 : Number((this.hits / total).toFixed(2)),
    };
  }
}
