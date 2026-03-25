import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface WeatherData {
  timestamp: Date;
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  pressure: number;
  visibility: number;
  cloudCover: number;
  uvIndex: number;
  location: string;
}

export interface WeatherForecast {
  timestamp: Date;
  temperature: {
    current: number;
    min: number;
    max: number;
  };
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: {
    probability: number;
    amount: number;
  };
  pressure: number;
  cloudCover: number;
  uvIndex: number;
  conditions: string;
}

@Injectable()
export class WeatherDataService {
  private readonly logger = new Logger(WeatherDataService.name);
  private readonly weatherApiKey = process.env.WEATHER_API_KEY;
  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5';

  constructor(private readonly httpService: HttpService) {}

  async getCurrentWeather(location: string): Promise<WeatherData> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/weather`, {
          params: {
            q: location,
            appid: this.weatherApiKey,
            units: 'metric',
          },
        }),
      );

      const data = response.data;

      return {
        timestamp: new Date(),
        temperature: data.main.temp,
        humidity: data.main.humidity,
        windSpeed: data.wind?.speed || 0,
        windDirection: data.wind?.deg || 0,
        precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0,
        pressure: data.main.pressure,
        visibility: data.visibility / 1000, // Convert to km
        cloudCover: data.clouds.all,
        uvIndex: 0, // UV index not available in current weather endpoint
        location: data.name,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch current weather for ${location}`,
        error,
      );
      throw error;
    }
  }

  async getHistoricalWeather(
    location: string,
    startDate: Date,
    endDate: Date,
  ): Promise<WeatherData[]> {
    try {
      const weatherData: WeatherData[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const timestamp = Math.floor(currentDate.getTime() / 1000);

        // OpenWeatherMap historical data requires coordinates
        const coordinates = await this.getCoordinates(location);

        const response = await firstValueFrom(
          this.httpService.get(`${this.baseUrl}/onecall/timemachine`, {
            params: {
              lat: coordinates.lat,
              lon: coordinates.lon,
              dt: timestamp,
              appid: this.weatherApiKey,
              units: 'metric',
            },
          }),
        );

        const data = response.data;
        const current = data.current;

        weatherData.push({
          timestamp: new Date(current.dt * 1000),
          temperature: current.temp,
          humidity: current.humidity,
          windSpeed: current.wind_speed,
          windDirection: current.wind_deg,
          precipitation: current.rain?.['1h'] || current.snow?.['1h'] || 0,
          pressure: current.pressure,
          visibility: current.visibility / 1000,
          cloudCover: current.clouds,
          uvIndex: current.uvi,
          location,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return weatherData;
    } catch (error) {
      this.logger.error(
        `Failed to fetch historical weather for ${location}`,
        error,
      );
      throw error;
    }
  }

  async getWeatherForecast(
    location: string,
    days: number = 7,
  ): Promise<WeatherForecast[]> {
    try {
      const coordinates = await this.getCoordinates(location);

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/onecall`, {
          params: {
            lat: coordinates.lat,
            lon: coordinates.lon,
            appid: this.weatherApiKey,
            units: 'metric',
            exclude: 'minutely,alerts',
          },
        }),
      );

      const data = response.data;

      return data.daily.slice(0, days).map((day: any) => ({
        timestamp: new Date(day.dt * 1000),
        temperature: {
          current: day.temp.day,
          min: day.temp.min,
          max: day.temp.max,
        },
        humidity: day.humidity,
        windSpeed: day.wind_speed,
        windDirection: day.wind_deg,
        precipitation: {
          probability: day.pop,
          amount: day.rain?.['1h'] || day.snow?.['1h'] || 0,
        },
        pressure: day.pressure,
        cloudCover: day.clouds,
        uvIndex: day.uvi,
        conditions: day.weather[0].description,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch weather forecast for ${location}`,
        error,
      );
      throw error;
    }
  }

  getWeatherImpactOnEnergy(weatherData: WeatherData[]): Record<string, number> {
    const impactFactors: Record<string, number> = {
      temperature: 0,
      humidity: 0,
      windSpeed: 0,
      precipitation: 0,
      cloudCover: 0,
    };

    if (weatherData.length === 0) return impactFactors;

    // Temperature impact on heating/cooling demand
    const avgTemp =
      weatherData.reduce((sum, d) => sum + d.temperature, 0) /
      weatherData.length;
    impactFactors.temperature = this.calculateTemperatureImpact(avgTemp);

    // Humidity impact on cooling systems
    const avgHumidity =
      weatherData.reduce((sum, d) => sum + d.humidity, 0) / weatherData.length;
    impactFactors.humidity = this.calculateHumidityImpact(avgHumidity);

    // Wind speed impact on wind energy generation
    const avgWindSpeed =
      weatherData.reduce((sum, d) => sum + d.windSpeed, 0) / weatherData.length;
    impactFactors.windSpeed = this.calculateWindImpact(avgWindSpeed);

    // Precipitation impact on hydroelectric generation
    const totalPrecipitation = weatherData.reduce(
      (sum, d) => sum + d.precipitation,
      0,
    );
    impactFactors.precipitation =
      this.calculatePrecipitationImpact(totalPrecipitation);

    // Cloud cover impact on solar generation
    const avgCloudCover =
      weatherData.reduce((sum, d) => sum + d.cloudCover, 0) /
      weatherData.length;
    impactFactors.cloudCover = this.calculateCloudImpact(avgCloudCover);

    return impactFactors;
  }

  correlateWeatherWithEnergyDemand(
    weatherData: WeatherData[],
    energyData: { timestamp: Date; demand: number }[],
  ): Record<string, number> {
    const correlations: Record<string, number> = {};

    // Align data by timestamp
    const alignedData = this.alignDataByTimestamp(weatherData, energyData);

    if (alignedData.length < 2) {
      return {
        temperature: 0,
        humidity: 0,
        windSpeed: 0,
        precipitation: 0,
        cloudCover: 0,
      };
    }

    // Calculate correlations
    correlations.temperature = this.calculateCorrelation(
      alignedData.map((d) => d.temperature),
      alignedData.map((d) => d.demand),
    );

    correlations.humidity = this.calculateCorrelation(
      alignedData.map((d) => d.humidity),
      alignedData.map((d) => d.demand),
    );

    correlations.windSpeed = this.calculateCorrelation(
      alignedData.map((d) => d.windSpeed),
      alignedData.map((d) => d.demand),
    );

    correlations.precipitation = this.calculateCorrelation(
      alignedData.map((d) => d.precipitation),
      alignedData.map((d) => d.demand),
    );

    correlations.cloudCover = this.calculateCorrelation(
      alignedData.map((d) => d.cloudCover),
      alignedData.map((d) => d.demand),
    );

    return correlations;
  }

  private async getCoordinates(
    location: string,
  ): Promise<{ lat: number; lon: number }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/weather`, {
          params: {
            q: location,
            appid: this.weatherApiKey,
          },
        }),
      );

      return {
        lat: response.data.coord.lat,
        lon: response.data.coord.lon,
      };
    } catch (error) {
      this.logger.error(`Failed to get coordinates for ${location}`, error);
      throw error;
    }
  }

  private calculateTemperatureImpact(temperature: number): number {
    // Optimal temperature range is around 20-22°C
    // Deviation from this range increases energy demand
    const optimalTemp = 21;
    const deviation = Math.abs(temperature - optimalTemp);
    return Math.min(0.5, deviation * 0.02); // Max 50% impact
  }

  private calculateHumidityImpact(humidity: number): number {
    // High humidity increases cooling demand
    if (humidity > 70) {
      return (humidity - 70) * 0.005; // Max 15% impact
    }
    return 0;
  }

  private calculateWindImpact(windSpeed: number): number {
    // Wind speed affects wind energy generation
    // Optimal range is 3-25 m/s for most turbines
    if (windSpeed >= 3 && windSpeed <= 25) {
      return Math.min(0.3, windSpeed * 0.01); // Max 30% positive impact
    }
    return -0.1; // Negative impact outside optimal range
  }

  private calculatePrecipitationImpact(precipitation: number): number {
    // Precipitation affects hydroelectric generation
    return Math.min(0.2, precipitation * 0.01); // Max 20% positive impact
  }

  private calculateCloudImpact(cloudCover: number): number {
    // Cloud cover affects solar generation
    return -Math.min(0.4, cloudCover * 0.004); // Max 40% negative impact
  }

  private alignDataByTimestamp(
    weatherData: WeatherData[],
    energyData: { timestamp: Date; demand: number }[],
  ): Array<WeatherData & { demand: number }> {
    const aligned: Array<WeatherData & { demand: number }> = [];

    weatherData.forEach((weather) => {
      const energy = energyData.find(
        (e) =>
          Math.abs(e.timestamp.getTime() - weather.timestamp.getTime()) <
          3600000, // Within 1 hour
      );

      if (energy) {
        aligned.push({ ...weather, demand: energy.demand });
      }
    });

    return aligned;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }

  async getWeatherAlerts(location: string): Promise<any[]> {
    try {
      const coordinates = await this.getCoordinates(location);

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/onecall`, {
          params: {
            lat: coordinates.lat,
            lon: coordinates.lon,
            appid: this.weatherApiKey,
            exclude: 'minutely,hourly,daily',
          },
        }),
      );

      return response.data.alerts || [];
    } catch (error) {
      this.logger.error(
        `Failed to fetch weather alerts for ${location}`,
        error,
      );
      return [];
    }
  }
}
