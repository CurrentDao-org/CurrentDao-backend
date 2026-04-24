import { Injectable, Logger } from '@nestjs/common';
import { RedisProvider } from '../../cache/providers/redis.provider';

export interface DDoSMetrics {
  ip: string;
  requestCount: number;
  windowStart: number;
  windowEnd: number;
  requestsPerSecond: number;
  suspiciousPatterns: string[];
  blocked: boolean;
  blockReason?: string;
  blockExpiry?: number;
}

export interface DDoSConfig {
  detectionWindowMs: number;
  maxRequestsPerSecond: number;
  maxRequestsPerMinute: number;
  blockDurationMs: number;
  suspiciousThreshold: number;
  patternDetectionEnabled: boolean;
}

@Injectable()
export class DDoSProtectionUtil {
  private readonly logger = new Logger(DDoSProtectionUtil.name);
  
  private readonly config: DDoSConfig = {
    detectionWindowMs: 60000, // 1 minute
    maxRequestsPerSecond: 100,
    maxRequestsPerMinute: 1000,
    blockDurationMs: 300000, // 5 minutes
    suspiciousThreshold: 50,
    patternDetectionEnabled: true,
  };

  private readonly suspiciousPatterns = [
    'rapid_user_agent_switching',
    'unusual_header_combinations',
    'request_flood_pattern',
    'geographic_anomaly',
    'endpoint_abuse',
    'timing_pattern_anomaly',
  ];

  constructor(private readonly redisProvider: RedisProvider) {}

