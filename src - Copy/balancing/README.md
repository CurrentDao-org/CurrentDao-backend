# Predictive Load Balancing System

## Overview

The Predictive Load Balancing System is an advanced energy grid management solution that forecasts energy demand and automatically adjusts supply to prevent grid instability and optimize pricing. This system uses machine learning algorithms, real-time monitoring, and automated decision-making to ensure grid stability and market efficiency.

## Architecture

### Core Components

1. **Demand Forecasting Service** (`forecasting/demand-forecast.service.ts`)
   - Multiple ML algorithms (Linear Regression, Polynomial Regression, Moving Average, Seasonal Decomposition)
   - 24-hour demand forecasting with >85% accuracy requirement
   - Historical pattern analysis and confidence scoring

2. **Predictive Balancer Service** (`algorithms/predictive-balancer.service.ts`)
   - Real-time balancing decisions based on forecasts and grid state
   - Emergency response and preemptive actions
   - Priority-based decision execution

3. **Supply Adjuster Service** (`adjustment/supply-adjuster.service.ts`)
   - Automated supply adjustments within 30 seconds
   - Multiple energy source management (thermal, hydro, solar, wind, nuclear, battery)
   - Ramp rate and availability constraints

4. **Stability Monitor Service** (`monitoring/stability-monitor.service.ts`)
   - Real-time grid stability monitoring
   - 5-minute early warning system
   - Multi-parameter stability analysis (frequency, voltage, phase angle, power flow)

5. **Price Optimizer Service** (`optimization/price-optimizer.service.ts`)
   - Market price optimization
   - 20% volatility reduction target
   - Peak shaving and valley filling strategies

### Data Models

- **BalancingData Entity** (`entities/balancing-data.entity.ts`)
  - Central data model for all balancing operations
  - Supports multiple forecast types and metadata
  - Tracks adjustments and status changes

- **BalancingCommand DTO** (`dto/balancing-command.dto.ts`)
  - Command structure for all balancing operations
  - Supports emergency, supply adjustment, and price optimization commands
  - Priority-based processing

## Features

### Demand Forecasting
- **Multiple Algorithms**: Linear regression, polynomial regression, moving average, seasonal decomposition
- **High Accuracy**: >85% accuracy for 24-hour horizon
- **Feature Engineering**: Time-based features, weather data, load factors
- **Model Selection**: Automatic best model selection based on accuracy metrics

### Predictive Balancing
- **Real-time Decisions**: Continuous monitoring and adjustment
- **Emergency Response**: Critical situation handling with load shedding
- **Preemptive Actions**: Peak demand preparation
- **Optimization**: Efficiency improvements during stable periods

### Supply Adjustment
- **Fast Response**: <30 second adjustment execution
- **Multiple Sources**: Support for diverse energy sources
- **Constraint Handling**: Ramp rates, availability, capacity limits
- **Cost Optimization**: Priority-based source selection

### Stability Monitoring
- **Early Warning**: 5-minute advance instability detection
- **Comprehensive Metrics**: Frequency, voltage, phase angle, power flow, damping
- **Alert System**: Multi-severity alerting with recommendations
- **Trend Analysis**: Stability trend prediction

### Price Optimization
- **Volatility Reduction**: 20% volatility reduction target
- **Market Efficiency**: Supply-demand balance optimization
- **Strategic Pricing**: Peak shaving, valley filling, congestion management
- **Performance Tracking**: Optimization success metrics

## Installation and Setup

### Prerequisites
- Node.js 18+
- NestJS framework
- TypeORM with MySQL/PostgreSQL
- Redis for caching (optional)

### Module Installation

1. Import the `PredictiveBalancingModule` in your app module:
```typescript
import { PredictiveBalancingModule } from './balancing/predictive-balancing.module';

@Module({
  imports: [
    // ... other modules
    PredictiveBalancingModule,
  ],
})
export class AppModule {}
```

2. Configure database connection for BalancingData entity:
```typescript
TypeOrmModule.forRoot({
  entities: [BalancingData],
  // ... other configuration
})
```

### Environment Variables

```bash
# Database configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=energy_user
DATABASE_PASSWORD=energy_pass
DATABASE_NAME=energy_grid

# Balancing configuration
BALANCING_FORECAST_ACCURACY_THRESHOLD=0.85
BALANCING_RESPONSE_TIME_LIMIT=30000
BALANCING_VOLATILITY_REDUCTION_TARGET=0.2
```

## Usage

### Basic Forecasting

```typescript
import { DemandForecastService } from './balancing/forecasting/demand-forecast.service';

// Generate 24-hour demand forecast
const forecasts = await demandForecastService.generateDemandForecast('region-1', 24);

console.log(`Generated ${forecasts.length} forecast points`);
console.log(`Average confidence: ${forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length}`);
```

### Grid Balancing

```typescript
import { PredictiveBalancerService } from './balancing/algorithms/predictive-balancer.service';

// Perform predictive balancing for a region
const decisions = await predictiveBalancerService.performPredictiveBalancing('region-1');

console.log(`Generated ${decisions.length} balancing decisions`);
decisions.forEach(decision => {
  console.log(`${decision.action}: ${decision.amount}MW (${decision.priority})`);
});
```

### Supply Adjustment

```typescript
import { SupplyAdjusterService } from './balancing/adjustment/supply-adjuster.service';
import { BalancingCommand, BalancingCommandType, Priority } from './balancing/dto/balancing-command.dto';

const command: BalancingCommand = {
  commandId: 'adj-001',
  type: BalancingCommandType.ADJUST_SUPPLY,
  priority: Priority.HIGH,
  regionId: 'region-1',
  maxResponseTimeMs: 30000,
  supplyAdjustment: {
    sourceId: 'nuclear-plant-1',
    adjustmentPercentage: 10,
    duration: 30,
  },
};

const results = await supplyAdjusterService.processSupplyAdjustment(command);
console.log(`Adjustment completed: ${results[0].success ? 'Success' : 'Failed'}`);
```

