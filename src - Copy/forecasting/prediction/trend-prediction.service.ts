import { Injectable, Logger } from '@nestjs/common';
import { TimeSeriesData } from '../models/time-series.service';
import { WeatherData } from '../integrations/weather-data.service';
import { EconomicData } from '../analysis/economic-indicator.service';

export enum TrendDirection {
  UP = 'up',
  DOWN = 'down',
  SIDEWAYS = 'sideways',
  VOLATILE = 'volatile',
}

export enum TrendStrength {
  WEAK = 'weak',
  MODERATE = 'moderate',
  STRONG = 'strong',
  VERY_STRONG = 'very_strong',
}

export interface TrendPrediction {
  direction: TrendDirection;
  strength: TrendStrength;
  confidence: number;
  timeframe: string;
  expectedChange: number;
  riskFactors: string[];
  keyDrivers: string[];
  reversalPoints: Date[];
  supportLevels: number[];
  resistanceLevels: number[];
}

export interface MarketSignal {
  type: 'buy' | 'sell' | 'hold';
  strength: number;
  reason: string;
  timeframe: string;
  confidence: number;
}

export interface PatternRecognition {
  pattern: string;
  confidence: number;
  description: string;
  implications: string;
  timeframe: string;
}

@Injectable()
export class TrendPredictionService {
  private readonly logger = new Logger(TrendPredictionService.name);

  async predictMarketTrend(
    timeSeriesData: TimeSeriesData[],
    weatherData?: WeatherData[],
    economicData?: EconomicData[],
  ): Promise<TrendPrediction> {
    try {
      await Promise.resolve();
      const technicalSignals = this.analyzeTechnicalIndicators(timeSeriesData);
      const weatherSignals = weatherData
        ? this.analyzeWeatherImpact(weatherData)
        : null;
      const economicSignals = economicData
        ? this.analyzeEconomicImpact(economicData)
        : null;

      const combinedSignals = this.combineSignals(
        technicalSignals,
        weatherSignals,
        economicSignals,
      );
      const patterns = this.identifyPatterns(timeSeriesData);

      return {
        direction: combinedSignals.direction,
        strength: combinedSignals.strength,
        confidence: combinedSignals.confidence,
        timeframe: this.determineTimeframe(timeSeriesData),
        expectedChange: combinedSignals.expectedChange,
        riskFactors: this.identifyRiskFactors(combinedSignals, patterns),
        keyDrivers: this.identifyKeyDrivers(
          technicalSignals,
          weatherSignals,
          economicSignals,
        ),
        reversalPoints: this.predictReversalPoints(
          timeSeriesData,
          combinedSignals,
        ),
        supportLevels: this.calculateSupportLevels(timeSeriesData),
        resistanceLevels: this.calculateResistanceLevels(timeSeriesData),
      };
    } catch (error) {
      this.logger.error('Failed to predict market trend', error);
      throw error;
    }
  }

  async detectMajorShifts(
    historicalData: TimeSeriesData[],
    windowSize: number = 30,
  ): Promise<
    {
      timestamp: Date;
      shiftType: string;
      magnitude: number;
      confidence: number;
    }[]
  > {
    await Promise.resolve();
    const shifts: {
      timestamp: Date;
      shiftType: string;
      magnitude: number;
      confidence: number;
    }[] = [];

    for (let i = windowSize; i < historicalData.length; i++) {
      const window = historicalData.slice(i - windowSize, i);
      const previousWindow = historicalData.slice(
        i - windowSize * 2,
        i - windowSize,
      );

      const shift = this.detectShift(window, previousWindow);
      if (shift.magnitude > 0.1) {
        // 10% threshold
        shifts.push({
          timestamp: historicalData[i].timestamp,
          shiftType: shift.type,
          magnitude: shift.magnitude,
          confidence: shift.confidence,
        });
      }
    }

    return shifts;
  }

  async generateMarketSignals(
    trendPrediction: TrendPrediction,
    currentPosition?: 'long' | 'short' | 'neutral',
  ): Promise<MarketSignal[]> {
    await Promise.resolve();
    const signals: MarketSignal[] = [];

    // Primary signal based on trend direction
    const primarySignal = this.generatePrimarySignal(
      trendPrediction,
      currentPosition,
    );
    signals.push(primarySignal);

    // Risk management signals
    const riskSignals = this.generateRiskSignals(trendPrediction);
    signals.push(...riskSignals);

    // Entry/exit signals based on support/resistance
    const levelSignals = this.generateLevelSignals(trendPrediction);
    signals.push(...levelSignals);

    return signals;
  }

