import { Injectable, Logger } from '@nestjs/common';
import { MfaType } from '../dto/auth.dto';

export interface MfaSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface MfaVerification {
  success: boolean;
  remainingAttempts?: number;
}

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private readonly mfaSecrets = new Map<string, string>();
  private readonly backupCodes = new Map<string, string[]>();
  private readonly mfaAttempts = new Map<string, number>();

  async setupMfa(userId: string, setupData: { type: MfaType; phoneNumber?: string; backupCodes?: boolean }): Promise<MfaSetup> {
    this.logger.log(`Setting up MFA for user: ${userId}`);

    if (setupData.type === MfaType.TOTP) {
      const secret = this.generateSecret();
      this.mfaSecrets.set(userId, secret);

      const qrCode = await this.generateQrCode(userId, 'user@example.com', secret, 'CurrentDao');
      
      const backupCodes = setupData.backupCodes ? this.generateBackupCodes() : [];
      if (backupCodes.length > 0) {
        this.backupCodes.set(userId, backupCodes);
      }

      return {
        secret,
        qrCode,
        backupCodes,
      };
    } else if (setupData.type === MfaType.SMS) {
      // In real implementation, send SMS verification
      return {
        secret: 'sms_setup',
        qrCode: '',
        backupCodes: [],
      };
    } else if (setupData.type === MfaType.EMAIL) {
      // In real implementation, send email verification
      return {
        secret: 'email_setup',
        qrCode: '',
        backupCodes: [],
      };
    }

    throw new Error('Unsupported MFA type');
  }

  async verifyMfa(userId: string, code: string): Promise<boolean> {
    this.logger.log(`Verifying MFA for user: ${userId}`);

    const attempts = this.mfaAttempts.get(userId) || 0;
    if (attempts >= 3) {
      this.logger.warn(`MFA verification locked for user: ${userId} due to too many attempts`);
      return false;
    }

    // Check if it's a backup code
    const userBackupCodes = this.backupCodes.get(userId) || [];
    const backupCodeIndex = userBackupCodes.indexOf(code);
    
    if (backupCodeIndex !== -1) {
      // Remove used backup code
      userBackupCodes.splice(backupCodeIndex, 1);
      this.backupCodes.set(userId, userBackupCodes);
      this.mfaAttempts.delete(userId);
      return true;
    }

    // Verify TOTP code
    const secret = this.mfaSecrets.get(userId);
    if (!secret) {
      return false;
    }

    // In real implementation, use speakeasy to verify TOTP
    const isValid = this.verifyTotpCode(secret, code);
    
    if (isValid) {
      this.mfaAttempts.delete(userId);
      return true;
    } else {
      this.mfaAttempts.set(userId, attempts + 1);
      return false;
    }
  }

  async generateQrCode(userId: string, email: string, secret: string, appName: string): Promise<string> {
    // In real implementation, use qrcode library to generate QR code
    const otpauthUrl = `otpauth://totp/${appName}:${email}?secret=${secret}&issuer=${appName}`;
    return `data:image/png;base64,${Buffer.from('mock_qr_code').toString('base64')}`;
  }

  async getAvailableMethods(userId: string): Promise<MfaType[]> {
    const methods: MfaType[] = [MfaType.TOTP];
    
    // Add SMS if phone number is available
    // Add EMAIL if email is verified
    
    return methods;
  }

  async disableMfa(userId: string): Promise<void> {
    this.logger.log(`Disabling MFA for user: ${userId}`);
    
    this.mfaSecrets.delete(userId);
    this.backupCodes.delete(userId);
    this.mfaAttempts.delete(userId);
  }

  private generateSecret(): string {
    // In real implementation, use speakeasy to generate secret
    return Math.random().toString(36).substr(2, 32);
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substr(2, 8).toUpperCase());
    }
    return codes;
  }

  private verifyTotpCode(secret: string, token: string): boolean {
    // In real implementation, use speakeasy to verify TOTP
    // For demo, accept any 6-digit code
    return /^\d{6}$/.test(token);
  }
}
