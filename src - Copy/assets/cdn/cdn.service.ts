import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CdnService {
  private readonly logger = new Logger(CdnService.name);

  getAssetUrl(assetPath: string): string {
    const cdnDomain = process.env.CDN_DOMAIN || 'https://cdn.currentdao.org';
    this.logger.debug(`Resolving asset URL for: ${assetPath}`);
    return `${cdnDomain}/${assetPath}`;
  }
}