  async recognizePatterns(
    timeSeriesData: TimeSeriesData[],
  ): Promise<PatternRecognition[]> {
    await Promise.resolve();
    const patterns: PatternRecognition[] = [];

    // Head and Shoulders
    const headAndShoulders = this.detectHeadAndShoulders(timeSeriesData);
    if (headAndShoulders) patterns.push(headAndShoulders);

    // Double Top/Bottom
    const doublePattern = this.detectDoublePattern(timeSeriesData);
    if (doublePattern) patterns.push(doublePattern);

    // Triangle patterns
    const trianglePattern = this.detectTrianglePattern(timeSeriesData);
    if (trianglePattern) patterns.push(trianglePattern);

    // Channel patterns
    const channelPattern = this.detectChannelPattern(timeSeriesData);
    if (channelPattern) patterns.push(channelPattern);

    // Breakout patterns
    const breakoutPattern = this.detectBreakoutPattern(timeSeriesData);
    if (breakoutPattern) patterns.push(breakoutPattern);

    return patterns;
  }

  async calculateVolatility(
    timeSeriesData: TimeSeriesData[],
    windowSize: number = 20,
  ): Promise<{
    current: number;
    average: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }> {
    await Promise.resolve();
    if (timeSeriesData.length < windowSize) {
      return { current: 0, average: 0, trend: 'stable' };
    }

    const returns = this.calculateReturns(timeSeriesData);
    const rollingVolatility = this.calculateRollingVolatility(
      returns,
      windowSize,
    );

    const current = rollingVolatility[rollingVolatility.length - 1];
    const average =
      rollingVolatility.reduce((sum, vol) => sum + vol, 0) /
      rollingVolatility.length;

    const trend = this.determineVolatilityTrend(rollingVolatility.slice(-10));

    return { current, average, trend };
  }

  private analyzeTechnicalIndicators(data: TimeSeriesData[]): any {
    const prices = data.map((d) => d.value);
    const volumes = data.map((d) => d.volume || 0);

    return {
      // Moving averages
      sma20: this.calculateSMA(prices, 20),
      sma50: this.calculateSMA(prices, 50),
      sma200: this.calculateSMA(prices, 200),

      // RSI
      rsi: this.calculateRSI(prices, 14),

      // MACD
      macd: this.calculateMACD(prices),

      // Bollinger Bands
      bollinger: this.calculateBollingerBands(prices, 20, 2),

      // Volume analysis
      volumeTrend: this.analyzeVolumeTrend(volumes),

      // Momentum
      momentum: this.calculateMomentum(prices, 10),
    };
  }

  private analyzeWeatherImpact(weatherData: WeatherData[]): any {
    if (weatherData.length === 0) return null;

    const recentWeather = weatherData.slice(-7); // Last 7 days
    const avgTemp =
      recentWeather.reduce((sum, d) => sum + d.temperature, 0) /
      recentWeather.length;
    const avgWindSpeed =
      recentWeather.reduce((sum, d) => sum + d.windSpeed, 0) /
      recentWeather.length;
    const totalPrecipitation = recentWeather.reduce(
      (sum, d) => sum + d.precipitation,
      0,
    );

    return {
      temperatureImpact: this.calculateTemperatureImpact(avgTemp),
      windImpact: this.calculateWindImpact(avgWindSpeed),
      precipitationImpact:
        this.calculatePrecipitationImpact(totalPrecipitation),
      overallImpact: this.calculateOverallWeatherImpact(recentWeather),
    };
  }

  private analyzeEconomicImpact(economicData: EconomicData[]): any {
    if (economicData.length === 0) return null;

    const latest = economicData[economicData.length - 1];
    const previous = economicData[economicData.length - 2] || latest;

    return {
      gdpImpact: this.calculateGDPImpact(latest.gdp, previous.gdp),
      inflationImpact: this.calculateInflationImpact(
        latest.inflation,
        previous.inflation,
      ),
      interestImpact: this.calculateInterestImpact(
        latest.interestRate,
        previous.interestRate,
      ),
      unemploymentImpact: this.calculateUnemploymentImpact(
        latest.unemployment,
        previous.unemployment,
      ),
      overallImpact: this.calculateOverallEconomicImpact(latest, previous),
    };
  }