### Stability Monitoring

```typescript
import { StabilityMonitorService } from './balancing/monitoring/stability-monitor.service';

// Monitor grid stability
const report = await stabilityMonitorService.monitorGridStability('region-1');

console.log(`Stability Score: ${report.stabilityScore}`);
console.log(`Risk Level: ${report.riskLevel}`);
console.log(`Active Alerts: ${report.activeAlerts.length}`);
```

### Price Optimization

```typescript
import { PriceOptimizerService } from './balancing/optimization/price-optimizer.service';

// Optimize market prices
const optimization = await priceOptimizerService.optimizeMarketPrices('market-1');

console.log(`Price change: ${(optimization.priceChange * 100).toFixed(2)}%`);
console.log(`Volatility reduction: ${(optimization.volatilityReduction * 100).toFixed(2)}%`);
console.log(`Efficiency gain: ${(optimization.efficiencyGain * 100).toFixed(2)}%`);
```

## API Endpoints

### Forecasting
- `GET /balancing/forecast/:regionId` - Get demand forecasts
- `POST /balancing/forecast/:regionId` - Generate new forecasts
- `GET /balancing/forecast/:regionId/accuracy` - Get forecast accuracy metrics

### Balancing
- `POST /balancing/:regionId/balance` - Perform predictive balancing
- `GET /balancing/:regionId/decisions` - Get balancing decisions
- `GET /balancing/:regionId/metrics` - Get balancing performance metrics

### Supply Adjustment
- `POST /balancing/:regionId/adjust` - Process supply adjustment command
- `GET /balancing/:regionId/supply-status` - Get current supply status
- `GET /balancing/:regionId/adjustment-history` - Get adjustment history

### Stability Monitoring
- `GET /balancing/:regionId/stability` - Get stability report
- `GET /balancing/:regionId/alerts` - Get active alerts
- `GET /balancing/:regionId/metrics` - Get stability metrics

### Price Optimization
- `POST /balancing/:marketId/optimize` - Optimize market prices
- `GET /balancing/:marketId/optimization-history` - Get optimization history
- `GET /balancing/:marketId/performance` - Get optimization performance

## Performance Requirements

### Response Times
- **Demand Forecasting**: <5 seconds for 24-hour forecast
- **Balancing Decisions**: <10 seconds for full analysis
- **Supply Adjustments**: <30 seconds execution time
- **Stability Monitoring**: <3 seconds for status update
- **Price Optimization**: <4 seconds for optimization

### Accuracy Targets
- **Demand Forecasting**: >85% accuracy for 24-hour horizon
- **Stability Prediction**: >95% instability prevention
- **Price Optimization**: 20% volatility reduction
- **Balancing Decisions**: >95% successful adjustments

### Scalability
- **Concurrent Regions**: Support for 100+ simultaneous regions
- **Decision Volume**: Handle 1000+ simultaneous adjustments
- **Data Volume**: Process millions of data points daily
- **Uptime**: 99.9% availability requirement

## Monitoring and Observability

### Metrics
- Forecast accuracy metrics (MAE, RMSE, MAPE)
- Balancing decision success rates
- Supply adjustment response times
- Grid stability scores
- Price optimization efficiency

### Logging
- Structured logging with correlation IDs
- Performance timing for all operations
- Error tracking and alerting
- Audit trail for all balancing actions

### Health Checks
- Service health endpoints
- Database connectivity checks
- External service dependencies
- Performance threshold monitoring

## Testing

### Unit Tests
```bash
# Run all unit tests
npm run test

# Run specific service tests
npm run test -- demand-forecast.service.spec.ts
npm run test -- predictive-balancer.service.spec.ts
```

### Integration Tests
```bash
# Run integration tests
npm run test:e2e

# Run balancing integration tests
npm run test -- predictive-balancing.integration.spec.ts
```

### Performance Tests
```bash
# Run performance tests
npm run test:performance

# Load testing
npm run test:load
```

## Security Considerations

### Data Protection
- Encrypted data storage
- Secure API authentication
- Audit logging for all operations
- Role-based access control

### System Security
- Input validation and sanitization
- Rate limiting on API endpoints
- Secure communication protocols
- Regular security updates

## Troubleshooting

### Common Issues

1. **Low Forecast Accuracy**
   - Check historical data quality
   - Verify feature engineering parameters
   - Review model selection criteria

2. **Slow Response Times**
   - Monitor database query performance
   - Check resource utilization
   - Review algorithm complexity

3. **Balancing Decision Failures**
   - Verify supply source availability
   - Check constraint parameters
   - Review priority configuration

4. **Stability Monitoring Alerts**
   - Verify sensor data quality
   - Check threshold configurations
   - Review grid topology data

### Debug Mode
Enable debug logging for detailed troubleshooting:
```typescript
// In environment
LOG_LEVEL=debug

// In code
import { Logger } from '@nestjs/common';
const logger = new Logger('PredictiveBalancing');
logger.debug('Debug information');
```

## Contributing

### Development Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up database: `npm run db:setup`
4. Run tests: `npm test`

### Code Standards
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- 90%+ test coverage requirement

### Pull Request Process
1. Create feature branch
2. Implement changes with tests
3. Ensure test coverage >90%
4. Submit pull request with description

## License

This project is licensed under the UNLICENSED license - see the LICENSE file for details.

## Support

For technical support and questions:
- Create an issue in the project repository
- Contact the development team
- Check the troubleshooting guide
- Review the API documentation
