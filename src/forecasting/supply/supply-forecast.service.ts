import { Injectable } from '@nestjs/common';
import { ForecastData } from '../forecasting.service';

@Injectable()
export class SupplyForecastService {
  private readonly modelAccuracy = new Map<string, number>();
  private readonly sourceCapacities = new Map<string, number>();

  constructor() {
    // Initialize source capacities (MW)
    this.sourceCapacities.set('solar', 500);
    this.sourceCapacities.set('wind', 800);
    this.sourceCapacities.set('hydro', 600);
    this.sourceCapacities.set('nuclear', 1200);
    this.sourceCapacities.set('fossil', 1000);
    this.sourceCapacities.set('total', 4100);
  }

  async generateForecast(horizonHours: number, source?: string, weatherData?: any): Promise<ForecastData[]> {
    const forecasts: ForecastData[] = [];
    const sources = source ? [source] : ['solar', 'wind', 'hydro', 'nuclear', 'fossil'];
    
    for (let hour = 0; hour < horizonHours; hour++) {
      const timestamp = new Date(Date.now() + hour * 60 * 60 * 1000).toISOString();
      
      let totalGeneration = 0;
      
      for (const sourceType of sources) {
        const generation = await this.calculateGeneration(sourceType, timestamp, weatherData?.[hour]);
        totalGeneration += generation;
      }
      
      forecasts.push({
        timestamp,
        value: Math.round(totalGeneration),
        confidence: this.calculateConfidence(hour, horizonHours, sources),
        unit: 'MW',
        metadata: {
          sources,
          weatherDependent: this.getWeatherDependentSources(sources),
        },
      });
    }
    
    return forecasts;
  }

  async getAccuracy(source?: string): Promise<number> {
    const key = source || 'total';
    return this.modelAccuracy.get(key) || 0.88; // 88% accuracy target for supply
  }

  async getCapacity(source?: string): Promise<number> {
    const key = source || 'total';
    return this.sourceCapacities.get(key) || 0;
  }

  async retrain(force = false): Promise<any> {
    // Simulate model retraining
    const retrainingTime = Math.random() * 400 + 120; // 2-8 minutes
    const accuracy = 0.82 + Math.random() * 0.13; // 82-95% accuracy
    
    // Update model accuracy for all sources
    const sources = ['solar', 'wind', 'hydro', 'nuclear', 'fossil', 'total'];
    sources.forEach(source => {
      this.modelAccuracy.set(source, accuracy + Math.random() * 0.05);
    });
    
    return {
      model: 'supply-ml-v2',
      retrainingTime: Math.round(retrainingTime),
      accuracy,
      samples: Math.floor(Math.random() * 15000) + 8000,
      timestamp: new Date().toISOString(),
    };
  }

  private async calculateGeneration(source: string, timestamp: string, weather?: any): Promise<number> {
    const capacity = this.sourceCapacities.get(source) || 0;
    let generation = 0;
    
    switch (source) {
      case 'solar':
        generation = this.calculateSolarGeneration(timestamp, weather, capacity);
        break;
      case 'wind':
        generation = this.calculateWindGeneration(timestamp, weather, capacity);
        break;
      case 'hydro':
        generation = this.calculateHydroGeneration(timestamp, weather, capacity);
        break;
      case 'nuclear':
        generation = this.calculateNuclearGeneration(timestamp, capacity);
        break;
      case 'fossil':
        generation = this.calculateFossilGeneration(timestamp, capacity);
        break;
      default:
        generation = capacity * 0.8; // Default 80% capacity factor
    }
    
    return generation;
  }

