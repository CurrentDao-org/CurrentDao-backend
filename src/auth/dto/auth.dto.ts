import { IsString, IsEmail, IsNotEmpty, IsOptional, IsEnum, MinLength, MaxLength, IsArray, IsNumber, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum MfaType {
  TOTP = 'TOTP',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
}

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  TRADER = 'TRADER',
}

export class RegisterDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'JohnDoe123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be a valid international phone number',
  })
  phone?: string;

  @ApiProperty({ enum: Role, example: Role.USER, required: false })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}

export class LoginDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'JohnDoe123!' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: '123456', required: false })
  @IsString()
  @IsOptional()
  @MinLength(6)
  @MaxLength(6)
  mfaCode?: string;

  @ApiProperty({ example: 'web', required: false })
  @IsString()
  @IsOptional()
  deviceType?: string;

  @ApiProperty({ example: 'Mozilla/5.0...', required: false })
  @IsString()
  @IsOptional()
  userAgent?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class MfaSetupDto {
  @ApiProperty({ enum: MfaType, example: MfaType.TOTP })
  @IsEnum(MfaType)
  @IsNotEmpty()
  type: MfaType;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  backupCodes?: boolean;
}

export class MfaVerifyDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  code: string;

  @ApiProperty({ example: 'backup', required: false })
  @IsString()
  @IsOptional()
  type?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'JohnDoe123!' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'NewJohnDoe456!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewJohnDoe456!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword: string;
}

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Trading API Key' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: ['read:trades', 'write:orders'], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @ApiProperty({ example: 1000, required: false })
  @IsNumber()
  @IsOptional()
  rateLimit?: number;

  @ApiProperty({ example: '2024-12-31T23:59:59Z', required: false })
  @IsString()
  @IsOptional()
  expiresAt?: string;
}

export class UserResponseDto {
  @ApiProperty({ example: 'user_123' })
  id: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;

  @ApiProperty({ example: true })
  emailVerified: boolean;

  @ApiProperty({ example: false })
  mfaEnabled: boolean;

  @ApiProperty({ example: '2023-01-01T00:00:00Z' })
  createdAt: string;

  @ApiProperty({ example: '2023-01-01T00:00:00Z' })
  updatedAt: string;

  @ApiProperty({ required: false })
  lastLoginAt?: string;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;

  @ApiProperty({ example: 900 })
  expiresIn: number;

  @ApiProperty()
  user: UserResponseDto;

  @ApiProperty({ example: false, required: false })
  requiresMfa?: boolean;

  @ApiProperty({ example: ['TOTP', 'SMS'], required: false })
  availableMfaMethods?: MfaType[];
}

export class SessionDto {
  @ApiProperty({ example: 'session_123' })
  id: string;

  @ApiProperty({ example: 'web' })
  deviceType: string;

  @ApiProperty({ example: 'Mozilla/5.0...' })
  userAgent: string;

  @ApiProperty({ example: '192.168.1.1' })
  ipAddress: string;

  @ApiProperty({ example: '2023-01-01T00:00:00Z' })
  createdAt: string;

  @ApiProperty({ example: '2023-01-01T00:00:00Z' })
  lastActiveAt: string;

  @ApiProperty({ example: true })
  isActive: boolean;
}

export class ApiKeyDto {
  @ApiProperty({ example: 'api_key_123' })
  id: string;

  @ApiProperty({ example: 'Trading API Key' })
  name: string;

  @ApiProperty({ example: 'ak_live_1234567890abcdef' })
  key: string;

  @ApiProperty({ example: ['read:trades', 'write:orders'] })
  permissions: string[];

  @ApiProperty({ example: 1000 })
  rateLimit: number;

  @ApiProperty({ example: '2023-01-01T00:00:00Z' })
  createdAt: string;

  @ApiProperty({ example: '2024-12-31T23:59:59Z', required: false })
  expiresAt?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 156 })
  lastUsedDaysAgo: number;
}

export class AuditLogDto {
  @ApiProperty({ example: 'audit_123' })
  id: string;

  @ApiProperty({ example: 'LOGIN_SUCCESS' })
  action: string;

  @ApiProperty({ example: 'web' })
  resource: string;

  @ApiProperty({ example: '192.168.1.1' })
  ipAddress: string;

  @ApiProperty({ example: 'Mozilla/5.0...' })
  userAgent: string;

  @ApiProperty({ example: '2023-01-01T00:00:00Z' })
  timestamp: string;

  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ required: false })
  details?: any;

  @ApiProperty({ required: false })
  errorMessage?: string;
}
