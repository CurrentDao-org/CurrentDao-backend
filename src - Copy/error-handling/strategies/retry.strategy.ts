import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RetryStrategy {
  private readonly logger = new Logger(RetryStrategy.name);

  async execute<T>(operation: () => Promise<T>, maxAttempts = 3, baseDelayMs = 150): Promise<T> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt < maxAttempts) {
      try {
        attempt += 1;
        return await operation();
      } catch (error) {
        lastError = error;
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        this.logger.warn(`Retry attempt ${attempt}/${maxAttempts} failed, retrying in ${delayMs}ms.`);

        if (attempt >= maxAttempts) {
          break;
        }

        await this.delay(delayMs);
      }
    }

    this.logger.error('Retry strategy exhausted all attempts.');
    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
