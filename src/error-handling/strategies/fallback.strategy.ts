import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FallbackStrategy {
  private readonly logger = new Logger(FallbackStrategy.name);

  async executeWithFallback<T>(primary: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    try {
      return await primary();
    } catch (error) {
      this.logger.warn('Primary operation failed, executing fallback strategy.');
      try {
        return await fallback();
      } catch (fallbackError) {
        this.logger.error('Fallback operation also failed.', fallbackError as any);
        throw fallbackError;
      }
    }
  }
}
