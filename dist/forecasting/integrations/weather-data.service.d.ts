import { HttpService } from '@nestjs/axios';
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
export declare class WeatherDataService {
    private readonly httpService;
    private readonly logger;
    private readonly weatherApiKey;
    private readonly baseUrl;
    constructor(httpService: HttpService);
    getCurrentWeather(location: string): Promise<WeatherData>;
    getHistoricalWeather(location: string, startDate: Date, endDate: Date): Promise<WeatherData[]>;
    getWeatherForecast(location: string, days?: number): Promise<WeatherForecast[]>;
    getWeatherImpactOnEnergy(weatherData: WeatherData[]): Record<string, number>;
    correlateWeatherWithEnergyDemand(weatherData: WeatherData[], energyData: {
        timestamp: Date;
        demand: number;
    }[]): Record<string, number>;
    private getCoordinates;
    private calculateTemperatureImpact;
    private calculateHumidityImpact;
    private calculateWindImpact;
    private calculatePrecipitationImpact;
    private calculateCloudImpact;
    private alignDataByTimestamp;
    private calculateCorrelation;
    getWeatherAlerts(location: string): Promise<any[]>;
}