  /**
   * Analyze request for DDoS patterns and block if necessary
   * Detection within 100ms as per requirements
   */
  async analyzeRequest(
    ip: string,
    userAgent?: string,
    headers?: Record<string, string>,
    endpoint?: string,
  ): Promise<{
    allowed: boolean;
    metrics: DDoSMetrics;
    blockReason?: string;
    blockExpiry?: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Check if IP is already blocked
      const existingBlock = await this.checkExistingBlock(ip);
      if (existingBlock.blocked) {
        return {
          allowed: false,
          metrics: await this.getMetrics(ip),
          blockReason: existingBlock.reason,
          blockExpiry: existingBlock.expiry,
        };
      }

      // Record current request
      await this.recordRequest(ip, userAgent, headers, endpoint);

      // Get current metrics
      const metrics = await this.getMetrics(ip);

      // Analyze for DDoS patterns
      const analysis = await this.analyzePatterns(ip, metrics);

      // Determine if block is needed
      if (analysis.shouldBlock) {
        await this.blockIP(ip, analysis.reason);
        return {
          allowed: false,
          metrics,
          blockReason: analysis.reason,
          blockExpiry: Date.now() + this.config.blockDurationMs,
        };
      }

      const processingTime = Date.now() - startTime;
      this.logger.debug(`DDoS analysis for ${ip} completed in ${processingTime}ms`);

      return {
        allowed: true,
        metrics,
      };
    } catch (error) {
      this.logger.error(`Error in DDoS analysis for ${ip}:`, error);
      // Fail open - allow request if analysis fails
      return {
        allowed: true,
        metrics: await this.getMetrics(ip),
      };
    }
  }

  /**
   * Check if IP is already blocked
   */
  private async checkExistingBlock(ip: string): Promise<{
    blocked: boolean;
    reason?: string;
    expiry?: number;
  }> {
    try {
      const blockKey = `ddos:blocked:${ip}`;
      const blockData = await this.redisProvider.get('ddos', blockKey);
      
      if (blockData) {
        const block = JSON.parse(blockData as string);
        if (block.expiry > Date.now()) {
          return {
            blocked: true,
            reason: block.reason,
            expiry: block.expiry,
          };
        } else {
          // Block expired, clean it up
          await this.redisProvider.del('ddos', blockKey);
        }
      }
      
      return { blocked: false };
    } catch (error) {
      this.logger.warn(`Error checking existing block for ${ip}:`, error);
      return { blocked: false };
    }
  }

  /**
   * Record request for analysis
   */
  private async recordRequest(
    ip: string,
    userAgent?: string,
    headers?: Record<string, string>,
    endpoint?: string,
  ): Promise<void> {
    const timestamp = Date.now();
    const requestKey = `ddos:requests:${ip}`;
    
    try {
      // Store request data with timestamp
      const requestData = {
        timestamp,
        userAgent: userAgent || 'unknown',
        headers: headers || {},
        endpoint: endpoint || 'unknown',
      };

      // Use Redis sorted set for time-based queries
      await this.redisProvider.set('ddos', `${requestKey}:${timestamp}`, JSON.stringify(requestData), 3600);
      
      // Update request count
      await this.updateRequestCount(ip, timestamp);
      
      // Clean up old requests (older than detection window)
      await this.cleanupOldRequests(ip, timestamp - this.config.detectionWindowMs);
    } catch (error) {
      this.logger.warn(`Error recording request for ${ip}:`, error);
    }
  }

  /**
   * Update request count for rate calculations
   */
  private async updateRequestCount(ip: string, timestamp: number): Promise<void> {
    const countKey = `ddos:count:${ip}`;
    
    try {
      // Increment request count
      await this.redisProvider.set('ddos', `${countKey}:${timestamp}`, '1', 3600);
    } catch (error) {
      this.logger.warn(`Error updating request count for ${ip}:`, error);
    }
  }

  /**
   * Clean up old request data
   */
  private async cleanupOldRequests(ip: string, cutoffTime: number): Promise<void> {
    try {
      const requestKey = `ddos:requests:${ip}`;
      const countKey = `ddos:count:${ip}`;
      
      // Clean up old request records
      const oldRequests = await this.redisProvider.keys('ddos', `${requestKey}:*`);
      for (const key of oldRequests) {
        const timestamp = parseInt(key.split(':').pop() || '0');
        if (timestamp < cutoffTime) {
          await this.redisProvider.del('ddos', key);
        }
      }
      
      // Clean up old count records
      const oldCounts = await this.redisProvider.keys('ddos', `${countKey}:*`);
      for (const key of oldCounts) {
        const timestamp = parseInt(key.split(':').pop() || '0');
        if (timestamp < cutoffTime) {
          await this.redisProvider.del('ddos', key);
        }
      }
    } catch (error) {
      this.logger.warn(`Error cleaning up old requests for ${ip}:`, error);
    }
  }

  /**
   * Get current metrics for an IP
   */
  async getMetrics(ip: string): Promise<DDoSMetrics> {
    const now = Date.now();
    const windowStart = now - this.config.detectionWindowMs;
    
    try {
      const countKey = `ddos:count:${ip}`;
      const countKeys = await this.redisProvider.keys('ddos', `${countKey}:*`);
      
      let requestCount = 0;
      for (const key of countKeys) {
        const timestamp = parseInt(key.split(':').pop() || '0');
        if (timestamp >= windowStart) {
          requestCount++;
        }
      }

      const requestsPerSecond = (requestCount / this.config.detectionWindowMs) * 1000;
      const suspiciousPatterns = await this.detectSuspiciousPatterns(ip);

      // Check if currently blocked
      const blockData = await this.checkExistingBlock(ip);

      return {
        ip,
        requestCount,
        windowStart,
        windowEnd: now,
        requestsPerSecond,
        suspiciousPatterns,
        blocked: blockData.blocked,
        blockReason: blockData.reason,
        blockExpiry: blockData.expiry,
      };
    } catch (error) {
      this.logger.error(`Error getting metrics for ${ip}:`, error);
      return {
        ip,
        requestCount: 0,
        windowStart,
        windowEnd: now,
        requestsPerSecond: 0,
        suspiciousPatterns: [],
        blocked: false,
      };
    }
  }

  /**
   * Analyze patterns for DDoS detection
   */
  private async analyzePatterns(
    ip: string,
    metrics: DDoSMetrics,
  ): Promise<{
    shouldBlock: boolean;
    reason: string;
    confidence: number;
  }> {
    const reasons: string[] = [];
    let confidence = 0;

    // Check request rate thresholds
    if (metrics.requestsPerSecond > this.config.maxRequestsPerSecond) {
      reasons.push(`Exceeded max requests per second: ${metrics.requestsPerSecond.toFixed(2)}`);
      confidence += 0.4;
    }

    if (metrics.requestCount > this.config.maxRequestsPerMinute) {
      reasons.push(`Exceeded max requests per minute: ${metrics.requestCount}`);
      confidence += 0.3;
    }

    // Check suspicious patterns
    if (metrics.suspiciousPatterns.length >= this.config.suspiciousThreshold) {
      reasons.push(`Suspicious patterns detected: ${metrics.suspiciousPatterns.join(', ')}`);
      confidence += 0.3;
    }

    const shouldBlock = confidence >= 0.7; // 70% confidence threshold
    const reason = reasons.join('; ');

    return {
      shouldBlock,
      reason: reason || 'Multiple DDoS patterns detected',
      confidence,
    };
  }

  /**
   * Detect suspicious patterns in request behavior
   */
  private async detectSuspiciousPatterns(ip: string): Promise<string[]> {
    if (!this.config.patternDetectionEnabled) {
      return [];
    }

    const patterns: string[] = [];
    
    try {
      const requestKey = `ddos:requests:${ip}`;
      const requestKeys = await this.redisProvider.keys('ddos', `${requestKey}:*`);
      
      const requests: any[] = [];
      const windowStart = Date.now() - this.config.detectionWindowMs;
      
      for (const key of requestKeys) {
        const timestamp = parseInt(key.split(':').pop() || '0');
        if (timestamp >= windowStart) {
          const requestData = await this.redisProvider.get('ddos', key);
          if (requestData) {
            requests.push({ ...JSON.parse(requestData as string), timestamp });
          }
        }
      }

      // Analyze patterns
      patterns.push(...this.analyzeUserAgentPattern(requests));
      patterns.push(...this.analyzeHeaderPattern(requests));
      patterns.push(...this.analyzeEndpointPattern(requests));
      patterns.push(...this.analyzeTimingPattern(requests));
      
    } catch (error) {
      this.logger.warn(`Error detecting patterns for ${ip}:`, error);
    }

    return patterns;
  }

  /**
   * Analyze user agent switching patterns
   */
  private analyzeUserAgentPattern(requests: any[]): string[] {
    const patterns: string[] = [];
    const userAgents = new Set(requests.map(r => r.userAgent));
    
    if (userAgents.size > 5) {
      patterns.push('rapid_user_agent_switching');
    }
    
    return patterns;
  }

  /**
   * Analyze header patterns
   */
  private analyzeHeaderPattern(requests: any[]): string[] {
    const patterns: string[] = [];
    const headerCombinations = new Set();
    
    requests.forEach(req => {
      const headerKeys = Object.keys(req.headers).sort().join(',');
      headerCombinations.add(headerKeys);
    });
    
    if (headerCombinations.size > 3) {
      patterns.push('unusual_header_combinations');
    }
    
    return patterns;
  }

  /**
   * Analyze endpoint abuse patterns
   */
  private analyzeEndpointPattern(requests: any[]): string[] {
    const patterns: string[] = [];
    const endpointCounts: Record<string, number> = {};
    
    requests.forEach(req => {
      endpointCounts[req.endpoint] = (endpointCounts[req.endpoint] || 0) + 1;
    });
    
    // Check if any endpoint is being abused
    Object.entries(endpointCounts).forEach(([endpoint, count]) => {
      if (count > requests.length * 0.8) { // 80% of requests to same endpoint
        patterns.push('endpoint_abuse');
      }
    });
    
    return patterns;
  }

  /**
   * Analyze timing patterns
   */
  private analyzeTimingPattern(requests: any[]): string[] {
    const patterns: string[] = [];
    
    if (requests.length < 2) return patterns;
    
    // Sort by timestamp
    requests.sort((a, b) => a.timestamp - b.timestamp);
    
    // Check for regular intervals (bot-like behavior)
    const intervals: number[] = [];
    for (let i = 1; i < requests.length; i++) {
      intervals.push(requests[i].timestamp - requests[i - 1].timestamp);
    }
    
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // Low variance suggests bot-like regular timing
    if (stdDev < avgInterval * 0.1) {
      patterns.push('timing_pattern_anomaly');
    }
    
    return patterns;
  }

  /**
   * Block an IP address
   */
  private async blockIP(ip: string, reason: string): Promise<void> {
    const blockKey = `ddos:blocked:${ip}`;
    const blockData = {
      ip,
      reason,
      timestamp: Date.now(),
      expiry: Date.now() + this.config.blockDurationMs,
    };
    
    try {
      await this.redisProvider.set('ddos', blockKey, JSON.stringify(blockData), this.config.blockDurationMs / 1000);
      this.logger.warn(`IP ${ip} blocked due to: ${reason}`);
    } catch (error) {
      this.logger.error(`Error blocking IP ${ip}:`, error);
    }
  }

  /**
   * Unblock an IP address (admin function)
   */
  async unblockIP(ip: string): Promise<void> {
    const blockKey = `ddos:blocked:${ip}`;
    
    try {
      await this.redisProvider.del('ddos', blockKey);
      this.logger.log(`IP ${ip} unblocked`);
    } catch (error) {
      this.logger.error(`Error unblocking IP ${ip}:`, error);
    }
  }

  /**
   * Get all currently blocked IPs (admin function)
   */
  async getBlockedIPs(): Promise<Array<{ ip: string; reason: string; expiry: number }>> {
    try {
      const blockedKeys = await this.redisProvider.keys('ddos', 'ddos:blocked:*');
      const blockedIPs: Array<{ ip: string; reason: string; expiry: number }> = [];
      
      for (const key of blockedKeys) {
        const blockData = await this.redisProvider.get('ddos', key);
        if (blockData) {
          const block = JSON.parse(blockData as string);
          if (block.expiry > Date.now()) {
            blockedIPs.push({
              ip: block.ip,
              reason: block.reason,
              expiry: block.expiry,
            });
          }
        }
      }
      
      return blockedIPs;
    } catch (error) {
      this.logger.error('Error getting blocked IPs:', error);
      return [];
    }
  }

  /**
   * Update DDoS protection configuration (admin function)
   */
  updateConfig(newConfig: Partial<DDoSConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.log('DDoS protection configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): DDoSConfig {
    return { ...this.config };
  }
}
