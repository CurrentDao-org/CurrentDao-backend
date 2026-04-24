# CurrentDao Backend - Comprehensive Logging & Monitoring System

## Overview

This document describes the comprehensive logging and monitoring system implemented for the CurrentDao backend, providing ELK stack integration, real-time analytics, distributed tracing, and security monitoring capabilities.

## Architecture

### Core Components

1. **Logging Service** (`src/logging/logging.service.ts`)
   - Structured logging with correlation IDs
   - ELK stack integration (Elasticsearch, Logstash, Kibana)
   - Multiple log levels and categories
   - Automatic log parsing and indexing

2. **Correlation Service** (`src/logging/utils/correlation-id.ts`)
   - Request correlation across services
   - Distributed context propagation
   - Async context management

3. **Logging Interceptors** (`src/logging/interceptors/logging.interceptor.ts`)
   - HTTP request/response logging
   - Security event monitoring
   - Performance tracking

4. **Performance Monitor** (`src/logging/monitors/performance.monitor.ts`)
   - System metrics collection (CPU, memory, disk, network)
   - Threshold-based alerting
   - Historical data analysis

5. **Security Monitor** (`src/logging/monitors/security.monitor.ts`)
   - Threat detection and pattern matching
   - IP reputation checking
   - Rate limiting enforcement

6. **Alerting Service** (`src/logging/alerts/alerting.service.ts`)
   - Multi-channel notifications (Email, Slack, PagerDuty, Teams)
   - Rule-based alerting
   - Alert acknowledgment and escalation

7. **Distributed Tracing** (`src/tracing/opentelemetry.service.ts`)
   - OpenTelemetry integration
   - Cross-service request tracking
   - Performance bottleneck identification

## Features

### ELK Stack Integration

- **Elasticsearch**: High-performance log storage and search
- **Logstash**: Log parsing, enrichment, and routing
- **Kibana**: Real-time dashboards and visualization

### Structured Logging

- Consistent log format with correlation IDs
- Automatic log categorization and tagging
- Support for custom metadata and context

### Real-Time Analytics

- Sub-second dashboard updates
- Live log streaming and filtering
- Performance metrics visualization

### Distributed Tracing

- Request tracking across all services
- OpenTelemetry standards compliance
- Span and trace correlation

### Security Monitoring

- Threat pattern detection
- Automated security event logging
- IP reputation and rate limiting

### Performance Monitoring

- System resource monitoring
- Application performance metrics
- Threshold-based alerting

### Multi-Channel Alerting

- Email notifications
- Slack integration
- PagerDuty escalation
- Microsoft Teams alerts
- Custom webhook support

## Installation & Setup

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Elasticsearch 8.x
- Logstash 8.x
- Kibana 8.x

### Environment Variables

```bash
# ELK Stack Configuration
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
LOGSTASH_HOST=localhost
KIBANA_HOST=localhost

# Logging Configuration
LOG_LEVEL=info
SERVICE_NAME=currentdao-backend
NODE_ENV=production

# Performance Monitoring
PERFORMANCE_MONITORING_INTERVAL=30000
CPU_WARNING_THRESHOLD=70
CPU_CRITICAL_THRESHOLD=90
MEMORY_WARNING_THRESHOLD=80
MEMORY_CRITICAL_THRESHOLD=95

# Alerting Configuration
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_SMTP_HOST=smtp.gmail.com
ALERT_EMAIL_SMTP_PORT=587
ALERT_EMAIL_USERNAME=your-email@gmail.com
ALERT_EMAIL_PASSWORD=your-password
ALERT_EMAIL_TO=admin@currentdao.com

ALERT_SLACK_ENABLED=true
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
ALERT_SLACK_CHANNEL=#alerts

ALERT_PAGERDUTY_ENABLED=true
ALERT_PAGERDUTY_INTEGRATION_KEY=your-integration-key

ALERT_TEAMS_ENABLED=true
ALERT_TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/YOUR/TEAMS/WEBHOOK
```

