import { registerAs } from '@nestjs/config';

export default registerAs('rateLimit', () => ({
  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    connectTimeout: 10000,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
  },

  // Performance settings
  performance: {
    slidingWindowSizeMs: parseInt(process.env.RATE_LIMIT_SLIDING_WINDOW_SIZE, 10) || 60000,
    maxRequestsPerSecond: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_PER_SECOND, 10) || 100000,
    processingTimeoutMs: parseInt(process.env.RATE_LIMIT_PROCESSING_TIMEOUT_MS, 10) || 1,
  },

  // Tiered rate limits
  tiers: {
    free: {
      requestsPerMinute: parseInt(process.env.RATE_LIMIT_FREE_TIER, 10) || 10,
      requestsPerHour: 100,
      requestsPerDay: 1000,
      burstCapacity: 20,
      customEndpoints: 0,
      prioritySupport: false,
    },
    basic: {
      requestsPerMinute: parseInt(process.env.RATE_LIMIT_BASIC_TIER, 10) || 30,
      requestsPerHour: 500,
      requestsPerDay: 10000,
      burstCapacity: 50,
      customEndpoints: parseInt(process.env.MAX_CUSTOM_ENDPOINTS_BASIC, 10) || 5,
      prioritySupport: false,
    },
    premium: {
      requestsPerMinute: parseInt(process.env.RATE_LIMIT_PREMIUM_TIER, 10) || 100,
      requestsPerHour: 2000,
      requestsPerDay: 50000,
      burstCapacity: 150,
      customEndpoints: parseInt(process.env.MAX_CUSTOM_ENDPOINTS_PREMIUM, 10) || 20,
      prioritySupport: true,
    },
    enterprise: {
      requestsPerMinute: parseInt(process.env.RATE_LIMIT_ENTERPRISE_TIER, 10) || 500,
      requestsPerHour: 10000,
      requestsPerDay: 250000,
      burstCapacity: 750,
      customEndpoints: parseInt(process.env.MAX_CUSTOM_ENDPOINTS_ENTERPRISE, 10) || 100,
      prioritySupport: true,
    },
    ultimate: {
      requestsPerMinute: parseInt(process.env.RATE_LIMIT_ULTIMATE_TIER, 10) || 1000,
      requestsPerHour: 20000,
      requestsPerDay: 1000000,
      burstCapacity: 1500,
      customEndpoints: parseInt(process.env.MAX_CUSTOM_ENDPOINTS_ULTIMATE, 10) || -1, // Unlimited
      prioritySupport: true,
    },
  },

  // DDoS protection
  ddos: {
    detectionWindowMs: parseInt(process.env.DDOS_DETECTION_WINDOW_MS, 10) || 60000,
    maxRequestsPerSecond: parseInt(process.env.DDOS_MAX_REQUESTS_PER_SECOND, 10) || 100,
    maxRequestsPerMinute: parseInt(process.env.DDOS_MAX_REQUESTS_PER_MINUTE, 10) || 1000,
    blockDurationMs: parseInt(process.env.DDOS_BLOCK_DURATION_MS, 10) || 300000,
    suspiciousThreshold: parseInt(process.env.DDOS_SUSPICIOUS_THRESHOLD, 10) || 50,
    patternDetectionEnabled: process.env.DDOS_PATTERN_DETECTION_ENABLED === 'true',
  },

  // Monitoring and alerts
  monitoring: {
    warningThreshold: parseInt(process.env.RATE_LIMIT_WARNING_THRESHOLD, 10) || 80,
    criticalThreshold: parseInt(process.env.RATE_LIMIT_CRITICAL_THRESHOLD, 10) || 95,
    analyticsRetentionHours: parseInt(process.env.RATE_LIMIT_ANALYTICS_RETENTION_HOURS, 10) || 24,
    cleanupIntervalMinutes: parseInt(process.env.RATE_LIMIT_CLEANUP_INTERVAL_MINUTES, 10) || 5,
  },

  // Burst capacity
  burst: {
    multiplier: parseFloat(process.env.BURST_CAPACITY_MULTIPLIER) || 2,
    windowMs: parseInt(process.env.BURST_WINDOW_MS, 10) || 10000,
  },

  // Custom endpoints
  customEndpoints: {
    enabled: process.env.CUSTOM_ENDPOINT_LIMITS_ENABLED === 'true',
    maxEndpoints: {
      free: parseInt(process.env.MAX_CUSTOM_ENDPOINTS_FREE, 10) || 0,
      basic: parseInt(process.env.MAX_CUSTOM_ENDPOINTS_BASIC, 10) || 5,
      premium: parseInt(process.env.MAX_CUSTOM_ENDPOINTS_PREMIUM, 10) || 20,
      enterprise: parseInt(process.env.MAX_CUSTOM_ENDPOINTS_ENTERPRISE, 10) || 100,
      ultimate: parseInt(process.env.MAX_CUSTOM_ENDPOINTS_ULTIMATE, 10) || -1,
    },
  },

  // Default limits for non-authenticated requests
  defaults: {
    requestsPerMinute: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    windowMs: parseInt(process.env.RATE_LIMIT_TTL, 10) * 1000 || 60000,
  },
}));
