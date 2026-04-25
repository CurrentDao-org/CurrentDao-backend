import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface WeatherData {
  timestamp: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  cloudCover: number;
  precipitation: number;
  visibility: number;
  uvIndex: number;
}

export interface WeatherForecast {
  location: string;
  latitude: number;
  longitude: number;
  forecasts: WeatherData[];
  generatedAt: string;
  source: string;
}

@Injectable()
export class WeatherIntegrationService {
  constructor(private readonly httpService: HttpService) {}

  async getWeatherForecast(horizonHours: number, location?: string): Promise<WeatherData[]> {
    try {
      // For demo purposes, generate synthetic weather data
      // In production, this would call a real weather API
      const forecasts: WeatherData[] = [];
      
      for (let hour = 0; hour < horizonHours; hour++) {
        const timestamp = new Date(Date.now() + hour * 60 * 60 * 1000).toISOString();
        const baseTemp = 20; // Base temperature in Celsius
        
        forecasts.push({
          timestamp,
          temperature: this.generateTemperature(baseTemp, hour),
          humidity: 40 + Math.random() * 40, // 40-80%
          windSpeed: 2 + Math.random() * 15, // 2-17 m/s
          windDirection: Math.random() * 360, // 0-360 degrees
          pressure: 1000 + Math.random() * 30, // 1000-1030 hPa
          cloudCover: Math.random(), // 0-1 (0-100%)
          precipitation: Math.random() * 0.5, // 0-0.5 mm/h
          visibility: 5 + Math.random() * 15, // 5-20 km
          uvIndex: this.generateUVIndex(hour),
        });
      }
      
      return forecasts;
    } catch (error) {
      throw new Error(`Failed to get weather forecast: ${error.message}`);
    }
  }

  async calculateDemandImpact(weatherData: WeatherData[]): Promise<number> {
    if (!weatherData || weatherData.length === 0) {
      return 0;
    }
    
    let totalImpact = 0;
    
    for (const weather of weatherData) {
      let impact = 0;
      
      // Temperature impact on heating/cooling demand
      if (weather.temperature < 10) {
        impact += (10 - weather.temperature) * 0.02; // Cold weather increases demand
      } else if (weather.temperature > 25) {
        impact += (weather.temperature - 25) * 0.015; // Hot weather increases demand
      }
      
      // Cloud cover impact (more clouds = slightly more lighting demand)
      impact += weather.cloudCover * 0.05;
      
      // Wind speed impact (windy weather may affect building envelope)
      if (weather.windSpeed > 10) {
        impact += (weather.windSpeed - 10) * 0.01;
      }
      
      totalImpact += impact;
    }
    
    return totalImpact / weatherData.length; // Average impact
  }

  async calculateSupplyImpact(weatherData: WeatherData[], source?: string): Promise<number> {
    if (!weatherData || weatherData.length === 0) {
      return 0;
    }
    
    let totalImpact = 0;
    
    for (const weather of weatherData) {
      let impact = 0;
      
      switch (source) {
        case 'solar':
          // Solar is highly weather dependent
          impact = this.calculateSolarWeatherImpact(weather);
          break;
        case 'wind':
          // Wind is weather dependent
          impact = this.calculateWindWeatherImpact(weather);
          break;
        case 'hydro':
          // Hydro is moderately weather dependent
          impact = this.calculateHydroWeatherImpact(weather);
          break;
        default:
          // Overall impact (weighted average)
          impact = (
            this.calculateSolarWeatherImpact(weather) * 0.3 +
            this.calculateWindWeatherImpact(weather) * 0.4 +
            this.calculateHydroWeatherImpact(weather) * 0.3
          );
      }
      
      totalImpact += impact;
    }
    
    return totalImpact / weatherData.length;
  }

  async analyzeWeatherImpact(days: number): Promise<any> {
    try {
      const hours = days * 24;
      const weatherData = await this.getWeatherForecast(hours);
      
      const analysis = {
        period: `${days} days`,
        generatedAt: new Date().toISOString(),
        summary: {
          averageTemperature: weatherData.reduce((sum, w) => sum + w.temperature, 0) / weatherData.length,
          averageWindSpeed: weatherData.reduce((sum, w) => sum + w.windSpeed, 0) / weatherData.length,
          averageCloudCover: weatherData.reduce((sum, w) => sum + w.cloudCover, 0) / weatherData.length,
          totalPrecipitation: weatherData.reduce((sum, w) => sum + w.precipitation, 0),
        },
        impacts: {
          demand: await this.calculateDemandImpact(weatherData),
          solar: await this.calculateSupplyImpact(weatherData, 'solar'),
          wind: await this.calculateSupplyImpact(weatherData, 'wind'),
          hydro: await this.calculateSupplyImpact(weatherData, 'hydro'),
        },
        recommendations: this.generateWeatherRecommendations(weatherData),
      };
      
      return analysis;
    } catch (error) {
      throw new Error(`Failed to analyze weather impact: ${error.message}`);
    }
  }