### Docker Setup

1. **Start ELK Stack:**
```bash
docker-compose -f docker-compose.logging.yml up -d
```

2. **Verify Services:**
```bash
# Elasticsearch
curl http://localhost:9200/_cluster/health

# Kibana
curl http://localhost:5601/api/status

# Logstash
curl http://localhost:9600
```

### Application Setup

1. **Install Dependencies:**
```bash
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/instrumentation-express @opentelemetry/instrumentation-http @opentelemetry/exporter-otlp-http @opentelemetry/exporter-prometheus winston winston-elasticsearch pidusage
```

2. **Update Configuration:**
   - Configure environment variables
   - Set up Elasticsearch connection
   - Configure alert channels

3. **Start Application:**
```bash
npm run start:prod
```

## Usage

### Basic Logging

```typescript
import { LoggingService } from './logging/logging.service';

constructor(private readonly loggingService: LoggingService) {}

// Basic logging
await this.loggingService.info('User logged in', { userId: '123' });
await this.loggingService.error('Database connection failed', error);

// Structured logging
await this.loggingService.logHttpRequest('POST', '/api/users', 201, 150);
await this.loggingService.logSecurityEvent('Suspicious login attempt', 'medium', details);
await this.loggingService.logPerformanceMetrics({ response_time: 150, memory_usage: 75 });
```

### Distributed Tracing

```typescript
import { OpenTelemetryService } from './tracing/opentelemetry.service';

constructor(private readonly otelService: OpenTelemetryService) {}

// Manual span creation
const span = this.otelService.startSpan('database-query');
this.otelService.setAttributes(span, { 'db.query': 'SELECT * FROM users' });
// ... perform operation
this.otelService.endSpan(span);

// Automatic tracing with callback
await this.otelService.withSpan('user-creation', async (span) => {
  this.otelService.setAttributes(span, { 'user.id': userId });
  // ... perform operation
});

// Database operation tracing
await this.otelService.traceDatabaseOperation('select', query, async (span) => {
  // ... database operation
});

// HTTP request tracing
await this.otelService.traceHttpRequest('GET', '/api/users', async (span) => {
  // ... HTTP request
});
```

### Performance Monitoring

```typescript
import { PerformanceMonitor } from './logging/monitors/performance.monitor';

constructor(private readonly perfMonitor: PerformanceMonitor) {}

// Get current metrics
const metrics = this.perfMonitor.getLatestMetrics();
const avgMetrics = this.perfMonitor.getMetricsAverage(3600000); // Last hour

// Check health status
const health = this.perfMonitor.getHealthStatus();
if (!health.healthy) {
  console.log('Performance issues:', health.issues);
}
```

### Security Monitoring

```typescript
import { SecurityMonitor } from './logging/monitors/security.monitor';

constructor(private readonly securityMonitor: SecurityMonitor) {}

// Analyze request for threats
const result = await this.securityMonitor.analyzeRequest(
  'POST',
  '/api/users',
  headers,
  body,
  userId,
  sessionId
);

if (result.blocked) {
  // Request was blocked due to security concerns
  console.log('Blocked events:', result.events);
}

// Get security metrics
const securityMetrics = this.securityMonitor.getSecurityMetrics();
console.log('Security events:', securityMetrics.totalEvents);
```

### Alerting

```typescript
import { AlertingService } from './logging/alerts/alerting.service';

constructor(private readonly alertingService: AlertingService) {}

// Create custom alert
const alertId = await this.alertingService.createAlert(
  'custom-error',
  'high',
  'Database Connection Failed',
  'Unable to connect to primary database',
  { database: 'primary', error: error.message },
  { component: 'database-service' }
);

// Get alert metrics
const alertMetrics = this.alertingService.getAlertMetrics();
console.log('Total alerts:', alertMetrics.totalAlerts);

// Acknowledge alert
await this.alertingService.acknowledgeAlert(alertId, 'admin@currentdao.com');
```

