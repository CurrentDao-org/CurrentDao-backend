import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class HmacAuthService {
  generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );
  }

  generateTimestamp(): number {
    return Math.floor(Date.now() / 1000);
  }

  verifyTimestamp(timestamp: number, maxAgeSeconds: number = 300): boolean {
    const now = Math.floor(Date.now() / 1000);
    return timestamp > now - maxAgeSeconds && timestamp <= now;
  }

  signWebhook(
    payload: any,
    secret: string,
  ): { signature: string; timestamp: number } {
    const payloadString = JSON.stringify(payload);
    const timestamp = this.generateTimestamp();
    const signedPayload = `${payloadString}.${timestamp}`;
    const signature = this.generateSignature(signedPayload, secret);

    return {
      signature,
      timestamp,
    };
  }
}
