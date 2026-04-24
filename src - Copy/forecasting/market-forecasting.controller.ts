import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ForecastQueryDto, EnsembleConfigDto } from './dto/forecast-query.dto';
import {
  TimeSeriesService,
  TimeSeriesData,
  ForecastResult,
} from './models/time-series.service';
import {
  WeatherDataService,
  WeatherData,
} from './integrations/weather-data.service';
import {
  EconomicIndicatorService,
  EconomicData,
} from './analysis/economic-indicator.service';
import {
  TrendPredictionService,
  TrendPrediction,
  MarketSignal,
  PatternRecognition,
} from './prediction/trend-prediction.service';
import {
  EnsembleMethodsService,
  EnsembleConfig,
  EnsembleResult,
} from './ensemble/ensemble-methods.service';
import { ForecastHorizon } from './entities/forecast-data.entity';

@ApiTags('market-forecasting')
@Controller('forecasting')
export class MarketForecastingController {
  private readonly logger = new Logger(MarketForecastingController.name);

  constructor(
    private readonly timeSeriesService: TimeSeriesService,
    private readonly weatherDataService: WeatherDataService,
    private readonly economicIndicatorService: EconomicIndicatorService,
    private readonly trendPredictionService: TrendPredictionService,
    private readonly ensembleMethodsService: EnsembleMethodsService,
  ) {}