  private generateTemperature(baseTemp: number, hour: number): number {
    // Daily temperature variation
    const hourOfDay = (hour + new Date().getHours()) % 24;
    const dailyVariation = Math.sin((hourOfDay - 6) * Math.PI / 12) * 8; // Peak at 14:00 (2 PM)
    
    // Seasonal variation
    const dayOfYear = Math.floor(hour / 24);
    const seasonalVariation = Math.sin((dayOfYear - 80) * Math.PI / 182.5) * 10; // Peak in summer
    
    // Add some randomness
    const randomVariation = (Math.random() - 0.5) * 2;
    
    return baseTemp + dailyVariation + seasonalVariation + randomVariation;
  }

  private generateUVIndex(hour: number): number {
    const hourOfDay = (hour + new Date().getHours()) % 24;
    
    // UV index is 0 at night, peaks around noon
    if (hourOfDay >= 6 && hourOfDay <= 18) {
      const peakHour = 12;
      const hourDiff = Math.abs(hourOfDay - peakHour);
      return Math.max(0, 11 - hourDiff); // Max UV index 11
    }
    
    return 0;
  }

  private calculateSolarWeatherImpact(weather: WeatherData): number {
    let impact = 1.0; // Base impact
    
    // Cloud cover significantly affects solar
    impact *= (1 - weather.cloudCover * 0.8);
    
    // Temperature affects solar panel efficiency
    const optimalTemp = 25;
    const tempDiff = Math.abs(weather.temperature - optimalTemp);
    impact *= (1 - tempDiff * 0.01);
    
    // UV index is a good proxy for solar irradiance
    if (weather.uvIndex > 0) {
      impact *= (weather.uvIndex / 11); // Normalize to max UV index
    }
    
    return impact;
  }

  private calculateWindWeatherImpact(weather: WeatherData): number {
    // Wind generation is directly proportional to wind speed (within limits)
    if (weather.windSpeed < 3) {
      return 0; // Below cut-in speed
    } else if (weather.windSpeed > 25) {
      return 0; // Above cut-out speed
    } else if (weather.windSpeed >= 12 && weather.windSpeed <= 15) {
      return 1.0; // Rated speed
    } else {
      // Linear interpolation
      return (weather.windSpeed - 3) / (12 - 3) * 0.9;
    }
  }

  private calculateHydroWeatherImpact(weather: WeatherData): number {
    let impact = 1.0;
    
    // Precipitation increases water availability
    if (weather.precipitation > 0) {
      impact *= (1 + weather.precipitation * 0.2);
    }
    
    // Seasonal factors (would need more complex modeling in reality)
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) {
      impact *= 1.1; // Spring snowmelt
    }
    
    return Math.min(1.2, impact); // Cap at 120% of normal
  }

  private generateWeatherRecommendations(weatherData: WeatherData[]): string[] {
    const recommendations: string[] = [];
    
    // Analyze overall weather patterns
    const avgTemp = weatherData.reduce((sum, w) => sum + w.temperature, 0) / weatherData.length;
    const avgWindSpeed = weatherData.reduce((sum, w) => sum + w.windSpeed, 0) / weatherData.length;
    const avgCloudCover = weatherData.reduce((sum, w) => sum + w.cloudCover, 0) / weatherData.length;
    
    // Temperature-based recommendations
    if (avgTemp > 28) {
      recommendations.push('High temperatures expected - prepare for increased cooling demand');
    } else if (avgTemp < 5) {
      recommendations.push('Low temperatures expected - prepare for increased heating demand');
    }
    
    // Wind-based recommendations
    if (avgWindSpeed > 12) {
      recommendations.push('Strong winds expected - optimal wind generation conditions');
    } else if (avgWindSpeed < 5) {
      recommendations.push('Low wind speeds expected - reduced wind generation forecast');
    }
    
    // Cloud cover recommendations
    if (avgCloudCover > 0.7) {
      recommendations.push('Heavy cloud cover expected - reduced solar generation forecast');
    } else if (avgCloudCover < 0.3) {
      recommendations.push('Clear skies expected - optimal solar generation conditions');
    }
    
    // Check for extreme conditions
    const extremeWeather = weatherData.filter(w => 
      w.temperature > 35 || w.temperature < -5 || w.windSpeed > 20 || w.precipitation > 10
    );
    
    if (extremeWeather.length > 0) {
      recommendations.push('Extreme weather conditions detected - monitor system closely');
    }
    
    return recommendations;
  }
}
