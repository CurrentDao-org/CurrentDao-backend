import { Injectable } from '@nestjs/common';
import { ForecastData } from '../forecasting.service';

@Injectable()
export class DemandForecastService {
  private readonly modelAccuracy = new Map<string, number>();

  async generateForecast(horizonHours: number, region?: string, weatherData?: any): Promise<ForecastData[]> {
    const forecasts: ForecastData[] = [];
    const baseDemand = this.getBaseDemand(region);
    
    for (let hour = 0; hour < horizonHours; hour++) {
      const timestamp = new Date(Date.now() + hour * 60 * 60 * 1000).toISOString();
      
      // Apply various factors to calculate demand
      let demand = baseDemand;
      
      // Time of day factor
      demand *= this.getTimeOfDayFactor(timestamp);
      
      // Seasonal factor
      demand *= this.getSeasonalFactor(timestamp);
      
      // Weather factor
      if (weatherData) {
        demand *= this.getWeatherFactor(weatherData[hour] || {});
      }
      
      // Add some randomness for realism
      demand *= (1 + (Math.random() - 0.5) * 0.1);
      
      forecasts.push({
        timestamp,
        value: Math.round(demand),
        confidence: this.calculateConfidence(hour, horizonHours),
        unit: 'MW',
        metadata: {
          baseDemand,
          factors: ['time_of_day', 'seasonal', 'weather'],
        },
      });
    }
    
    return forecasts;
  }

  async getAccuracy(region?: string): Promise<number> {
    const key = region || 'default';
    return this.modelAccuracy.get(key) || 0.92; // 92% accuracy target
  }

  async retrain(force = false): Promise<any> {
    // Simulate model retraining
    const retrainingTime = Math.random() * 300 + 60; // 1-6 minutes
    const accuracy = 0.85 + Math.random() * 0.1; // 85-95% accuracy
    
    // Update model accuracy
    this.modelAccuracy.set('default', accuracy);
    
    return {
      model: 'demand-ml-v2',
      retrainingTime: Math.round(retrainingTime),
      accuracy,
      samples: Math.floor(Math.random() * 10000) + 5000,
      timestamp: new Date().toISOString(),
    };
  }

  private getBaseDemand(region?: string): number {
    const baseDemands: Record<string, number> = {
      default: 1000,
      north: 1200,
      south: 800,
      east: 1100,
      west: 900,
    };
    
    return baseDemands[region || 'default'] || baseDemands.default;
  }

  private getTimeOfDayFactor(timestamp: string): number {
    const hour = new Date(timestamp).getHours();
    
    // Peak hours: 8-12, 18-22
    if ((hour >= 8 && hour <= 12) || (hour >= 18 && hour <= 22)) {
      return 1.2 + Math.random() * 0.1;
    }
    
    // Off-peak hours
    if (hour >= 0 && hour <= 6) {
      return 0.7 + Math.random() * 0.1;
    }
    
    // Normal hours
    return 1.0 + Math.random() * 0.05;
  }

  private getSeasonalFactor(timestamp: string): number {
    const month = new Date(timestamp).getMonth();
    
    // Summer (June-August): Higher demand due to cooling
    if (month >= 5 && month <= 7) {
      return 1.3 + Math.random() * 0.1;
    }
    
    // Winter (December-February): Higher demand due to heating
    if (month === 11 || month <= 1) {
      return 1.25 + Math.random() * 0.1;
    }
    
    // Spring/Fall: Moderate demand
    return 1.0 + Math.random() * 0.05;
  }

  private getWeatherFactor(weather: any): number {
    let factor = 1.0;
    
    // Temperature impact
    if (weather.temperature) {
      if (weather.temperature > 30) { // Hot weather
        factor *= 1.15; // More cooling demand
      } else if (weather.temperature < 5) { // Cold weather
        factor *= 1.1; // More heating demand
      }
    }
    
    // Cloud cover impact
    if (weather.cloudCover) {
      factor *= (1 + weather.cloudCover * 0.05); // More clouds = slightly more demand
    }
    
    // Wind speed impact (minimal for demand)
    if (weather.windSpeed) {
      factor *= (1 + weather.windSpeed * 0.01);
    }
    
    return factor;
  }

  private calculateConfidence(hour: number, totalHours: number): number {
    // Confidence decreases with time horizon
    const baseConfidence = 0.95;
    const decayRate = 0.02; // 2% confidence loss per hour
    
    return Math.max(0.6, baseConfidence - (hour * decayRate));
  }
}