  @Post('forecast')
  @ApiOperation({ summary: 'Generate market forecast' })
  @ApiResponse({ status: 200, description: 'Forecast generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  async generateForecast(
    @Body() query: ForecastQueryDto,
  ): Promise<ForecastResult> {
    try {
      this.logger.log(
        `Generating forecast for ${query.marketType} with ${query.forecastHorizon} horizon`,
      );

      // Get historical data (mock for now)
      const historicalData = await this.getHistoricalData(query);

      // Generate forecast based on selected models
      const forecasts: ForecastResult[] = [];
      const models = query.models || [
        'ARIMA',
        'ExponentialSmoothing',
        'LSTM',
        'Prophet',
      ];

      for (const model of models) {
        try {
          const forecast = await this.runModel(
            historicalData,
            model,
            query.forecastHorizon,
          );
          forecasts.push(forecast);
        } catch (error) {
          this.logger.warn(`Failed to run model ${model}: ${error.message}`);
        }
      }

      if (forecasts.length === 0) {
        throw new HttpException(
          'No forecasts could be generated',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Return the best forecast (highest accuracy)
      const bestForecast = forecasts.reduce((best, current) =>
        current.accuracy > best.accuracy ? current : best,
      );

      return bestForecast;
    } catch (error) {
      this.logger.error('Failed to generate forecast', error);
      throw new HttpException(
        error.message || 'Failed to generate forecast',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('ensemble')
  @ApiOperation({ summary: 'Generate ensemble forecast' })
  @ApiResponse({
    status: 200,
    description: 'Ensemble forecast generated successfully',
  })
  async generateEnsembleForecast(
    @Body() body: { query: ForecastQueryDto; config: EnsembleConfigDto },
  ): Promise<EnsembleResult> {
    try {
      const { query, config } = body;
      this.logger.log(`Generating ensemble forecast for ${query.marketType}`);

      const historicalData = await this.getHistoricalData(query);
      const weatherData = await this.getWeatherDataFromQuery(query);
      const economicData = await this.getEconomicData(query);

      const ensembleConfig: EnsembleConfig = {
        models: config.models,
        weights: config.weights,
        diversityThreshold: config.diversityThreshold,
        votingMethod:
          (config.votingMethod as EnsembleConfig['votingMethod']) || 'weighted',
      };

      return await this.ensembleMethodsService.createEnsembleForecast(
        historicalData,
        query.forecastHorizon,
        ensembleConfig,
        weatherData,
        economicData,
      );
    } catch (error) {
      this.logger.error('Failed to generate ensemble forecast', error);
      throw new HttpException(
        error.message || 'Failed to generate ensemble forecast',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('optimize-ensemble')
  @ApiOperation({ summary: 'Optimize ensemble configuration' })
  @ApiResponse({ status: 200, description: 'Ensemble optimized successfully' })
  async optimizeEnsemble(
    @Body() query: ForecastQueryDto,
  ): Promise<EnsembleConfig> {
    try {
      const historicalData = await this.getHistoricalData(query);
      const candidateModels = [
        'ARIMA',
        'ExponentialSmoothing',
        'LSTM',
        'Prophet',
      ];

      return await this.ensembleMethodsService.optimizeEnsemble(
        historicalData,
        query.forecastHorizon,
        candidateModels,
      );
    } catch (error) {
      this.logger.error('Failed to optimize ensemble', error);
      throw new HttpException(
        error.message || 'Failed to optimize ensemble',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('trend-prediction')
  @ApiOperation({ summary: 'Predict market trends' })
  @ApiResponse({
    status: 200,
    description: 'Trend prediction completed successfully',
  })
  async predictTrend(
    @Body() query: ForecastQueryDto,
  ): Promise<TrendPrediction> {
    try {
      const historicalData = await this.getHistoricalData(query);
      const weatherData = await this.getWeatherDataFromQuery(query);
      const economicData = await this.getEconomicData(query);

      return await this.trendPredictionService.predictMarketTrend(
        historicalData,
        weatherData,
        economicData,
      );
    } catch (error) {
      this.logger.error('Failed to predict trend', error);
      throw new HttpException(
        error.message || 'Failed to predict trend',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('market-signals')
  @ApiOperation({ summary: 'Generate trading signals' })
  @ApiResponse({ status: 200, description: 'Signals generated successfully' })
  async generateMarketSignals(
    @Body()
    body: {
      query: ForecastQueryDto;
      currentPosition?: 'long' | 'short' | 'neutral';
    },
  ): Promise<MarketSignal[]> {
    try {
      const trendPrediction = await this.predictTrend(body.query);

      return await this.trendPredictionService.generateMarketSignals(
        trendPrediction,
        body.currentPosition,
      );
    } catch (error) {
      this.logger.error('Failed to generate market signals', error);
      throw new HttpException(
        error.message || 'Failed to generate market signals',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('pattern-recognition')
  @ApiOperation({ summary: 'Recognize chart patterns' })
  @ApiResponse({ status: 200, description: 'Patterns recognized successfully' })
  async recognizePatterns(
    @Body() query: ForecastQueryDto,
  ): Promise<PatternRecognition[]> {
    try {
      const historicalData = await this.getHistoricalData(query);

      return await this.trendPredictionService.recognizePatterns(
        historicalData,
      );
    } catch (error) {
      this.logger.error('Failed to recognize patterns', error);
      throw new HttpException(
        error.message || 'Failed to recognize patterns',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('volatility')
  @ApiOperation({ summary: 'Calculate market volatility' })
  @ApiQuery({ name: 'marketType', required: true, type: String })
  @ApiQuery({ name: 'windowSize', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Volatility calculated successfully',
  })
  async calculateVolatility(
    @Query('marketType') marketType: string,
    @Query('windowSize') windowSize?: number,
  ): Promise<any> {
    try {
      const historicalData = await this.getHistoricalData({
        marketType,
      } as ForecastQueryDto);

      return await this.trendPredictionService.calculateVolatility(
        historicalData,
        windowSize,
      );
    } catch (error) {
      this.logger.error('Failed to calculate volatility', error);
      throw new HttpException(
        error.message || 'Failed to calculate volatility',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('weather/:location')
  @ApiOperation({ summary: 'Get weather data for location' })
  @ApiParam({ name: 'location', required: true, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Weather data retrieved successfully',
  })
  async getWeatherDataEndpoint(
    @Param('location') location: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<WeatherData[]> {
    try {
      if (startDate && endDate) {
        return await this.weatherDataService.getHistoricalWeather(
          location,
          new Date(startDate),
          new Date(endDate),
        );
      } else {
        const current =
          await this.weatherDataService.getCurrentWeather(location);
        return [current];
      }
    } catch (error) {
      this.logger.error('Failed to get weather data', error);
      throw new HttpException(
        error.message || 'Failed to get weather data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('economic/:region')
  @ApiOperation({ summary: 'Get economic indicators for region' })
  @ApiParam({ name: 'region', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Economic data retrieved successfully',
  })
  async getEconomicIndicators(
    @Param('region') region: string = 'US',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<EconomicData> {
    try {
      if (startDate && endDate) {
        // For now, return snapshot
        return await this.economicIndicatorService.getEconomicSnapshot(region);
      } else {
        return await this.economicIndicatorService.getEconomicSnapshot(region);
      }
    } catch (error) {
      this.logger.error('Failed to get economic indicators', error);
      throw new HttpException(
        error.message || 'Failed to get economic indicators',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('models')
  @ApiOperation({ summary: 'Get available forecasting models' })
  @ApiResponse({ status: 200, description: 'Models retrieved successfully' })
  getAvailableModels(): {
    name: string;
    description: string;
    suitableFor: string[];
  }[] {
    return [
      {
        name: 'ARIMA',
        description:
          'AutoRegressive Integrated Moving Average model for time series forecasting',
        suitableFor: ['short-term', 'medium-term', 'stationary-data'],
      },
      {
        name: 'ExponentialSmoothing',
        description:
          'Exponential smoothing methods for time series forecasting',
        suitableFor: ['short-term', 'trend-data', 'seasonal-data'],
      },
      {
        name: 'LSTM',
        description:
          'Long Short-Term Memory neural network for complex pattern recognition',
        suitableFor: ['long-term', 'non-linear-data', 'complex-patterns'],
      },
      {
        name: 'Prophet',
        description:
          'Facebook Prophet for forecasting with seasonality and holidays',
        suitableFor: ['business-data', 'seasonal-data', 'holiday-effects'],
      },
    ];
  }

  @Get('horizons')
  @ApiOperation({ summary: 'Get available forecast horizons' })
  @ApiResponse({ status: 200, description: 'Horizons retrieved successfully' })
  getAvailableHorizons(): {
    value: string;
    label: string;
    description: string;
  }[] {
    return [
      {
        value: '1h',
        label: '1 Hour',
        description: 'Very short-term forecast for immediate trading decisions',
      },
      {
        value: '6h',
        label: '6 Hours',
        description: 'Short-term forecast for intraday trading',
      },
      {
        value: '24h',
        label: '24 Hours',
        description: 'Daily forecast for short-term positioning',
      },
      {
        value: '1w',
        label: '1 Week',
        description: 'Weekly forecast for medium-term strategies',
      },
      {
        value: '1m',
        label: '1 Month',
        description: 'Monthly forecast for medium-term planning',
      },
      {
        value: '3m',
        label: '3 Months',
        description: 'Quarterly forecast for strategic planning',
      },
      {
        value: '6m',
        label: '6 Months',
        description: 'Semi-annual forecast for budget planning',
      },
      {
        value: '1y',
        label: '1 Year',
        description: 'Annual forecast for long-term strategy',
      },
    ];
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get model performance metrics' })
  @ApiQuery({ name: 'marketType', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Performance metrics retrieved successfully',
  })
  async getModelPerformance(
    @Query('marketType') marketType: string,
  ): Promise<any> {
    try {
      const historicalData = await this.getHistoricalData({
        marketType,
      } as ForecastQueryDto);
      const models = ['ARIMA', 'ExponentialSmoothing', 'LSTM', 'Prophet'];
      const performance: any = {};

      for (const model of models) {
        try {
          const metrics = await this.timeSeriesService.evaluateModel(
            historicalData,
            model,
          );
          performance[model] = metrics;
        } catch (error) {
          this.logger.warn(
            `Failed to evaluate model ${model}: ${error.message}`,
          );
          performance[model] = { error: 'Evaluation failed' };
        }
      }

      return performance;
    } catch (error) {
      this.logger.error('Failed to get model performance', error);
      throw new HttpException(
        error.message || 'Failed to get model performance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Helper methods
  private async getHistoricalData(
    query: ForecastQueryDto,
  ): Promise<TimeSeriesData[]> {
    await Promise.resolve();
    // Mock historical data generation
    // In production, this would fetch from database or external API
    const data: TimeSeriesData[] = [];
    const now = new Date();
    const dataPoints = query.forecastHorizon.includes('h') ? 168 : 365; // 1 week or 1 year

    for (let i = dataPoints; i > 0; i--) {
      const timestamp = new Date(now.getTime() - i * 3600000); // 1 hour intervals
      const baseValue = 100;
      const trend = i * 0.1;
      const noise = (Math.random() - 0.5) * 10;
      const value = baseValue + trend + noise;

      data.push({
        timestamp,
        value,
        volume: Math.floor(Math.random() * 1000000),
        metadata: {
          marketType: query.marketType,
          source: 'mock',
        },
      });
    }

    return data;
  }

  private async getWeatherDataFromQuery(
    query: ForecastQueryDto,
  ): Promise<WeatherData[]> {
    await Promise.resolve();
    // Mock weather data
    const data: WeatherData[] = [];
    const now = new Date();

    for (let i = 7; i > 0; i--) {
      const timestamp = new Date(now.getTime() - i * 24 * 3600000); // Daily

      data.push({
        timestamp,
        temperature: 15 + Math.random() * 20,
        humidity: 40 + Math.random() * 40,
        windSpeed: Math.random() * 15,
        windDirection: Math.random() * 360,
        precipitation: Math.random() * 10,
        pressure: 1000 + Math.random() * 50,
        visibility: 5 + Math.random() * 15,
        cloudCover: Math.random() * 100,
        uvIndex: Math.random() * 11,
        location: query.marketType || 'New York',
      });
    }

    return data;
  }

  private async getEconomicData(
    query: ForecastQueryDto,
  ): Promise<EconomicData[]> {
    await Promise.resolve();
    // Mock economic data
    const baseEnergyPrice = query.marketType === 'oil' ? 75 : 80;
    return [
      {
        gdp: 21000 + Math.random() * 2000,
        inflation: 2 + Math.random() * 2,
        unemployment: 3 + Math.random() * 3,
        interestRate: 2 + Math.random() * 3,
        industrialProduction: 100 + Math.random() * 20,
        consumerConfidence: 80 + Math.random() * 40,
        manufacturingIndex: 50 + Math.random() * 20,
        retailSales: 500000 + Math.random() * 100000,
        energyPrices: baseEnergyPrice + Math.random() * 40,
        currencyExchange: 1 + Math.random() * 0.2,
      },
    ];
  }

  private async runModel(
    data: TimeSeriesData[],
    model: string,
    horizon: ForecastHorizon,
  ): Promise<ForecastResult> {
    switch (model) {
      case 'ARIMA':
        return await this.timeSeriesService.arimaForecast(data, horizon);
      case 'ExponentialSmoothing':
        return await this.timeSeriesService.exponentialSmoothingForecast(
          data,
          horizon,
        );
      case 'LSTM':
        return await this.timeSeriesService.lstmForecast(data, horizon);
      case 'Prophet':
        return await this.timeSeriesService.prophetForecast(data, horizon);
      default:
        throw new Error(`Unknown model: ${model}`);
    }
  }
}