## Kibana Dashboards

### Pre-built Dashboards

1. **Application Overview**
   - Request volume and response times
   - Error rates and status codes
   - Active users and sessions

2. **Performance Metrics**
   - CPU, memory, disk, network usage
   - Database performance
   - Cache hit rates

3. **Security Events**
   - Threat detection alerts
   - IP reputation analysis
   - Failed authentication attempts

4. **Business Analytics**
   - Transaction volumes
   - User activity patterns
   - Revenue metrics

5. **System Health**
   - Service availability
   - Alert status
   - Log volume trends

### Custom Dashboards

Create custom dashboards using the following visualizations:

- **Logs**: Discover and filter log entries
- **Metrics**: Line charts for performance data
- **Tables**: Detailed log analysis
- **Maps**: Geographic distribution of requests
- **Gauges**: Real-time system metrics

## Monitoring & Alerting Rules

### Performance Rules

- **CPU Usage > 90%**: Critical alert
- **Memory Usage > 95%**: Critical alert
- **Response Time > 5s**: High alert
- **Error Rate > 10%**: Critical alert

### Security Rules

- **SQL Injection**: Critical alert + block
- **XSS Attempts**: High alert + block
- **Brute Force**: Medium alert
- **Suspicious IP**: Low alert

### Business Rules

- **Transaction Failures**: High alert
- **High Volume Anomalies**: Medium alert
- **User Session Issues**: Low alert

## Log Retention & Archival

### Retention Policy

- **Hot Tier**: 7 days (fast access)
- **Warm Tier**: 30 days (medium access)
- **Cold Tier**: 1 year (slow access)
- **Archive**: 7 years (compliance)

### Automated Archival

```bash
# Manual archival trigger
curl -X POST "http://localhost:9200/_ilm/policy/currentdao-logs/_execute"

# Check archival status
curl "http://localhost:9200/_ilm/policy/currentdao-logs?human"
```

## Performance Optimization

### Elasticsearch Optimization

- **Index Sharding**: 3 shards per index
- **Replication**: 1 replica for production
- **Refresh Interval**: 5 seconds for real-time updates
- **Compression**: Best compression for storage efficiency

### Application Optimization

- **Bulk Logging**: Buffer and flush in batches
- **Async Processing**: Non-blocking log operations
- **Sampling**: Sample high-volume logs in production
- **Compression**: Compress log data before transmission

## Troubleshooting

### Common Issues

1. **Elasticsearch Connection Failed**
   - Check Elasticsearch service status
   - Verify network connectivity
   - Check authentication credentials

2. **High Memory Usage**
   - Increase Elasticsearch heap size
   - Optimize index settings
   - Implement log sampling

3. **Slow Dashboard Updates**
   - Check Elasticsearch cluster health
   - Optimize dashboard queries
   - Reduce time range

4. **Missing Logs**
   - Verify Logstash configuration
   - Check file permissions
   - Review log levels

### Debug Commands

```bash
# Check Elasticsearch health
curl http://localhost:9200/_cluster/health?pretty

# Check Logstash pipeline
curl http://localhost:9600/_node/stats/pipelines?pretty

# Check Kibana status
curl http://localhost:5601/api/status

# View recent logs
curl "http://localhost:9200/currentdao-logs-*/_search?size=10&sort=@timestamp:desc"

# Check index templates
curl http://localhost:9200/_template/currentdao-logs-template?pretty
```

## Security Considerations

### Data Protection

- **PII Redaction**: Automatic removal of sensitive data
- **Encryption**: TLS for all communications
- **Access Control**: Role-based access to logs
- **Audit Logging**: Track all access to log data

### Compliance

- **GDPR**: Right to be forgotten
- **SOC 2**: Security controls and monitoring
- **HIPAA**: Healthcare data protection
- **PCI DSS**: Payment card industry standards

