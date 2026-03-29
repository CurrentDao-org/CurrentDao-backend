import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class AssetVersionService {
  private readonly logger = new Logger(AssetVersionService.name);

  generateVersionHash(buffer: Buffer): string {
    this.logger.debug('Generating version hash for asset');
    return crypto
      .createHash('md5')
      .update(buffer)
      .digest('hex')
      .substring(0, 8);
  }

  appendVersionToFilename(filename: string, hash: string): string {
    const parts = filename.split('.');
    if (parts.length > 1) {
      const ext = parts.pop();
      return `${parts.join('.')}.${hash}.${ext}`;
    }
    return `${filename}.${hash}`;
  }
}
