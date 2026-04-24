import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { RateLimitService, UsageAnalytics } from './rate-limit.service';
import { RateLimit } from './decorators/rate-limit.decorator';
import { SubscriptionTier } from './strategies/tiered-limits.strategy';
import { AdminRateLimit } from './decorators/rate-limit.decorator';

export interface ResetRateLimitDto {
  identifier: string;
  reason?: string;
}

export interface UpdateConfigDto {
  defaultLimits?: {
    free?: { requestsPerMinute?: number; requestsPerHour?: number; requestsPerDay?: number };
    basic?: { requestsPerMinute?: number; requestsPerHour?: number; requestsPerDay?: number };
    premium?: { requestsPerMinute?: number; requestsPerHour?: number; requestsPerDay?: number };
    enterprise?: { requestsPerMinute?: number; requestsPerHour?: number; requestsPerDay?: number };
    ultimate?: { requestsPerMinute?: number; requestsPerHour?: number; requestsPerDay?: number };
  };
  ddosConfig?: {
    detectionWindowMs?: number;
    maxRequestsPerSecond?: number;
    maxRequestsPerMinute?: number;
    blockDurationMs?: number;
    suspiciousThreshold?: number;
    patternDetectionEnabled?: boolean;
  };
}

@ApiTags('Rate Limiting')
@Controller('rate-limit')
export class RateLimitController {
  constructor(private readonly rateLimitService: RateLimitService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get current rate limit status for authenticated user' })
  @ApiResponse({ status: 200, description: 'Rate limit status retrieved successfully' })
  @RateLimit({ limit: 20, windowMs: 60000 })
  async getUserRateLimitStatus(@Request() req): Promise<{
    identifier: string;
    tier?: SubscriptionTier;
    limits: any;
    currentUsage: UsageAnalytics;
    remaining: number;
    resetTime: number;
    warnings: any[];
  }> {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const identifier = `user:${user.id}`;
    
    // Get user's tier limits
    const tierLimits = await this.rateLimitService.getTierLimits(user.id);
    
    // Get current usage
    const currentUsage = await this.rateLimitService.getUsageStats(identifier);
    
    // Calculate remaining requests
    const remaining = Math.max(0, tierLimits.requestsPerMinute - currentUsage.totalRequests);
    
    // Get recent warnings
    const warnings = await this.rateLimitService.getRecentWarnings(10);
    const userWarnings = warnings.filter(w => w.identifier === identifier);
    
    return {
      identifier,
      tier: currentUsage.tier,
      limits: tierLimits,
      currentUsage,
      remaining,
      resetTime: Date.now() + 60000, // Next minute
      warnings: userWarnings,
    };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get detailed usage analytics for user' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @RateLimit({ limit: 10, windowMs: 60000 })
  async getUserAnalytics(@Request() req): Promise<UsageAnalytics> {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const identifier = `user:${user.id}`;
    return this.rateLimitService.getUsageStats(identifier);
  }

  @Get('tier-limits')
  @ApiOperation({ summary: 'Get rate limits for all subscription tiers' })
  @ApiResponse({ status: 200, description: 'Tier limits retrieved successfully' })
  @PublicRateLimit()
  async getTierLimits(): Promise<{
    tiers: Array<{ tier: SubscriptionTier; limits: any }>;
  }> {
    const tierConfigs = await this.rateLimitService.getTierLimits?.('demo') || {};
    
    return {
      tiers: Object.values(SubscriptionTier).map(tier => ({
        tier,
        limits: tierConfigs,
      })),
    };
  }

  @Get('global-stats')
  @ApiOperation({ summary: 'Get global rate limiting statistics (admin only)' })
  @ApiResponse({ status: 200, description: 'Global statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @AdminRateLimit()
  async getGlobalStats(): Promise<{
    totalActiveKeys: number;
    totalWarnings: number;
    blockedIPs: number;
    averageRequestsPerSecond: number;
    tierDistribution: Record<SubscriptionTier, number>;
  }> {
    return this.rateLimitService.getGlobalStats();
  }

  @Get('warnings')
  @ApiOperation({ summary: 'Get recent rate limit warnings (admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of warnings to return' })
  @ApiResponse({ status: 200, description: 'Warnings retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @AdminRateLimit()
  async getRecentWarnings(@Query('limit') limit = 100): Promise<any[]> {
    return this.rateLimitService.getRecentWarnings(limit);
  }

  @Get('blocked-ips')
  @ApiOperation({ summary: 'Get all currently blocked IPs (admin only)' })
  @ApiResponse({ status: 200, description: 'Blocked IPs retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @AdminRateLimit()
  async getBlockedIPs(): Promise<Array<{ ip: string; reason: string; expiry: number }>> {
    return this.rateLimitService.getBlockedIPs();
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset rate limit for a specific identifier (admin only)' })
  @ApiResponse({ status: 200, description: 'Rate limit reset successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @AdminRateLimit()
  async resetRateLimit(@Body() resetDto: ResetRateLimitDto): Promise<{
    message: string;
    identifier: string;
    timestamp: number;
  }> {
    await this.rateLimitService.resetRateLimit(resetDto.identifier);
    
    return {
      message: 'Rate limit reset successfully',
      identifier: resetDto.identifier,
      timestamp: Date.now(),
    };
  }

  @Post('unblock-ip')
  @ApiOperation({ summary: 'Unblock an IP address (admin only)' })
  @ApiParam({ name: 'ip', description: 'IP address to unblock' })
  @ApiResponse({ status: 200, description: 'IP unblocked successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @AdminRateLimit()
  async unblockIP(@Param('ip') ip: string): Promise<{
    message: string;
    ip: string;
    timestamp: number;
  }> {
    await this.rateLimitService.unblockIP(ip);
    
    return {
      message: 'IP unblocked successfully',
      ip,
      timestamp: Date.now(),
    };
  }

  @Post('update-config')
  @ApiOperation({ summary: 'Update rate limiting configuration (admin only)' })
  @ApiResponse({ status: 200, description: 'Configuration updated successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @AdminRateLimit()
  async updateConfiguration(@Body() configDto: UpdateConfigDto): Promise<{
    message: string;
    updatedAt: number;
  }> {
    await this.rateLimitService.updateConfiguration(configDto);
    
    return {
      message: 'Rate limiting configuration updated successfully',
      updatedAt: Date.now(),
    };
  }

  @Get('ddos-metrics/:ip')
  @ApiOperation({ summary: 'Get DDoS protection metrics for an IP (admin only)' })
  @ApiParam({ name: 'ip', description: 'IP address to check' })
  @ApiResponse({ status: 200, description: 'DDoS metrics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @AdminRateLimit()
  async getDDoSMetrics(@Param('ip') ip: string): Promise<any> {
    return this.rateLimitService.getDDoSMetrics(ip);
  }

  @Get('usage-percentage')
  @ApiOperation({ summary: 'Get usage percentage for monitoring' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'User ID (defaults to authenticated user)' })
  @ApiQuery({ name: 'requestType', required: false, type: String, enum: ['minute', 'hour', 'day'], description: 'Request type' })
  @ApiResponse({ status: 200, description: 'Usage percentage retrieved successfully' })
  @RateLimit({ limit: 30, windowMs: 60000 })
  async getUsagePercentage(
    @Request() req,
    @Query('userId') userId?: string,
    @Query('requestType') requestType: 'minute' | 'hour' | 'day' = 'minute',
  ): Promise<{
    percentage: number;
    tier: SubscriptionTier;
    limit: number;
    warningThreshold: number;
    criticalThreshold: number;
  }> {
    const targetUserId = userId || req.user?.id;
    
    if (!targetUserId) {
      throw new BadRequestException('User ID required');
    }

    // Get current usage
    const identifier = `user:${targetUserId}`;
    const usage = await this.rateLimitService.getUsageStats(identifier);
    
    return this.rateLimitService.getUsagePercentage(targetUserId, requestType, usage.totalRequests);
  }

  @Get('burst-capacity')
  @ApiOperation({ summary: 'Check burst capacity for user' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'User ID (defaults to authenticated user)' })
  @ApiResponse({ status: 200, description: 'Burst capacity checked successfully' })
  @RateLimit({ limit: 20, windowMs: 60000 })
  async checkBurstCapacity(
    @Request() req,
    @Query('userId') userId?: string,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    burstLimit: number;
  }> {
    const targetUserId = userId || req.user?.id;
    
    if (!targetUserId) {
      throw new BadRequestException('User ID required');
    }

    // Get current usage
    const identifier = `user:${targetUserId}`;
    const usage = await this.rateLimitService.getUsageStats(identifier);
    
    return this.rateLimitService.checkBurstCapacity(targetUserId, usage.burstUsage);
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check for rate limiting system' })
  @ApiResponse({ status: 200, description: 'Rate limiting system is healthy' })
  @PublicRateLimit()
  async healthCheck(): Promise<{
    status: 'healthy';
    timestamp: number;
    uptime: number;
    activeConnections: number;
    memoryUsage: NodeJS.MemoryUsage;
  }> {
    return {
      status: 'healthy',
      timestamp: Date.now(),
      uptime: process.uptime(),
      activeConnections: 0, // Would be tracked in production
      memoryUsage: process.memoryUsage(),
    };
  }

  @Get('test')
  @ApiOperation({ summary: 'Test rate limiting functionality' })
  @ApiResponse({ status: 200, description: 'Rate limiting test completed' })
  @StrictRateLimit({ limit: 5, windowMs: 60000 })
  async testRateLimit(@Request() req): Promise<{
    message: string;
    identifier: string;
    timestamp: number;
    testPassed: boolean;
  }> {
    const identifier = req.ip ? `ip:${req.ip}` : 'test';
    
    return {
      message: 'Rate limiting test endpoint',
      identifier,
      timestamp: Date.now(),
      testPassed: true,
    };
  }
}
