# Transaction Monitoring System

A comprehensive transaction monitoring system for Stellar transactions that provides real-time tracking, intelligent retry logic, and multi-channel alerting.

## Features

### Real-time Monitoring
- Polls Stellar network every 5 seconds for transaction status
- Tracks transactions from submission to final confirmation
- Handles 1000+ concurrent transactions efficiently

### Status Tracking
- **PENDING** - Transaction submitted, awaiting confirmation
- **CONFIRMED** - Transaction successfully confirmed on network
- **FAILED** - Transaction failed (will retry if eligible)
- **RETRYING** - Transaction is being retried
- **TIMEOUT** - Transaction timed out after 5 minutes

### Intelligent Retry Logic
- **Exponential Backoff** - For high-priority transactions
- **Linear Backoff** - For standard transactions
- Transient vs non-transient error detection
- Configurable retry limits per transaction

### Alert System
- **Email** alerts for medium-high severity issues
- **Slack** alerts for high-critical severity issues
- **Webhook** alerts for critical failures
- Rate limiting to prevent spam

### Analytics & Reporting
- Success/failure rates
- Average confirmation times
- Hourly performance statistics
- Transaction volume analytics

## API Endpoints

### Transaction Management
- `POST /monitoring/transactions` - Create transaction monitor
- `GET /monitoring/transactions/:hash` - Get transaction status
- `GET /monitoring/transactions` - List transactions with filters

### Analytics
- `GET /monitoring/analytics` - Get transaction analytics
- `GET /monitoring/stats` - Get monitoring statistics

## Usage Examples

### Create Transaction Monitor
```typescript
const transaction = await monitoringService.createTransaction({
  transactionHash: 'abc123...',
  priority: TransactionPriority.HIGH,
  sourceAccount: 'GD...',
  destinationAccount: 'GD...',
  amount: 100,
  assetCode: 'XLM',
  maxRetries: 3
});
```

### Get Transaction Status
```typescript
const status = await monitoringService.getTransaction('abc123...');
console.log(status.status); // PENDING | CONFIRMED | FAILED | RETRYING | TIMEOUT
```

### Get Analytics
```typescript
const analytics = await monitoringService.getTransactionAnalytics('day');
console.log(analytics.successRate); // 95.5
console.log(analytics.averageConfirmationTime); // 12.3 seconds
```

## Configuration

### Environment Variables
- `STELLAR_HORIZON_URL` - Stellar Horizon server URL
- `ALERT_EMAIL_ENABLED` - Enable email alerts
- `ALERT_SLACK_ENABLED` - Enable Slack alerts
- `ALERT_WEBHOOK_ENABLED` - Enable webhook alerts

### Database Setup
The system requires a MySQL database with the `transaction_status` table. The entity is automatically created by TypeORM.

## Performance

### Scalability
- Handles 1000+ concurrent transactions
- Memory-efficient monitoring maps
- Database indexes for fast queries

### Reliability
- Automatic cleanup of old transactions
- Network partition handling
- Graceful degradation

## Monitoring Procedures

### Daily Maintenance
- Automatic archiving of transactions older than 1 year
- Cleanup of expired transactions
- Performance metrics collection

### Alert Response
1. **Critical alerts** - Immediate investigation required
2. **High alerts** - Investigate within 1 hour
3. **Medium alerts** - Investigate within 4 hours
4. **Low alerts** - Log for trend analysis

## Troubleshooting

### Common Issues
1. **Transactions stuck in PENDING** - Check network connectivity
2. **High failure rate** - Review retry configuration
3. **Missing alerts** - Verify alert channel configuration

### Debug Mode
Enable debug logging by setting `LOG_LEVEL=debug` in environment variables.

## Architecture

### Components
- **TransactionMonitorService** - Core monitoring logic
- **RetryService** - Intelligent retry management
- **AlertService** - Multi-channel alerting
- **TransactionWorkflowService** - Workflow orchestration

### Data Flow
1. Transaction submitted → Monitor created
2. Network polling → Status updates
3. Failure detection → Retry scheduling
4. Retry exhaustion → Alert generation
5. Success/Timeout → Monitor cleanup
