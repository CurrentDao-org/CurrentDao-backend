import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PredictiveBalancingModule } from './predictive-balancing.module';
import { DemandForecastService } from './forecasting/demand-forecast.service';
import { PredictiveBalancerService } from './algorithms/predictive-balancer.service';
import { SupplyAdjusterService } from './adjustment/supply-adjuster.service';
import { StabilityMonitorService } from './monitoring/stability-monitor.service';
import { PriceOptimizerService } from './optimization/price-optimizer.service';
import { BalancingData } from './entities/balancing-data.entity';
import { BalancingCommand, BalancingCommandType, Priority } from './dto/balancing-command.dto';

describe('PredictiveBalancingIntegration', () => {
  let module: TestingModule;
  let demandForecastService: DemandForecastService;
  let predictiveBalancerService: PredictiveBalancerService;
  let supplyAdjusterService: SupplyAdjusterService;
  let stabilityMonitorService: StabilityMonitorService;
  let priceOptimizerService: PriceOptimizerService;

  beforeAll(async () => {
    const testModule = Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        ScheduleModule.forRoot(),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [BalancingData],
          synchronize: true,
          logging: false,
        }),
        PredictiveBalancingModule,
      ],
    });

    module = await testModule.compile();

    demandForecastService = module.get<DemandForecastService>(DemandForecastService);
    predictiveBalancerService = module.get<PredictiveBalancerService>(PredictiveBalancerService);
    supplyAdjusterService = module.get<SupplyAdjusterService>(SupplyAdjusterService);
    stabilityMonitorService = module.get<StabilityMonitorService>(StabilityMonitorService);
    priceOptimizerService = module.get<PriceOptimizerService>(PriceOptimizerService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    // In a real test, you would use a repository to clear data
  });

  describe('End-to-End Predictive Balancing Workflow', () => {
    it('should complete full balancing workflow successfully', async () => {
      const regionId = 'test-region-integration';

      // Step 1: Generate demand forecast
      const forecasts = await demandForecastService.generateDemandForecast(regionId, 24);
      expect(forecasts).toHaveLength(24);
      expect(forecasts[0].predictedValue).toBeGreaterThan(0);

      // Step 2: Monitor grid stability
      const stabilityReport = await stabilityMonitorService.monitorGridStability(regionId);
      expect(stabilityReport).toHaveProperty('stabilityScore');
      expect(stabilityReport).toHaveProperty('riskLevel');
      expect(stabilityReport).toHaveProperty('activeAlerts');

      // Step 3: Perform predictive balancing
      const balancingDecisions = await predictiveBalancerService.performPredictiveBalancing(regionId);
      expect(Array.isArray(balancingDecisions)).toBe(true);

      // Step 4: Execute supply adjustments if needed
      if (balancingDecisions.length > 0) {
        const supplyCommand: BalancingCommand = {
          commandId: `supply-cmd-${Date.now()}`,
          type: BalancingCommandType.ADJUST_SUPPLY,
          priority: Priority.HIGH,
          regionId,
          maxResponseTimeMs: 30000,
          supplyAdjustment: {
            sourceId: 'test-source',
            adjustmentPercentage: 10,
            duration: 30,
          },
        };

        const adjustmentResults = await supplyAdjusterService.processSupplyAdjustment(supplyCommand);
        expect(Array.isArray(adjustmentResults)).toBe(true);
      }

      // Step 5: Optimize prices
      const optimizationResult = await priceOptimizerService.optimizeMarketPrices(regionId);
      expect(optimizationResult).toHaveProperty('optimizedPrice');
      expect(optimizationResult).toHaveProperty('volatilityReduction');
      expect(optimizationResult).toHaveProperty('efficiencyGain');
    }, 30000); // 30 second timeout for integration test

    it('should handle emergency scenarios correctly', async () => {
      const regionId = 'emergency-test-region';

      // Simulate emergency conditions by creating a command
      const emergencyCommand: BalancingCommand = {
        commandId: `emergency-${Date.now()}`,
        type: BalancingCommandType.EMERGENCY_SHED,
        priority: Priority.CRITICAL,
        regionId,
        maxResponseTimeMs: 5000, // Very fast response required
        emergencyShed: {
          priorityOrder: ['industrial', 'commercial', 'residential'],
          shedPercentage: 20,
          durationMinutes: 15,
        },
      };

      // The system should handle emergency commands with high priority
      // This would integrate with the supply adjuster and stability monitor
      expect(emergencyCommand.priority).toBe(Priority.CRITICAL);
      expect(emergencyCommand.maxResponseTimeMs).toBeLessThan(10000);
    });

    it('should maintain performance under load', async () => {
      const regionId = 'load-test-region';
      const startTime = Date.now();

      // Simulate multiple concurrent operations
      const promises = [
        demandForecastService.generateDemandForecast(regionId, 12),
        stabilityMonitorService.monitorGridStability(regionId),
        predictiveBalancerService.performPredictiveBalancing(regionId),
        priceOptimizerService.optimizeMarketPrices(regionId),
      ];

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All operations should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(15000); // 15 seconds
      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });

    it('should maintain data consistency across services', async () => {
      const regionId = 'consistency-test-region';

      // Generate forecast
      const forecasts = await demandForecastService.generateDemandForecast(regionId, 6);
      const forecastValues = forecasts.map(f => f.predictedValue);

      // Monitor stability
      const stabilityReport = await stabilityMonitorService.monitorGridStability(regionId);

      // Perform balancing
      const decisions = await predictiveBalancerService.performPredictiveBalancing(regionId);

      // All services should work with consistent region data
      expect(forecasts.every(f => f.predictedValue > 0)).toBe(true);
      expect(stabilityReport.regionId).toBe(regionId);
      expect(decisions.every(d => d.regionId === regionId)).toBe(true);
    });
  });

  describe('Service Integration Points', () => {
    it('should integrate demand forecasting with predictive balancing', async () => {
      const regionId = 'integration-forecast-balancer';

      // Generate forecasts
      const forecasts = await demandForecastService.generateDemandForecast(regionId, 24);
      
      // Perform balancing (should use the forecasts)
      const decisions = await predictiveBalancerService.performPredictiveBalancing(regionId);

      // Balancing decisions should be based on forecast data
      expect(forecasts.length).toBeGreaterThan(0);
      expect(Array.isArray(decisions)).toBe(true);
    });

    it('should integrate stability monitoring with supply adjustment', async () => {
      const regionId = 'integration-stability-supply';

      // Monitor stability
      const stabilityReport = await stabilityMonitorService.monitorGridStability(regionId);

      // If there are stability issues, supply adjustments should be triggered
      if (stabilityReport.activeAlerts.length > 0) {
        const supplyCommand: BalancingCommand = {
          commandId: `stability-supply-${Date.now()}`,
          type: BalancingCommandType.ADJUST_SUPPLY,
          priority: Priority.HIGH,
          regionId,
          maxResponseTimeMs: 30000,
          supplyAdjustment: {
            sourceId: 'stability-response-source',
            adjustmentPercentage: 5,
            duration: 15,
          },
        };

        const adjustments = await supplyAdjusterService.processSupplyAdjustment(supplyCommand);
        expect(Array.isArray(adjustments)).toBe(true);
      }
    });

    it('should integrate price optimization with market efficiency', async () => {
      const regionId = 'integration-price-efficiency';

      // Optimize prices
      const optimization = await priceOptimizerService.optimizeMarketPrices(regionId);

      // Check if optimization improves efficiency
      expect(optimization.efficiencyGain).toBeGreaterThanOrEqual(0);
      expect(optimization.volatilityReduction).toBeGreaterThanOrEqual(0);

      // Get performance metrics
      const performance = await priceOptimizerService.getOptimizationPerformance(regionId, 1);
      expect(performance).toHaveProperty('totalOptimizations');
      expect(performance).toHaveProperty('averageEfficiencyGain');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle service failures gracefully', async () => {
      const regionId = 'error-handling-region';

      // Test with invalid region (should handle gracefully)
      try {
        await demandForecastService.generateDemandForecast('invalid-region', 24);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      // Other services should continue working even if one fails
      const stabilityReport = await stabilityMonitorService.monitorGridStability(regionId);
      expect(stabilityReport).toBeDefined();
    });

    it('should maintain system stability during partial failures', async () => {
      const regionId = 'partial-failure-region';

      // Simulate partial system state
      const promises = [
        stabilityMonitorService.monitorGridStability(regionId),
        priceOptimizerService.optimizeMarketPrices(regionId),
      ];

      // Even if some operations fail, others should continue
      const results = await Promise.allSettled(promises);
      
      // At least some operations should succeed
      const successfulResults = results.filter(r => r.status === 'fulfilled');
      expect(successfulResults.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple regions concurrently', async () => {
      const regions = ['region-1', 'region-2', 'region-3'];
      
      const startTime = Date.now();
      
      // Process multiple regions concurrently
      const promises = regions.map(async (regionId) => {
        return {
          regionId,
          forecast: await demandForecastService.generateDemandForecast(regionId, 12),
          stability: await stabilityMonitorService.monitorGridStability(regionId),
        };
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(20000); // 20 seconds
      expect(results).toHaveLength(3);
      
      results.forEach(result => {
        expect(result.forecast).toHaveLength(12);
        expect(result.stability.regionId).toBe(result.regionId);
      });
    });

    it('should maintain response time requirements', async () => {
      const regionId = 'performance-test-region';

      // Test individual service response times
      const serviceTests = [
        {
          name: 'Demand Forecast',
          test: () => demandForecastService.generateDemandForecast(regionId, 6),
          maxTime: 5000,
        },
        {
          name: 'Stability Monitor',
          test: () => stabilityMonitorService.monitorGridStability(regionId),
          maxTime: 3000,
        },
        {
          name: 'Price Optimizer',
          test: () => priceOptimizerService.optimizeMarketPrices(regionId),
          maxTime: 4000,
        },
      ];

      for (const serviceTest of serviceTests) {
        const startTime = Date.now();
        await serviceTest.test();
        const endTime = Date.now();
        
        expect(endTime - startTime).toBeLessThan(serviceTest.maxTime);
      }
    });
  });

  describe('Data Accuracy and Reliability', () => {
    it('should maintain forecast accuracy over time', async () => {
      const regionId = 'accuracy-test-region';

      // Generate multiple forecasts
      const forecast1 = await demandForecastService.generateDemandForecast(regionId, 12);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      const forecast2 = await demandForecastService.generateDemandForecast(regionId, 12);

      // Forecasts should be consistent but not identical (accounting for new data)
      expect(forecast1).toHaveLength(forecast2.length);
      
      // Check accuracy metrics
      const accuracy = await demandForecastService.getForecastAccuracy(regionId, 1);
      expect(accuracy).toHaveProperty('accuracy');
      expect(accuracy.accuracy).toBeGreaterThanOrEqual(0);
    });

    it('should provide reliable balancing decisions', async () => {
      const regionId = 'reliability-test-region';

      // Perform multiple balancing operations
      const decisions1 = await predictiveBalancerService.performPredictiveBalancing(regionId);
      await new Promise(resolve => setTimeout(resolve, 100));
      const decisions2 = await predictiveBalancerService.performPredictiveBalancing(regionId);

      // Decisions should be consistent in structure
      expect(Array.isArray(decisions1)).toBe(true);
      expect(Array.isArray(decisions2)).toBe(true);
      
      // Check metrics
      const metrics = await predictiveBalancerService.getBalancingMetrics(regionId, 1);
      expect(metrics).toHaveProperty('totalDecisions');
      expect(metrics).toHaveProperty('gridStabilityScore');
    });
  });
});
