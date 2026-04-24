import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggingService } from '../logging.service';
import { CorrelationService } from '../utils/correlation-id';

export interface SecurityEvent {
  timestamp: Date;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: {
    ip: string;
    userAgent?: string;
    userId?: string;
    sessionId?: string;
  };
  details: Record<string, any>;
  context?: any;
  blocked?: boolean;
}

export interface ThreatPattern {
  id: string;
  name: string;
  description: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'injection' | 'xss' | 'traversal' | 'dos' | 'brute_force' | 'reconnaissance' | 'other';
  action: 'log' | 'block' | 'alert' | 'quarantine';
}

export interface SecurityMetrics {
  timestamp: Date;
  totalEvents: number;
  eventsBySeverity: Record<string, number>;
  eventsByType: Record<string, number>;
  eventsByCategory: Record<string, number>;
  blockedRequests: number;
  topOffenders: Array<{
    ip: string;
    count: number;
    lastSeen: Date;
  }>;
  recentThreats: SecurityEvent[];
}

@Injectable()
export class SecurityMonitor implements OnModuleInit {
  private readonly logger = new Logger(SecurityMonitor.name);
  private readonly securityEvents: SecurityEvent[] = [];
  private readonly maxEventsHistory = 10000;
  private readonly threatPatterns: ThreatPattern[] = [];
  private readonly ipReputationCache = new Map<string, { score: number; lastUpdated: Date }>();
  private readonly rateLimitCache = new Map<string, { count: number; resetTime: Date }>();

  constructor(
    private readonly configService: ConfigService,
    private readonly loggingService: LoggingService,
    private readonly correlationService: CorrelationService,
  ) {
    this.initializeThreatPatterns();
  }

  async onModuleInit() {
    this.logger.log('Initializing security monitor');
    this.logger.log(`Loaded ${this.threatPatterns.length} threat patterns`);
    this.logger.log('Security monitor initialized');
  }

  private initializeThreatPatterns(): void {
    this.threatPatterns = [
      // SQL Injection patterns
      {
        id: 'sql-injection-1',
        name: 'SQL Injection - UNION SELECT',
        description: 'Detects SQL injection attempts using UNION SELECT',
        pattern: /union\s+select/i,
        severity: 'high',
        category: 'injection',
        action: 'block',
      },
      {
        id: 'sql-injection-2',
        name: 'SQL Injection - OR 1=1',
        description: 'Detects classic SQL injection pattern',
        pattern: /or\s+1\s*=\s*1/i,
        severity: 'high',
        category: 'injection',
        action: 'block',
      },
      {
        id: 'sql-injection-3',
        name: 'SQL Injection - DROP TABLE',
        description: 'Detects SQL DROP TABLE attempts',
        pattern: /drop\s+table/i,
        severity: 'critical',
        category: 'injection',
        action: 'block',
      },

      // XSS patterns
      {
        id: 'xss-1',
        name: 'XSS - Script Tag',
        description: 'Detects script tag injection',
        pattern: /<script[^>]*>/i,
        severity: 'high',
        category: 'xss',
        action: 'block',
      },
      {
        id: 'xss-2',
        name: 'XSS - JavaScript Protocol',
        description: 'Detects JavaScript protocol injection',
        pattern: /javascript:/i,
        severity: 'medium',
        category: 'xss',
        action: 'alert',
      },
      {
        id: 'xss-3',
        name: 'XSS - OnEvent Handler',
        description: 'Detects event handler injection',
        pattern: /on\w+\s*=/i,
        severity: 'medium',
        category: 'xss',
        action: 'alert',
      },

      // Path Traversal patterns
      {
        id: 'path-traversal-1',
        name: 'Path Traversal - ../',
        description: 'Detects directory traversal attempts',
        pattern: /\.\.[\/\\]/,
        severity: 'high',
        category: 'traversal',
        action: 'block',
      },
      {
        id: 'path-traversal-2',
        name: 'Path Traversal - %2e%2e',
        description: 'Detects URL-encoded directory traversal',
        pattern: /%2e%2e[\/\\]/i,
        severity: 'high',
        category: 'traversal',
        action: 'block',
      },

      // Command Injection patterns
      {
        id: 'command-injection-1',
        name: 'Command Injection - ;',
        description: 'Detects command separator injection',
        pattern: /;\s*(rm|del|format|shutdown|reboot)/i,
        severity: 'critical',
        category: 'injection',
        action: 'block',
      },
      {
        id: 'command-injection-2',
        name: 'Command Injection - |',
        description: 'Detects pipe command injection',
        pattern: /\|\s*(nc|netcat|wget|curl)/i,
        severity: 'critical',
        category: 'injection',
        action: 'block',
      },

      // reconnaissance patterns
      {
        id: 'recon-1',
        name: 'Reconnaissance - Nmap',
        description: 'Detects Nmap user agent',
        pattern: /nmap/i,
        severity: 'low',
        category: 'reconnaissance',
        action: 'log',
      },
      {
        id: 'recon-2',
        name: 'Reconnaissance - SQLMap',
        description: 'Detects SQLMap tool',
        pattern: /sqlmap/i,
        severity: 'medium',
        category: 'reconnaissance',
        action: 'block',
      },
      {
        id: 'recon-3',
        name: 'Reconnaissance - Nikto',
        description: 'Detects Nikto scanner',
        pattern: /nikto/i,
        severity: 'medium',
        category: 'reconnaissance',
        action: 'block',
      },

      // DoS patterns
      {
        id: 'dos-1',
        name: 'DoS - Large Request',
        description: 'Detects unusually large requests',
        pattern: /.{10000,}/, // Very long strings
        severity: 'medium',
        category: 'dos',
        action: 'alert',
      },
    ];
  }

