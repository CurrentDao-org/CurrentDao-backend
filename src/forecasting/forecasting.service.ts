import { Injectable } from '@nestjs/common';
import { DemandForecastService } from './demand/demand-forecast.service';
import { SupplyForecastService } from './supply/supply-forecast.service';
import { WeatherIntegrationService } from './weather/weather-integration.service';
import { AccuracyTrackingService } from './accuracy/accuracy-tracking.service';
import { TradingIntegrationService } from './integration/trading-integration.service';

export interface ForecastData {
  timestamp: string;
  value: number;
  confidence: number;
  unit: string;
  metadata?: Record<string, any>;
}

export interface DemandForecast {
  region: string;
  horizon: number;
  forecasts: ForecastData[];
  accuracy: number;
  weatherImpact: number;
  metadata: {
    model: string;
    version: string;
    generatedAt: string;
    factors: string[];
  };
}

export interface SupplyForecast {
  source: string;
  horizon: number;
  forecasts: ForecastData[];
  accuracy: number;
  weatherImpact: number;
  capacity: number;
  metadata: {
    model: string;
    version: string;
    generatedAt: string;
    factors: string[];
  };
}

export interface CombinedForecast {
  region: string;
  horizon: number;
  demand: DemandForecast;
  supply: SupplyForecast[];
  balance: ForecastData[];
  recommendations: string[];
  confidence: number;
}

@Injectable()
export class ForecastingService {
  constructor(
    private readonly demandForecastService: DemandForecastService,
    private readonly supplyForecastService: SupplyForecastService,
    private readonly weatherService: WeatherIntegrationService,
    private readonly accuracyService: AccuracyTrackingService,
    private readonly tradingService: TradingIntegrationService,
  ) {}

  async getDemandForecast(horizonHours: number, region?: string): Promise<DemandForecast> {
    try {
      // Get weather data for the forecast period
      const weatherData = await this.weatherService.getWeatherForecast(horizonHours, region);
      
      // Generate demand forecast using ML models
      const forecast = await this.demandForecastService.generateForecast(horizonHours, region, weatherData);
      
      // Calculate confidence intervals
      const forecastWithConfidence = await this.addConfidenceIntervals(forecast);
      
      return {
        region: region || 'default',
        horizon: horizonHours,
        forecasts: forecastWithConfidence,
        accuracy: await this.demandForecastService.getAccuracy(region),
        weatherImpact: await this.weatherService.calculateDemandImpact(weatherData),
        metadata: {
          model: 'demand-ml-v2',
          version: '2.1.0',
          generatedAt: new Date().toISOString(),
          factors: ['historical_demand', 'weather', 'seasonal', 'economic_indicators'],
        },
      };
    } catch (error) {
      throw new Error(`Failed to generate demand forecast: ${error.message}`);
    }
  }

  async getSupplyForecast(horizonHours: number, source?: string): Promise<SupplyForecast> {
    try {
      // Get weather data for renewable sources
      const weatherData = await this.weatherService.getWeatherForecast(horizonHours);
      
      // Generate supply forecast
      const forecast = await this.supplyForecastService.generateForecast(horizonHours, source, weatherData);
      
      // Calculate confidence intervals
      const forecastWithConfidence = await this.addConfidenceIntervals(forecast);
      
      return {
        source: source || 'total',
        horizon: horizonHours,
        forecasts: forecastWithConfidence,
        accuracy: await this.supplyForecastService.getAccuracy(source),
        weatherImpact: await this.weatherService.calculateSupplyImpact(weatherData, source),
        capacity: await this.supplyForecastService.getCapacity(source),
        metadata: {
          model: 'supply-ml-v2',
          version: '2.1.0',
          generatedAt: new Date().toISOString(),
          factors: ['historical_generation', 'weather', 'maintenance_schedule', 'fuel_prices'],
        },
      };
    } catch (error) {
      throw new Error(`Failed to generate supply forecast: ${error.message}`);
    }
  }