  private calculateSolarGeneration(timestamp: string, weather: any, capacity: number): number {
    const hour = new Date(timestamp).getHours();
    
    // No solar generation at night
    if (hour < 6 || hour > 18) {
      return 0;
    }
    
    // Peak solar generation around noon (12:00)
    const peakHour = 12;
    const hourDiff = Math.abs(hour - peakHour);
    const timeFactor = Math.max(0, 1 - (hourDiff / 6)); // Linear decrease from noon
    
    // Weather factors
    let weatherFactor = 1.0;
    if (weather) {
      // Cloud cover reduces solar generation
      if (weather.cloudCover !== undefined) {
        weatherFactor *= (1 - weather.cloudCover * 0.8);
      }
      
      // Temperature affects efficiency
      if (weather.temperature) {
        const optimalTemp = 25; // Celsius
        const tempDiff = Math.abs(weather.temperature - optimalTemp);
        weatherFactor *= (1 - tempDiff * 0.01);
      }
    }
    
    // Seasonal factor
    const month = new Date(timestamp).getMonth();
    let seasonalFactor = 1.0;
    if (month >= 11 || month <= 1) {
      seasonalFactor = 0.6; // Winter
    } else if (month >= 5 && month <= 7) {
      seasonalFactor = 1.2; // Summer
    }
    
    const baseGeneration = capacity * 0.3; // Solar capacity factor ~30%
    return baseGeneration * timeFactor * weatherFactor * seasonalFactor;
  }

  private calculateWindGeneration(timestamp: string, weather: any, capacity: number): number {
    let windSpeed = 8; // Default wind speed m/s
    
    if (weather && weather.windSpeed !== undefined) {
      windSpeed = weather.windSpeed;
    }
    
    // Wind power curve (simplified)
    let capacityFactor = 0;
    
    if (windSpeed < 3) {
      capacityFactor = 0; // Cut-in speed
    } else if (windSpeed > 25) {
      capacityFactor = 0; // Cut-out speed
    } else if (windSpeed >= 12 && windSpeed <= 15) {
      capacityFactor = 0.9; // Rated speed
    } else {
      // Linear interpolation between cut-in and rated speed
      capacityFactor = (windSpeed - 3) / (12 - 3) * 0.9;
    }
    
    // Add some randomness for turbulence
    capacityFactor *= (1 + (Math.random() - 0.5) * 0.1);
    
    return capacity * capacityFactor;
  }

  private calculateHydroGeneration(timestamp: string, weather: any, capacity: number): number {
    // Hydro is relatively stable but affected by precipitation
    let capacityFactor = 0.85; // Base capacity factor
    
    if (weather && weather.precipitation !== undefined) {
      // Recent precipitation increases generation
      capacityFactor += weather.precipitation * 0.1;
    }
    
    // Seasonal variation (more water in spring due to snowmelt)
    const month = new Date(timestamp).getMonth();
    if (month >= 2 && month <= 4) {
      capacityFactor *= 1.1; // Spring
    } else if (month >= 8 && month <= 10) {
      capacityFactor *= 0.9; // Fall
    }
    
    return capacity * Math.min(1, capacityFactor);
  }

  private calculateNuclearGeneration(timestamp: string, capacity: number): number {
    // Nuclear is very stable, high capacity factor
    return capacity * 0.92; // 92% capacity factor
  }

  private calculateFossilGeneration(timestamp: string, capacity: number): number {
    // Fossil plants can ramp up/down based on demand
    const hour = new Date(timestamp).getHours();
    
    let capacityFactor = 0.7; // Base capacity factor
    
    // Higher during peak hours
    if ((hour >= 8 && hour <= 12) || (hour >= 18 && hour <= 22)) {
      capacityFactor = 0.85;
    } else if (hour >= 0 && hour <= 6) {
      capacityFactor = 0.5;
    }
    
    return capacity * capacityFactor;
  }

  private calculateConfidence(hour: number, totalHours: number, sources: string[]): number {
    // Confidence depends on how weather-dependent the sources are
    const weatherDependentRatio = this.getWeatherDependentSources(sources).length / sources.length;
    
    // Base confidence decreases with time horizon
    let baseConfidence = 0.95;
    const decayRate = 0.025; // 2.5% confidence loss per hour
    
    // More weather-dependent = lower confidence for longer horizons
    const weatherPenalty = weatherDependentRatio * (hour / totalHours) * 0.15;
    
    return Math.max(0.5, baseConfidence - (hour * decayRate) - weatherPenalty);
  }

  private getWeatherDependentSources(sources: string[]): string[] {
    return sources.filter(source => ['solar', 'wind', 'hydro'].includes(source));
  }
}