  private combineSignals(technical: any, weather: any, economic: any): any {
    const weights = {
      technical: 0.6,
      weather: 0.2,
      economic: 0.2,
    };

    const directionScore = this.calculateDirectionScore(
      technical,
      weather,
      economic,
      weights,
    );
    const strengthScore = this.calculateStrengthScore(
      technical,
      weather,
      economic,
      weights,
    );
    const confidenceScore = this.calculateConfidenceScore(
      technical,
      weather,
      economic,
    );

    return {
      direction: this.scoreToDirection(directionScore),
      strength: this.scoreToStrength(strengthScore),
      confidence: confidenceScore,
      expectedChange: this.calculateExpectedChange(
        directionScore,
        strengthScore,
      ),
    };
  }

  private identifyPatterns(data: TimeSeriesData[]): PatternRecognition[] {
    // This would be async in a real implementation
    void data;
    return [];
  }

  private determineTimeframe(data: TimeSeriesData[]): string {
    const timeSpan =
      data[data.length - 1].timestamp.getTime() - data[0].timestamp.getTime();
    const days = timeSpan / (1000 * 60 * 60 * 24);

    if (days < 7) return 'intraday';
    if (days < 30) return 'short-term';
    if (days < 90) return 'medium-term';
    return 'long-term';
  }

  private identifyRiskFactors(
    signals: any,
    patterns: PatternRecognition[],
  ): string[] {
    const risks: string[] = [];

    if (signals.confidence < 0.7) risks.push('Low confidence in prediction');
    if (signals.strength === TrendStrength.WEAK)
      risks.push('Weak trend strength');

    patterns.forEach((pattern) => {
      if (pattern.pattern.includes('reversal')) {
        risks.push('Potential trend reversal');
      }
    });

    return risks;
  }

  private identifyKeyDrivers(
    technical: any,
    weather: any,
    economic: any,
  ): string[] {
    const drivers: string[] = [];

    if (technical && Math.abs(technical.rsi - 50) > 20) {
      drivers.push('Momentum (RSI)');
    }

    if (weather && Math.abs(weather.overallImpact) > 0.1) {
      drivers.push('Weather conditions');
    }

    if (economic && Math.abs(economic.overallImpact) > 0.1) {
      drivers.push('Economic indicators');
    }

    return drivers;
  }

  private predictReversalPoints(data: TimeSeriesData[], signals: any): Date[] {
    void signals;
    const reversals: Date[] = [];
    const prices = data.map((d) => d.value);

    // Find potential reversal points based on overbought/oversold conditions
    for (let i = 20; i < prices.length - 5; i++) {
      const window = prices.slice(i - 20, i + 5);
      const isExtremum = this.isLocalExtremum(window, 10);

      if (isExtremum) {
        reversals.push(data[i].timestamp);
      }
    }

    return reversals;
  }

  private calculateSupportLevels(data: TimeSeriesData[]): number[] {
    const prices = data.map((d) => d.value);
    const supports: number[] = [];

    // Find recent lows as support levels
    for (let i = 10; i < prices.length - 10; i++) {
      const window = prices.slice(i - 10, i + 10);
      if (prices[i] === Math.min(...window)) {
        supports.push(prices[i]);
      }
    }

    // Remove duplicates and sort
    return [...new Set(supports)].sort((a, b) => b - a).slice(0, 3);
  }

  private calculateResistanceLevels(data: TimeSeriesData[]): number[] {
    const prices = data.map((d) => d.value);
    const resistances: number[] = [];

    // Find recent highs as resistance levels
    for (let i = 10; i < prices.length - 10; i++) {
      const window = prices.slice(i - 10, i + 10);
      if (prices[i] === Math.max(...window)) {
        resistances.push(prices[i]);
      }
    }

    // Remove duplicates and sort
    return [...new Set(resistances)].sort((a, b) => a - b).slice(0, 3);
  }

  private detectShift(
    window: TimeSeriesData[],
    previousWindow: TimeSeriesData[],
  ): any {
    const windowAvg =
      window.reduce((sum, d) => sum + d.value, 0) / window.length;
    const previousAvg =
      previousWindow.reduce((sum, d) => sum + d.value, 0) /
      previousWindow.length;

    const change = (windowAvg - previousAvg) / previousAvg;

    return {
      type: change > 0 ? 'increase' : 'decrease',
      magnitude: Math.abs(change),
      confidence: Math.min(1, Math.abs(change) * 10),
    };
  }

