import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

@Injectable()
export class CircuitBreakerStrategy {
  private readonly logger = new Logger(CircuitBreakerStrategy.name);
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private readonly failureThreshold = 5;
  private readonly resetTimeoutMs = 30000;
  private lastStateChange = Date.now();

  async ensureAvailable(): Promise<void> {
    if (this.state === CircuitState.OPEN) {
      const elapsed = Date.now() - this.lastStateChange;
      if (elapsed >= this.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.logger.warn('Circuit breaker moved to HALF_OPEN state after timeout.');
        return;
      }
      throw new InternalServerErrorException('Service temporarily unavailable due to a circuit breaker.');
    }

    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.warn('Circuit breaker half-open: allowing a trial request.');
    }
  }

  async recordSuccess(): Promise<void> {
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
    this.lastStateChange = Date.now();
    this.logger.debug('Circuit breaker reset to CLOSED state.');
  }

  async recordFailure(): Promise<void> {
    this.failureCount += 1;
    this.logger.warn(`Circuit breaker failure ${this.failureCount}/${this.failureThreshold}`);

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.lastStateChange = Date.now();
      this.logger.error('Circuit breaker opened after repeated failures.');
      setTimeout(() => {
        this.state = CircuitState.HALF_OPEN;
        this.lastStateChange = Date.now();
        this.logger.warn('Circuit breaker transitioning to HALF_OPEN.');
      }, this.resetTimeoutMs);
    }
  }
}