## Scaling Guidelines

### High Volume (>1M logs/day)

- **Cluster Elasticsearch**: Multiple nodes
- **Load Balance Logstash**: Multiple instances
- **Optimize Indexing**: Bulk operations
- **Implement Sampling**: Reduce log volume

### Multi-Region Deployment

- **Geo-distributed**: Local Elasticsearch clusters
- **Log Aggregation**: Central log collection
- **Data Replication**: Cross-region sync
- **Disaster Recovery**: Backup and restore

## API Reference

### Logging Service

```typescript
class LoggingService {
  info(message: string, metadata?: any, options?: LogOptions): Promise<void>
  error(message: string, error?: any, options?: LogOptions): Promise<void>
  warn(message: string, metadata?: any, options?: LogOptions): Promise<void>
  debug(message: string, metadata?: any, options?: LogOptions): Promise<void>
  logHttpRequest(method: string, url: string, statusCode: number, responseTime: number): Promise<void>
  logSecurityEvent(event: string, severity: string, details: any): Promise<void>
  logPerformanceMetrics(metrics: any): Promise<void>
}
```

### Performance Monitor

```typescript
class PerformanceMonitor {
  getMetrics(limit?: number): PerformanceMetrics[]
  getLatestMetrics(): PerformanceMetrics | undefined
  getMetricsAverage(timeRangeMs: number): Partial<PerformanceMetrics>
  getHealthStatus(): { healthy: boolean; issues: string[] }
  updateThresholds(thresholds: Partial<PerformanceThresholds>): void
}
```

### Security Monitor

```typescript
class SecurityMonitor {
  analyzeRequest(method: string, url: string, headers: any, body?: any): Promise<{ blocked: boolean; events: SecurityEvent[] }>
  getSecurityEvents(limit?: number): SecurityEvent[]
  getSecurityMetrics(timeRangeMs?: number): SecurityMetrics
  addThreatPattern(pattern: ThreatPattern): void
}
```

### Alerting Service

```typescript
class AlertingService {
  createAlert(type: string, severity: string, title: string, message: string): Promise<string>
  getAlerts(limit?: number): Alert[]
  acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean>
  getAlertMetrics(timeRangeMs?: number): AlertMetrics
}
```

## Best Practices

### Logging

1. **Use Structured Logging**: Always include context and metadata
2. **Appropriate Log Levels**: Use correct severity levels
3. **Correlation IDs**: Always include request correlation
4. **Avoid Sensitive Data**: Never log passwords, tokens, or PII

### Monitoring

1. **Set Meaningful Thresholds**: Base on business requirements
2. **Monitor the Monitor**: Ensure monitoring system is healthy
3. **Regular Reviews**: Update rules and thresholds regularly
4. **Document Everything**: Maintain clear documentation

### Performance

1. **Batch Operations**: Use bulk logging for high volume
2. **Async Processing**: Don't block application flow
3. **Optimize Queries**: Efficient Elasticsearch queries
4. **Monitor Resources**: Track system resource usage

## Support & Maintenance

### Regular Maintenance

- **Daily**: Check system health and alert status
- **Weekly**: Review log volumes and performance
- **Monthly**: Update threat patterns and alert rules
- **Quarterly**: Review retention policies and archival

### Emergency Procedures

1. **System Outage**: Check ELK stack health first
2. **High Error Rates**: Review recent deployments
3. **Security Incident**: Check security monitoring dashboard
4. **Performance Issues**: Review performance metrics

### Contact Information

- **Technical Support**: tech-support@currentdao.com
- **Security Team**: security@currentdao.com
- **Documentation**: https://docs.currentdao.com/logging
- **Status Page**: https://status.currentdao.com

---

This comprehensive logging and monitoring system provides enterprise-grade observability for the CurrentDao backend, ensuring reliability, security, and performance at scale.
