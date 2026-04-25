import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  MfaSetupDto,
  MfaVerifyDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body(ValidationPipe) registerDto: RegisterDto) {
    this.logger.log(`Registering new user: ${registerDto.email}`);
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body(ValidationPipe) loginDto: LoginDto) {
    this.logger.log(`Login attempt for user: ${loginDto.email}`);
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  async refreshToken(@Body(ValidationPipe) refreshTokenDto: RefreshTokenDto) {
    this.logger.log('Token refresh request');
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Request() req) {
    this.logger.log(`Logout request for user: ${req.user.id}`);
    return this.authService.logout(req.user.id);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(
    @Request() req,
    @Body(ValidationPipe) changePasswordDto: ChangePasswordDto,
  ) {
    this.logger.log(`Password change request for user: ${req.user.id}`);
    return this.authService.changePassword(req.user.id, changePasswordDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(@Body(ValidationPipe) forgotPasswordDto: ForgotPasswordDto) {
    this.logger.log(`Password reset request for: ${forgotPasswordDto.email}`);
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  async resetPassword(@Body(ValidationPipe) resetPasswordDto: ResetPasswordDto) {
    this.logger.log('Password reset with token');
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('mfa/setup')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Setup multi-factor authentication' })
  @ApiResponse({ status: 200, description: 'MFA setup initiated' })
  async setupMfa(
    @Request() req,
    @Body(ValidationPipe) mfaSetupDto: MfaSetupDto,
  ) {
    this.logger.log(`MFA setup request for user: ${req.user.id}`);
    return this.authService.setupMfa(req.user.id, mfaSetupDto);
  }

  @Post('mfa/verify')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify MFA code' })
  @ApiResponse({ status: 200, description: 'MFA verification successful' })
  async verifyMfa(
    @Request() req,
    @Body(ValidationPipe) mfaVerifyDto: MfaVerifyDto,
  ) {
    this.logger.log(`MFA verification for user: ${req.user.id}`);
    return this.authService.verifyMfa(req.user.id, mfaVerifyDto);
  }

  @Post('mfa/disable')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable multi-factor authentication' })
  @ApiResponse({ status: 200, description: 'MFA disabled successfully' })
  async disableMfa(@Request() req) {
    this.logger.log(`MFA disable request for user: ${req.user.id}`);
    return this.authService.disableMfa(req.user.id);
  }

  @Get('mfa/qr-code')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get MFA QR code' })
  @ApiResponse({ status: 200, description: 'QR code generated successfully' })
  async getMfaQrCode(@Request() req) {
    return this.authService.getMfaQrCode(req.user.id);
  }

  @Get('sessions')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get active sessions' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
  async getActiveSessions(@Request() req) {
    return this.authService.getActiveSessions(req.user.id);
  }

  @Post('sessions/revoke/:sessionId')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a session' })
  @ApiResponse({ status: 200, description: 'Session revoked successfully' })
  async revokeSession(@Request() req, @Param('sessionId') sessionId: string) {
    this.logger.log(`Session revoke request: ${sessionId} for user: ${req.user.id}`);
    return this.authService.revokeSession(req.user.id, sessionId);
  }

  @Get('oauth/:provider')
  @ApiOperation({ summary: 'Initiate OAuth login' })
  @ApiResponse({ status: 200, description: 'OAuth login initiated' })
  async oauthLogin(@Param('provider') provider: string) {
    this.logger.log(`OAuth login request for provider: ${provider}`);
    return this.authService.oauthLogin(provider);
  }

  @Get('oauth/:provider/callback')
  @ApiOperation({ summary: 'OAuth callback' })
  @ApiResponse({ status: 200, description: 'OAuth callback processed' })
  async oauthCallback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    this.logger.log(`OAuth callback for provider: ${provider}`);
    return this.authService.oauthCallback(provider, code, state);
  }

  @Get('api-keys')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get API keys' })
  @ApiResponse({ status: 200, description: 'API keys retrieved successfully' })
  async getApiKeys(@Request() req) {
    return this.authService.getApiKeys(req.user.id);
  }

  @Post('api-keys')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  async createApiKey(
    @Request() req,
    @Body() createApiKeyDto: { name: string; permissions: string[] },
  ) {
    this.logger.log(`API key creation request for user: ${req.user.id}`);
    return this.authService.createApiKey(req.user.id, createApiKeyDto);
  }

  @Delete('api-keys/:keyId')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete API key' })
  @ApiResponse({ status: 200, description: 'API key deleted successfully' })
  async deleteApiKey(@Request() req, @Param('keyId') keyId: string) {
    this.logger.log(`API key deletion request: ${keyId} for user: ${req.user.id}`);
    return this.authService.deleteApiKey(req.user.id, keyId);
  }

  @Get('audit-log')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get security audit log' })
  @ApiResponse({ status: 200, description: 'Audit log retrieved successfully' })
  async getAuditLog(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.authService.getAuditLog(req.user.id, page, limit, startDate, endDate);
  }
}