  async analyzeRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: any,
    userId?: string,
    sessionId?: string,
  ): Promise<{ blocked: boolean; events: SecurityEvent[] }> {
    const clientIP = this.getClientIP(headers);
    const userAgent = headers['user-agent'] || 'Unknown';
    const events: SecurityEvent[] = [];
    let blocked = false;

    // Check rate limiting
    const rateLimitResult = this.checkRateLimit(clientIP);
    if (rateLimitResult.blocked) {
      const event = await this.createSecurityEvent(
        'rate_limit_exceeded',
        'medium',
        clientIP,
        userAgent,
        userId,
        sessionId,
        {
          requestCount: rateLimitResult.count,
          limit: rateLimitResult.limit,
          window: rateLimitResult.window,
        },
      );
      events.push(event);
      blocked = true;
    }

    // Check IP reputation
    const ipReputation = this.checkIPReputation(clientIP);
    if (ipReputation.score < -50) {
      const event = await this.createSecurityEvent(
        'malicious_ip_detected',
        'high',
        clientIP,
        userAgent,
        userId,
        sessionId,
        {
          reputationScore: ipReputation.score,
          source: ipReputation.source,
        },
      );
      events.push(event);
      blocked = true;
    }

    // Analyze URL
    const urlEvents = this.analyzeString(url, 'url', clientIP, userAgent, userId, sessionId);
    events.push(...urlEvents);

    // Analyze headers
    const headerEvents = this.analyzeHeaders(headers, clientIP, userAgent, userId, sessionId);
    events.push(...headerEvents);

    // Analyze body if present
    if (body) {
      const bodyEvents = this.analyzeBody(body, clientIP, userAgent, userId, sessionId);
      events.push(...bodyEvents);
    }

    // Apply blocking based on threat patterns
    for (const event of events) {
      if (event.blocked) {
        blocked = true;
      }
    }

    // Log all security events
    for (const event of events) {
      await this.logSecurityEvent(event);
    }

    return { blocked, events };
  }

  private analyzeString(
    input: string,
    context: string,
    clientIP: string,
    userAgent: string,
    userId?: string,
    sessionId?: string,
  ): SecurityEvent[] {
    const events: SecurityEvent[] = [];

    for (const pattern of this.threatPatterns) {
      if (pattern.pattern.test(input)) {
        const event = {
          timestamp: new Date(),
          type: pattern.name,
          severity: pattern.severity,
          source: {
            ip: clientIP,
            userAgent,
            userId,
            sessionId,
          },
          details: {
            pattern: pattern.id,
            context,
            matchedText: input.match(pattern.pattern)?.[0],
            category: pattern.category,
          },
          blocked: pattern.action === 'block',
        };
        events.push(event);
      }
    }

    return events;
  }

  private analyzeHeaders(
    headers: Record<string, string>,
    clientIP: string,
    userAgent: string,
    userId?: string,
    sessionId?: string,
  ): SecurityEvent[] {
    const events: SecurityEvent[] = [];

    // Check for suspicious headers
    const suspiciousHeaders = [
      { name: 'x-forwarded-for', pattern: /^10\.|^192\.168\.|^172\.(1[6-9]|2[0-9]|3[01])\./ },
      { name: 'x-real-ip', pattern: /^10\.|^192\.168\.|^172\.(1[6-9]|2[0-9]|3[01])\./ },
    ];

    for (const header of suspiciousHeaders) {
      const value = headers[header.name.toLowerCase()];
      if (value && header.pattern.test(value)) {
        events.push({
          timestamp: new Date(),
          type: 'suspicious_header',
          severity: 'low',
          source: {
            ip: clientIP,
            userAgent,
            userId,
            sessionId,
          },
          details: {
            header: header.name,
            value,
            reason: 'Private IP in public header',
          },
          blocked: false,
        });
      }
    }

    return events;
  }

  private analyzeBody(
    body: any,
    clientIP: string,
    userAgent: string,
    userId?: string,
    sessionId?: string,
  ): SecurityEvent[] {
    const events: SecurityEvent[] = [];

    if (typeof body === 'string') {
      const stringEvents = this.analyzeString(body, 'body', clientIP, userAgent, userId, sessionId);
      events.push(...stringEvents);
    } else if (typeof body === 'object') {
      // Recursively analyze object properties
      const analyzeObject = (obj: any, path: string = '') => {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          
          if (typeof value === 'string') {
            const stringEvents = this.analyzeString(value, `body.${currentPath}`, clientIP, userAgent, userId, sessionId);
            events.push(...stringEvents);
          } else if (typeof value === 'object' && value !== null) {
            analyzeObject(value, currentPath);
          }
        }
      };
      
      analyzeObject(body);
    }

    return events;
  }

  private checkRateLimit(ip: string): { blocked: boolean; count: number; limit: number; window: number } {
    const now = new Date();
    const windowMs = 60000; // 1 minute window
    const limit = 100; // 100 requests per minute
    const resetTime = new Date(now.getTime() + windowMs);

    const current = this.rateLimitCache.get(ip);
    
    if (!current || now > current.resetTime) {
      this.rateLimitCache.set(ip, { count: 1, resetTime });
      return { blocked: false, count: 1, limit, window: windowMs / 1000 };
    }

    current.count++;
    
    if (current.count > limit) {
      return { blocked: true, count: current.count, limit, window: windowMs / 1000 };
    }

    return { blocked: false, count: current.count, limit, window: windowMs / 1000 };
  }

  private checkIPReputation(ip: string): { score: number; source?: string } {
    const cached = this.ipReputationCache.get(ip);
    const now = new Date();
    
    if (cached && (now.getTime() - cached.lastUpdated.getTime()) < 3600000) { // 1 hour cache
      return cached;
    }

    // In a real implementation, you would query an IP reputation service
    // For now, return a neutral score
    const score = 0;
    
    this.ipReputationCache.set(ip, { score, lastUpdated: now });
    return { score };
  }

  private getClientIP(headers: Record<string, string>): string {
    return (
      headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      headers['x-real-ip'] ||
      headers['x-client-ip'] ||
      'unknown'
    );
  }

  private async createSecurityEvent(
    type: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    ip: string,
    userAgent: string,
    userId?: string,
    sessionId?: string,
    details?: Record<string, any>,
  ): Promise<SecurityEvent> {
    return {
      timestamp: new Date(),
      type,
      severity,
      source: {
        ip,
        userAgent,
        userId,
        sessionId,
      },
      details: details || {},
      blocked: severity === 'critical' || severity === 'high',
    };
  }

  private async logSecurityEvent(event: SecurityEvent): Promise<void> {
    // Store event
    this.securityEvents.push(event);
    
    // Keep only recent events
    if (this.securityEvents.length > this.maxEventsHistory) {
      this.securityEvents.shift();
    }

    // Log to logging service
    await this.loggingService.logSecurityEvent(
      event.type,
      event.severity,
      {
        ...event.details,
        ip: event.source.ip,
        userAgent: event.source.userAgent,
        userId: event.source.userId,
        sessionId: event.source.sessionId,
        blocked: event.blocked,
      },
      {
        service_name: 'currentdao-backend',
        environment: process.env.NODE_ENV || 'development',
        component: 'security-monitor',
        function: 'logSecurityEvent',
        ...this.correlationService.getLogContext(),
      },
    );
  }

  // Public API methods
  getSecurityEvents(limit?: number, severity?: string): SecurityEvent[] {
    let events = [...this.securityEvents];
    
    if (severity) {
      events = events.filter(e => e.severity === severity);
    }
    
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? events.slice(0, limit) : events;
  }

  getSecurityMetrics(timeRangeMs?: number): SecurityMetrics {
    const cutoffTime = timeRangeMs ? new Date(Date.now() - timeRangeMs) : new Date(0);
    const recentEvents = this.securityEvents.filter(e => e.timestamp >= cutoffTime);

    const eventsBySeverity: Record<string, number> = {};
    const eventsByType: Record<string, number> = {};
    const eventsByCategory: Record<string, number> = {};
    const ipCounts = new Map<string, { count: number; lastSeen: Date }>();

    let blockedRequests = 0;

    for (const event of recentEvents) {
      // Count by severity
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;

      // Count by type
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;

      // Count by category
      const category = event.details?.category || 'other';
      eventsByCategory[category] = (eventsByCategory[category] || 0) + 1;

      // Count blocked requests
      if (event.blocked) {
        blockedRequests++;
      }

      // Track IP counts
      const ip = event.source.ip;
      const current = ipCounts.get(ip) || { count: 0, lastSeen: event.timestamp };
      current.count++;
      current.lastSeen = event.timestamp > current.lastSeen ? event.timestamp : current.lastSeen;
      ipCounts.set(ip, current);
    }

    // Get top offenders
    const topOffenders = Array.from(ipCounts.entries())
      .map(([ip, data]) => ({ ip, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get recent threats (last 24 hours)
    const recentThreats = recentEvents
      .filter(e => e.severity === 'high' || e.severity === 'critical')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50);

    return {
      timestamp: new Date(),
      totalEvents: recentEvents.length,
      eventsBySeverity,
      eventsByType,
      eventsByCategory,
      blockedRequests,
      topOffenders,
      recentThreats,
    };
  }

  addThreatPattern(pattern: ThreatPattern): void {
    this.threatPatterns.push(pattern);
    this.logger.log(`Added new threat pattern: ${pattern.name}`);
  }

  removeThreatPattern(patternId: string): boolean {
    const index = this.threatPatterns.findIndex(p => p.id === patternId);
    if (index !== -1) {
      this.threatPatterns.splice(index, 1);
      this.logger.log(`Removed threat pattern: ${patternId}`);
      return true;
    }
    return false;
  }

  getThreatPatterns(): ThreatPattern[] {
    return [...this.threatPatterns];
  }

  updateIPReputation(ip: string, score: number, source?: string): void {
    this.ipReputationCache.set(ip, {
      score,
      lastUpdated: new Date(),
      source,
    });
  }

  clearCache(): void {
    this.ipReputationCache.clear();
    this.rateLimitCache.clear();
    this.logger.log('Security monitor caches cleared');
  }

  getHealthStatus(): {
    healthy: boolean;
    issues: string[];
    metrics?: SecurityMetrics;
  } {
    const metrics = this.getSecurityMetrics(3600000); // Last hour
    const issues: string[] = [];

    if (metrics.blockedRequests > 100) {
      issues.push(`High number of blocked requests: ${metrics.blockedRequests} in the last hour`);
    }

    const criticalEvents = metrics.eventsBySeverity.critical || 0;
    if (criticalEvents > 5) {
      issues.push(`High number of critical security events: ${criticalEvents} in the last hour`);
    }

    const highEvents = metrics.eventsBySeverity.high || 0;
    if (highEvents > 20) {
      issues.push(`High number of high-severity security events: ${highEvents} in the last hour`);
    }

    return {
      healthy: issues.length === 0,
      issues,
      metrics,
    };
  }
}
