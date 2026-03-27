"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WeatherDataService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeatherDataService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let WeatherDataService = WeatherDataService_1 = class WeatherDataService {
    constructor(httpService) {
        this.httpService = httpService;
        this.logger = new common_1.Logger(WeatherDataService_1.name);
        this.weatherApiKey = process.env.WEATHER_API_KEY;
        this.baseUrl = 'https://api.openweathermap.org/data/2.5';
    }
    async getCurrentWeather(location) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/weather`, {
                params: {
                    q: location,
                    appid: this.weatherApiKey,
                    units: 'metric',
                },
            }));
            const data = response.data;
            return {
                timestamp: new Date(),
                temperature: data.main.temp,
                humidity: data.main.humidity,
                windSpeed: data.wind?.speed || 0,
                windDirection: data.wind?.deg || 0,
                precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0,
                pressure: data.main.pressure,
                visibility: data.visibility / 1000,
                cloudCover: data.clouds.all,
                uvIndex: 0,
                location: data.name,
            };
        }
        catch (error) {
            this.logger.error(`Failed to fetch current weather for ${location}`, error);
            throw error;
        }
    }
    async getHistoricalWeather(location, startDate, endDate) {
        try {
            const weatherData = [];
            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const timestamp = Math.floor(currentDate.getTime() / 1000);
                const coordinates = await this.getCoordinates(location);
                const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/onecall/timemachine`, {
                    params: {
                        lat: coordinates.lat,
                        lon: coordinates.lon,
                        dt: timestamp,
                        appid: this.weatherApiKey,
                        units: 'metric',
                    },
                }));
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
        }
        catch (error) {
            this.logger.error(`Failed to fetch historical weather for ${location}`, error);
            throw error;
        }
    }
    async getWeatherForecast(location, days = 7) {
        try {
            const coordinates = await this.getCoordinates(location);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/onecall`, {
                params: {
                    lat: coordinates.lat,
                    lon: coordinates.lon,
                    appid: this.weatherApiKey,
                    units: 'metric',
                    exclude: 'minutely,alerts',
                },
            }));
            const data = response.data;
            return data.daily.slice(0, days).map((day) => ({
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
        }
        catch (error) {
            this.logger.error(`Failed to fetch weather forecast for ${location}`, error);
            throw error;
        }
    }
    getWeatherImpactOnEnergy(weatherData) {
        const impactFactors = {
            temperature: 0,
            humidity: 0,
            windSpeed: 0,
            precipitation: 0,
            cloudCover: 0,
        };
        if (weatherData.length === 0)
            return impactFactors;
        const avgTemp = weatherData.reduce((sum, d) => sum + d.temperature, 0) /
            weatherData.length;
        impactFactors.temperature = this.calculateTemperatureImpact(avgTemp);
        const avgHumidity = weatherData.reduce((sum, d) => sum + d.humidity, 0) / weatherData.length;
        impactFactors.humidity = this.calculateHumidityImpact(avgHumidity);
        const avgWindSpeed = weatherData.reduce((sum, d) => sum + d.windSpeed, 0) / weatherData.length;
        impactFactors.windSpeed = this.calculateWindImpact(avgWindSpeed);
        const totalPrecipitation = weatherData.reduce((sum, d) => sum + d.precipitation, 0);
        impactFactors.precipitation =
            this.calculatePrecipitationImpact(totalPrecipitation);
        const avgCloudCover = weatherData.reduce((sum, d) => sum + d.cloudCover, 0) /
            weatherData.length;
        impactFactors.cloudCover = this.calculateCloudImpact(avgCloudCover);
        return impactFactors;
    }
    correlateWeatherWithEnergyDemand(weatherData, energyData) {
        const correlations = {};
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
        correlations.temperature = this.calculateCorrelation(alignedData.map((d) => d.temperature), alignedData.map((d) => d.demand));
        correlations.humidity = this.calculateCorrelation(alignedData.map((d) => d.humidity), alignedData.map((d) => d.demand));
        correlations.windSpeed = this.calculateCorrelation(alignedData.map((d) => d.windSpeed), alignedData.map((d) => d.demand));
        correlations.precipitation = this.calculateCorrelation(alignedData.map((d) => d.precipitation), alignedData.map((d) => d.demand));
        correlations.cloudCover = this.calculateCorrelation(alignedData.map((d) => d.cloudCover), alignedData.map((d) => d.demand));
        return correlations;
    }
    async getCoordinates(location) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/weather`, {
                params: {
                    q: location,
                    appid: this.weatherApiKey,
                },
            }));
            return {
                lat: response.data.coord.lat,
                lon: response.data.coord.lon,
            };
        }
        catch (error) {
            this.logger.error(`Failed to get coordinates for ${location}`, error);
            throw error;
        }
    }
    calculateTemperatureImpact(temperature) {
        const optimalTemp = 21;
        const deviation = Math.abs(temperature - optimalTemp);
        return Math.min(0.5, deviation * 0.02);
    }
    calculateHumidityImpact(humidity) {
        if (humidity > 70) {
            return (humidity - 70) * 0.005;
        }
        return 0;
    }
    calculateWindImpact(windSpeed) {
        if (windSpeed >= 3 && windSpeed <= 25) {
            return Math.min(0.3, windSpeed * 0.01);
        }
        return -0.1;
    }
    calculatePrecipitationImpact(precipitation) {
        return Math.min(0.2, precipitation * 0.01);
    }
    calculateCloudImpact(cloudCover) {
        return -Math.min(0.4, cloudCover * 0.004);
    }
    alignDataByTimestamp(weatherData, energyData) {
        const aligned = [];
        weatherData.forEach((weather) => {
            const energy = energyData.find((e) => Math.abs(e.timestamp.getTime() - weather.timestamp.getTime()) <
                3600000);
            if (energy) {
                aligned.push({ ...weather, demand: energy.demand });
            }
        });
        return aligned;
    }
    calculateCorrelation(x, y) {
        if (x.length !== y.length || x.length === 0)
            return 0;
        const n = x.length;
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
        const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        return denominator === 0 ? 0 : numerator / denominator;
    }
    async getWeatherAlerts(location) {
        try {
            const coordinates = await this.getCoordinates(location);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/onecall`, {
                params: {
                    lat: coordinates.lat,
                    lon: coordinates.lon,
                    appid: this.weatherApiKey,
                    exclude: 'minutely,hourly,daily',
                },
            }));
            return response.data.alerts || [];
        }
        catch (error) {
            this.logger.error(`Failed to fetch weather alerts for ${location}`, error);
            return [];
        }
    }
};
exports.WeatherDataService = WeatherDataService;
exports.WeatherDataService = WeatherDataService = WeatherDataService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], WeatherDataService);
//# sourceMappingURL=weather-data.service.js.map