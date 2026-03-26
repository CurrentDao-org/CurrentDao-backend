import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';

enum CircuitBreakerState {
  CLOSED,
  OPEN,
  HALF_OPEN,
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private readonly threshold: number = 5;
  private readonly timeout: number = 30000; // 30 seconds

  /**
   * Checks if the circuit is open. If so, it throws an error.
   */
  async checkCircuit(): Promise<void> {
    if (this.state === CircuitBreakerState.OPEN) {
      throw new InternalServerErrorException('Circuit is open, please try again later');
    }
  }

  /**
   * Logs a successful request and resets the failure count.
   */
  async reportSuccess(): Promise<void> {
    this.failureCount = 0;
    this.state = CircuitBreakerState.CLOSED;
    this.logger.debug('Circuit Breaker status: CLOSED');
  }

  /**
   * Logs a failed request and increments the failure count.
   * If the failure count exceeds the threshold, the circuit is opened.
   */
  async reportFailure(): Promise<void> {
    this.failureCount++;
    this.logger.error(`Circuit Breaker status: FAILURE (Count: ${this.failureCount}/${this.threshold})`);
    
    if (this.failureCount >= this.threshold) {
      this.state = CircuitBreakerState.OPEN;
      this.logger.error('Circuit Breaker status: OPEN');
      
      // Reset state to HALF_OPEN after timeout
      setTimeout(() => {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.logger.warn('Circuit Breaker status: HALF_OPEN');
      }, this.timeout);
    }
  }
}