  private generatePrimarySignal(
    trend: TrendPrediction,
    currentPosition?: string,
  ): MarketSignal {
    let type: 'buy' | 'sell' | 'hold';
    let reason: string;

    if (
      trend.direction === TrendDirection.UP &&
      trend.strength !== TrendStrength.WEAK
    ) {
      type = currentPosition === 'short' ? 'buy' : 'hold';
      reason = 'Upward trend detected';
    } else if (
      trend.direction === TrendDirection.DOWN &&
      trend.strength !== TrendStrength.WEAK
    ) {
      type = currentPosition === 'long' ? 'sell' : 'hold';
      reason = 'Downward trend detected';
    } else {
      type = 'hold';
      reason = 'Sideways or weak trend';
    }

    return {
      type,
      strength: trend.confidence,
      reason,
      timeframe: trend.timeframe,
      confidence: trend.confidence,
    };
  }

  private generateRiskSignals(trend: TrendPrediction): MarketSignal[] {
    const signals: MarketSignal[] = [];

    if (trend.confidence < 0.6) {
      signals.push({
        type: 'hold',
        strength: 0.8,
        reason: 'Low confidence - reduce position size',
        timeframe: trend.timeframe,
        confidence: 0.8,
      });
    }

    if (trend.riskFactors.length > 2) {
      signals.push({
        type: 'hold',
        strength: 0.7,
        reason: 'Multiple risk factors identified',
        timeframe: trend.timeframe,
        confidence: 0.7,
      });
    }

    return signals;
  }

  private generateLevelSignals(trend: TrendPrediction): MarketSignal[] {
    const signals: MarketSignal[] = [];

    // Support level signals
    trend.supportLevels.forEach((level) => {
      signals.push({
        type: 'buy',
        strength: 0.6,
        reason: `Near support level at ${level}`,
        timeframe: 'short-term',
        confidence: 0.6,
      });
    });

    // Resistance level signals
    trend.resistanceLevels.forEach((level) => {
      signals.push({
        type: 'sell',
        strength: 0.6,
        reason: `Near resistance level at ${level}`,
        timeframe: 'short-term',
        confidence: 0.6,
      });
    });

    return signals;
  }

