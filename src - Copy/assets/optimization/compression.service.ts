import { Injectable, Logger } from '@nestjs/common';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const brotliCompress = promisify(zlib.brotliCompress);

@Injectable()
export class CompressionService {
  private readonly logger = new Logger(CompressionService.name);

  async compressAsset(
    buffer: Buffer,
    algorithm: 'gzip' | 'brotli' = 'brotli',
  ): Promise<Buffer> {
    this.logger.debug(`Compressing asset using ${algorithm}`);
    try {
      if (algorithm === 'brotli') {
        return await brotliCompress(buffer);
      }
      return await gzip(buffer);
    } catch (error) {
      this.logger.error(`Compression failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
