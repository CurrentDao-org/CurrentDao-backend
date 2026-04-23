import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MemoryProvider {
  private readonly logger = new Logger(MemoryProvider.name);
  private readonly store = new Map<string, { value: unknown; expiresAt: number | null }>();

  async get<T>(namespace: string, key: string): Promise<T | null> {
    const entry = this.store.get(`${namespace}:${key}`);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(`${namespace}:${key}`);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(namespace: string, key: string, value: T, ttlSeconds: number): Promise<void> {
    const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(`${namespace}:${key}`, { value, expiresAt });
    this.logger.debug(`Memory cache set ${namespace}:${key}`);
  }

  async del(namespace: string, key: string): Promise<void> {
    this.store.delete(`${namespace}:${key}`);
    this.logger.debug(`Memory cache delete ${namespace}:${key}`);
  }
}