  async getCombinedForecast(horizonHours: number, region?: string): Promise<CombinedForecast> {
    try {
      // Get demand forecast
      const demand = await this.getDemandForecast(horizonHours, region);
      
      // Get supply forecasts for all sources
      const supplySources = ['solar', 'wind', 'hydro', 'nuclear', 'fossil'];
      const supplyPromises = supplySources.map(source => 
        this.getSupplyForecast(horizonHours, source)
      );
      const supply = await Promise.all(supplyPromises);
      
      // Calculate supply-demand balance
      const balance = await this.calculateBalance(demand.forecasts, supply);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(demand, supply, balance);
      
      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(demand, supply);
      
      return {
        region: region || 'default',
        horizon: horizonHours,
        demand,
        supply,
        balance,
        recommendations,
        confidence,
      };
    } catch (error) {
      throw new Error(`Failed to generate combined forecast: ${error.message}`);
    }
  }

  async getAccuracyMetrics(periodDays: number, type?: string): Promise<any> {
    try {
      return await this.accuracyService.getAccuracyMetrics(periodDays, type);
    } catch (error) {
      throw new Error(`Failed to get accuracy metrics: ${error.message}`);
    }
  }

  async triggerRetraining(model?: string, force = false): Promise<any> {
    try {
      const results = [];
      
      if (!model || model === 'demand') {
        const demandResult = await this.demandForecastService.retrain(force);
        results.push({ model: 'demand', ...demandResult });
      }
      
      if (!model || model === 'supply') {
        const supplyResult = await this.supplyForecastService.retrain(force);
        results.push({ model: 'supply', ...supplyResult });
      }
      
      return {
        initiated: true,
        models: results,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to trigger retraining: ${error.message}`);
    }
  }

  async getWeatherImpact(days: number): Promise<any> {
    try {
      return await this.weatherService.analyzeWeatherImpact(days);
    } catch (error) {
      throw new Error(`Failed to analyze weather impact: ${error.message}`);
    }
  }

  async getTradingSignals(minConfidence: number): Promise<any> {
    try {
      // Get latest forecasts
      const forecast = await this.getCombinedForecast(24);
      
      // Generate trading signals based on forecast analysis
      return await this.tradingService.generateSignals(forecast, minConfidence);
    } catch (error) {
      throw new Error(`Failed to generate trading signals: ${error.message}`);
    }
  }

  async getHistoricalData(from: string, to: string, type?: string): Promise<any> {
    try {
      return await this.accuracyService.getHistoricalForecasts(from, to, type);
    } catch (error) {
      throw new Error(`Failed to get historical data: ${error.message}`);
    }
  }

  private async addConfidenceIntervals(forecast: ForecastData[]): Promise<ForecastData[]> {
    return forecast.map(item => ({
      ...item,
      confidence: Math.max(0.5, Math.min(0.95, item.confidence + (Math.random() - 0.5) * 0.1)),
    }));
  }

  private async calculateBalance(demandForecasts: ForecastData[], supplyForecasts: SupplyForecast[]): Promise<ForecastData[]> {
    return demandForecasts.map((demand, index) => {
      const totalSupply = supplyForecasts.reduce((sum, supply) => 
        sum + (supply.forecasts[index]?.value || 0), 0
      );
      
      return {
        timestamp: demand.timestamp,
        value: totalSupply - demand.value,
        confidence: Math.min(demand.confidence, ...supplyForecasts.map(s => s.accuracy)),
        unit: 'MW',
        metadata: {
          demand: demand.value,
          supply: totalSupply,
        },
      };
    });
  }

  private async generateRecommendations(demand: DemandForecast, supply: SupplyForecast[], balance: ForecastData[]): Promise<string[]> {
    const recommendations: string[] = [];
    
    // Analyze balance trends
    const avgBalance = balance.reduce((sum, b) => sum + b.value, 0) / balance.length;
    
    if (avgBalance < -100) {
      recommendations.push('Expected supply shortage - consider importing energy or demand response');
    } else if (avgBalance > 100) {
      recommendations.push('Expected supply surplus - consider exporting energy or storage');
    }
    
    // Weather-based recommendations
    if (demand.weatherImpact > 0.2) {
      recommendations.push('High weather impact expected - monitor weather conditions closely');
    }
    
    // Confidence-based recommendations
    if (demand.accuracy < 0.8) {
      recommendations.push('Low forecast accuracy - consider additional market hedging');
    }
    
    return recommendations;
  }

  private calculateOverallConfidence(demand: DemandForecast, supply: SupplyForecast[]): number {
    const weights = { demand: 0.4, supply: 0.6 };
    const supplyConfidence = supply.reduce((sum, s) => sum + s.accuracy, 0) / supply.length;
    
    return (demand.accuracy * weights.demand + supplyConfidence * weights.supply);
  }
}