  // Technical indicator calculations
  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    const sum = prices.slice(-period).reduce((sum, price) => sum + price, 0);
    return sum / period;
  }

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;

    const returns = this.calculateReturns(
      prices.map((price) => ({ timestamp: new Date(), value: price })),
    );
    const gains = returns.filter((r) => r > 0).slice(-period);
    const losses = returns
      .filter((r) => r < 0)
      .map((r) => Math.abs(r))
      .slice(-period);

    const avgGain =
      gains.reduce((sum, gain) => sum + gain, 0) / gains.length || 0;
    const avgLoss =
      losses.reduce((sum, loss) => sum + loss, 0) / losses.length || 0;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  private calculateMACD(prices: number[]): any {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;
    const signalLine = this.calculateEMA([macdLine], 9);

    return {
      macd: macdLine,
      signal: signalLine,
      histogram: macdLine - signalLine,
    };
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    if (prices.length === 1) return prices[0];

    const multiplier = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * multiplier + ema * (1 - multiplier);
    }

    return ema;
  }

  private calculateBollingerBands(
    prices: number[],
    period: number,
    stdDev: number,
  ): any {
    if (prices.length < period) return { upper: 0, middle: 0, lower: 0 };

    const middle = this.calculateSMA(prices, period);
    const recentPrices = prices.slice(-period);
    const variance =
      recentPrices.reduce(
        (sum, price) => sum + Math.pow(price - middle, 2),
        0,
      ) / period;
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: middle + standardDeviation * stdDev,
      middle,
      lower: middle - standardDeviation * stdDev,
    };
  }

  private analyzeVolumeTrend(volumes: number[]): any {
    const avgVolume =
      volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    const recentVolume =
      volumes.slice(-5).reduce((sum, vol) => sum + vol, 0) / 5;

    return {
      current: recentVolume,
      average: avgVolume,
      trend: recentVolume > avgVolume * 1.2 ? 'increasing' : 'normal',
    };
  }

  private calculateMomentum(prices: number[], period: number): number {
    if (prices.length < period + 1) return 0;
    const current = prices[prices.length - 1];
    const previous = prices[prices.length - 1 - period];
    return ((current - previous) / previous) * 100;
  }

  private calculateReturns(data: TimeSeriesData[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < data.length; i++) {
      const returnValue =
        (data[i].value - data[i - 1].value) / data[i - 1].value;
      returns.push(returnValue);
    }
    return returns;
  }

  private calculateRollingVolatility(
    returns: number[],
    windowSize: number,
  ): number[] {
    const volatilities: number[] = [];

    for (let i = windowSize; i < returns.length; i++) {
      const window = returns.slice(i - windowSize, i);
      const mean = window.reduce((sum, ret) => sum + ret, 0) / window.length;
      const variance =
        window.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
        window.length;
      volatilities.push(Math.sqrt(variance) * Math.sqrt(252)); // Annualized
    }

    return volatilities;
  }

  private determineVolatilityTrend(
    recentVolatility: number[],
  ): 'increasing' | 'decreasing' | 'stable' {
    if (recentVolatility.length < 2) return 'stable';

    const first = recentVolatility[0];
    const last = recentVolatility[recentVolatility.length - 1];
    const change = (last - first) / first;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  // Pattern detection methods
  private detectHeadAndShoulders(
    data: TimeSeriesData[],
  ): PatternRecognition | null {
    // Simplified head and shoulders detection
    const prices = data.map((d) => d.value);
    if (prices.length < 20) return null;

    // Look for the pattern in the last 20 data points
    const recent = prices.slice(-20);
    const leftShoulder = Math.max(...recent.slice(0, 5));
    const head = Math.max(...recent.slice(5, 10));
    const rightShoulder = Math.max(...recent.slice(10, 15));

    if (
      head > leftShoulder &&
      head > rightShoulder &&
      Math.abs(leftShoulder - rightShoulder) / leftShoulder < 0.1
    ) {
      return {
        pattern: 'Head and Shoulders',
        confidence: 0.7,
        description: 'Bearish reversal pattern detected',
        implications: 'Potential downward movement',
        timeframe: 'medium-term',
      };
    }

    return null;
  }

  private detectDoublePattern(
    data: TimeSeriesData[],
  ): PatternRecognition | null {
    const prices = data.map((d) => d.value);
    if (prices.length < 20) return null;

    const recent = prices.slice(-20);
    const peaks = this.findPeaks(recent);

    if (peaks.length >= 2) {
      const firstPeak = peaks[peaks.length - 2];
      const secondPeak = peaks[peaks.length - 1];

      if (
        Math.abs(firstPeak.value - secondPeak.value) / firstPeak.value <
        0.05
      ) {
        return {
          pattern: 'Double Top',
          confidence: 0.6,
          description: 'Bearish reversal pattern',
          implications: 'Potential downward break',
          timeframe: 'short-term',
        };
      }
    }

    return null;
  }

  private detectTrianglePattern(
    data: TimeSeriesData[],
  ): PatternRecognition | null {
    // Simplified triangle pattern detection
    void data;
    return null;
  }

  private detectChannelPattern(
    data: TimeSeriesData[],
  ): PatternRecognition | null {
    // Simplified channel pattern detection
    void data;
    return null;
  }

  private detectBreakoutPattern(
    data: TimeSeriesData[],
  ): PatternRecognition | null {
    // Simplified breakout pattern detection
    void data;
    return null;
  }

  private findPeaks(prices: number[]): Array<{ index: number; value: number }> {
    const peaks: Array<{ index: number; value: number }> = [];

    for (let i = 1; i < prices.length - 1; i++) {
      if (prices[i] > prices[i - 1] && prices[i] > prices[i + 1]) {
        peaks.push({ index: i, value: prices[i] });
      }
    }

    return peaks;
  }

  private isLocalExtremum(window: number[], position: number): boolean {
    const value = window[position];
    const left = window.slice(0, position);
    const right = window.slice(position + 1);

    const isMax =
      left.every((v) => v <= value) && right.every((v) => v <= value);
    const isMin =
      left.every((v) => v >= value) && right.every((v) => v >= value);

    return isMax || isMin;
  }

  // Helper methods for signal combination
  private calculateDirectionScore(
    technical: any,
    weather: any,
    economic: any,
    weights: any,
  ): number {
    let score = 0;

    if (technical) {
      score += (technical.rsi > 50 ? 1 : -1) * weights.technical;
    }

    if (weather) {
      score += weather.overallImpact * weights.weather;
    }

    if (economic) {
      score += economic.overallImpact * weights.economic;
    }

    return Math.max(-1, Math.min(1, score));
  }

  private calculateStrengthScore(
    technical: any,
    weather: any,
    economic: any,
    weights: any,
  ): number {
    let strength = 0;

    if (technical) {
      strength += (Math.abs(technical.rsi - 50) / 50) * weights.technical;
    }

    if (weather) {
      strength += Math.abs(weather.overallImpact) * weights.weather;
    }

    if (economic) {
      strength += Math.abs(economic.overallImpact) * weights.economic;
    }

    return Math.max(0, Math.min(1, strength));
  }

  private calculateConfidenceScore(
    technical: any,
    weather: any,
    economic: any,
  ): number {
    let confidence = 0.5; // Base confidence
    let factors = 1;

    if (technical) {
      confidence += 0.2;
      factors++;
    }

    if (weather) {
      confidence += 0.1;
      factors++;
    }

    if (economic) {
      confidence += 0.2;
      factors++;
    }

    return Math.max(0.3, Math.min(0.95, confidence / factors));
  }

  private scoreToDirection(score: number): TrendDirection {
    if (score > 0.3) return TrendDirection.UP;
    if (score < -0.3) return TrendDirection.DOWN;
    if (Math.abs(score) < 0.1) return TrendDirection.SIDEWAYS;
    return TrendDirection.VOLATILE;
  }

  private scoreToStrength(score: number): TrendStrength {
    if (score > 0.8) return TrendStrength.VERY_STRONG;
    if (score > 0.6) return TrendStrength.STRONG;
    if (score > 0.4) return TrendStrength.MODERATE;
    return TrendStrength.WEAK;
  }

  private calculateExpectedChange(
    directionScore: number,
    strengthScore: number,
  ): number {
    return directionScore * strengthScore * 0.15; // Max 15% change
  }

  // Weather impact calculations
  private calculateTemperatureImpact(temp: number): number {
    const optimal = 20; // Optimal temperature in Celsius
    const deviation = Math.abs(temp - optimal);
    return -deviation * 0.01; // Negative impact for deviation
  }

  private calculateWindImpact(windSpeed: number): number {
    if (windSpeed >= 3 && windSpeed <= 25) {
      return windSpeed * 0.002; // Positive impact for wind energy
    }
    return 0;
  }

  private calculatePrecipitationImpact(precipitation: number): number {
    return precipitation * 0.001; // Positive impact for hydro
  }

  private calculateOverallWeatherImpact(weatherData: WeatherData[]): number {
    const impacts = weatherData.map(
      (d) =>
        this.calculateTemperatureImpact(d.temperature) +
        this.calculateWindImpact(d.windSpeed) +
        this.calculatePrecipitationImpact(d.precipitation),
    );
    return impacts.reduce((sum, impact) => sum + impact, 0) / impacts.length;
  }

  // Economic impact calculations
  private calculateGDPImpact(current: number, previous: number): number {
    const growth = (current - previous) / previous;
    return growth * 0.3;
  }

  private calculateInflationImpact(current: number, previous: number): number {
    const change = current - previous;
    return change * 0.05;
  }

  private calculateInterestImpact(current: number, previous: number): number {
    const change = current - previous;
    return -change * 0.02;
  }

  private calculateUnemploymentImpact(
    current: number,
    previous: number,
  ): number {
    const change = current - previous;
    return -change * 0.03;
  }

  private calculateOverallEconomicImpact(
    current: EconomicData,
    previous: EconomicData,
  ): number {
    const impacts = [
      this.calculateGDPImpact(current.gdp, previous.gdp),
      this.calculateInflationImpact(current.inflation, previous.inflation),
      this.calculateInterestImpact(current.interestRate, previous.interestRate),
      this.calculateUnemploymentImpact(
        current.unemployment,
        previous.unemployment,
      ),
    ];
    return impacts.reduce((sum, impact) => sum + impact, 0) / impacts.length;
  }
}
