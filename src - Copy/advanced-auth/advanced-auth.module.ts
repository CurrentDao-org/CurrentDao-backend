import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

// Entities
import { BiometricTemplate } from './entities/biometric-template.entity';
import { WebAuthnCredential } from './entities/webauthn-credential.entity';
import { DeviceFingerprint } from './entities/device-fingerprint.entity';
import { AuthenticationSession } from './entities/authentication-session.entity';
import { IdentityProvider } from './entities/identity-provider.entity';

// Services
import { AdvancedAuthService } from './advanced-auth.service';
import { BiometricAuthService } from './biometric/biometric-auth.service';
import { PasswordlessAuthService } from './passwordless/passwordless-auth.service';
import { AdaptiveAuthService } from './adaptive/adaptive-auth.service';
import { ContinuousAuthService } from './continuous/continuous-auth.service';
import { ContextualMFAService } from './contextual/contextual-mfa.service';
import { DeviceFingerprintService } from './fingerprinting/device-fingerprint.service';
import { IdentityProviderService } from './integration/identity-provider.service';

// Controllers
import { AdvancedAuthController } from './advanced-auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BiometricTemplate,
      WebAuthnCredential,
      DeviceFingerprint,
      AuthenticationSession,
      IdentityProvider,
    ]),
    HttpModule,
    ScheduleModule,
    ConfigModule,
  ],
  controllers: [AdvancedAuthController],
  providers: [
    AdvancedAuthService,
    BiometricAuthService,
    PasswordlessAuthService,
    AdaptiveAuthService,
    ContinuousAuthService,
    ContextualMFAService,
    DeviceFingerprintService,
    IdentityProviderService,
  ],
  exports: [
    AdvancedAuthService,
    BiometricAuthService,
    PasswordlessAuthService,
    AdaptiveAuthService,
    ContinuousAuthService,
    ContextualMFAService,
    DeviceFingerprintService,
    IdentityProviderService,
  ],
})
export class AdvancedAuthModule {}
