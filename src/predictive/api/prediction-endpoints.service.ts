import { Injectable } from '@nestjs/common';
import { Prediction } from '../predictive.service';

@Injectable()
export class PredictionEndpointsService {
  private readonly predictions: Map<string, Prediction[]> = new Map();
  private readonly modelEndpoints: Map<string, any> = new Map();

  constructor() {
    this.initializeEndpoints();
  }

  async getPredictionsForModel(modelName: string, horizonHours: number): Promise<Prediction[]> {
    const modelPredictions = this.predictions.get(modelName) || [];
    
    // Filter predictions by horizon
    const cutoffTime = new Date(Date.now() + horizonHours * 60 * 60 * 1000);
    const filteredPredictions = modelPredictions.filter(p => 
      new Date(p.timestamp) <= cutoffTime
    );

    // Generate new predictions if needed
    if (filteredPredictions.length < horizonHours) {
      const newPredictions = this.generatePredictions(modelName, horizonHours);
      this.predictions.set(modelName, [...modelPredictions, ...newPredictions]);
      return newPredictions;
    }

    return filteredPredictions.slice(0, horizonHours);
  }

  async getAllPredictions(horizonHours: number): Promise<Prediction[]> {
    const allPredictions: Prediction[] = [];
    
    for (const [modelName, predictions] of this.predictions.entries()) {
      const modelPredictions = await this.getPredictionsForModel(modelName, horizonHours);
      allPredictions.push(...modelPredictions);
    }

    return allPredictions.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  async makePrediction(modelName: string, data: any, options?: any): Promise<Prediction> {
    const endpoint = this.modelEndpoints.get(modelName);
    if (!endpoint) {
      throw new Error(`Model endpoint not found: ${modelName}`);
    }

    // Simulate prediction
    const prediction = this.simulatePrediction(modelName, data, options);
    
    // Store prediction
    const modelPredictions = this.predictions.get(modelName) || [];
    modelPredictions.push(prediction);
    this.predictions.set(modelName, modelPredictions);

    return prediction;
  }

  async getPredictionHistory(modelName?: string, limit = 100): Promise<Prediction[]> {
    if (modelName) {
      const predictions = this.predictions.get(modelName) || [];
      return predictions.slice(-limit);
    }

    const allPredictions: Prediction[] = [];
    for (const predictions of this.predictions.values()) {
      allPredictions.push(...predictions);
    }

    return allPredictions
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getEndpointMetrics(modelName: string): Promise<any> {
    const endpoint = this.modelEndpoints.get(modelName);
    if (!endpoint) {
      throw new Error(`Model endpoint not found: ${modelName}`);
    }

    const predictions = this.predictions.get(modelName) || [];
    const recentPredictions = predictions.filter(p => 
      (Date.now() - new Date(p.timestamp).getTime()) < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    return {
      modelName,
      totalPredictions: predictions.length,
      recentPredictions: recentPredictions.length,
      averageConfidence: this.calculateAverageConfidence(recentPredictions),
      averageLatency: endpoint.averageLatency,
      throughput: endpoint.throughput,
      errorRate: endpoint.errorRate,
      uptime: endpoint.uptime,
      lastUpdated: new Date().toISOString(),
    };
  }

  private generatePredictions(modelName: string, horizonHours: number): Prediction[] {
    const predictions: Prediction[] = [];
    const baseValue = this.getBaseValueForModel(modelName);

    for (let i = 1; i <= horizonHours; i++) {
      const timestamp = new Date(Date.now() + i * 60 * 60 * 1000).toISOString();
      
      // Generate prediction with some randomness and trend
      const trend = i * 0.5;
      const noise = (Math.random() - 0.5) * 10;
      const value = baseValue + trend + noise;
      
      predictions.push({
        id: this.generatePredictionId(),
        modelId: modelName,
        timestamp,
        value: Math.max(0, value),
        confidence: Math.max(0.5, 0.95 - (i * 0.01)), // Decreasing confidence
        features: this.generateFeatures(modelName),
        metadata: {
          horizon: i,
          method: 'forecast',
          version: '1.0',
        },
      });
    }

    return predictions;
  }

  private simulatePrediction(modelName: string, data: any, options?: any): Prediction {
    const baseValue = this.getBaseValueForModel(modelName);
    let predictionValue = baseValue;

    // Apply input data influence
    if (data.features) {
      predictionValue += this.calculateFeatureImpact(data.features, modelName);
    }

    // Add randomness
    predictionValue += (Math.random() - 0.5) * 5;

    return {
      id: this.generatePredictionId(),
      modelId: modelName,
      timestamp: new Date().toISOString(),
      value: Math.max(0, predictionValue),
      confidence: 0.8 + Math.random() * 0.15, // 80-95% confidence
      features: data.features || {},
      metadata: {
        method: 'real-time',
        version: options?.version || '1.0',
        inputSize: JSON.stringify(data).length,
      },
    };
  }

  private calculateAverageConfidence(predictions: Prediction[]): number {
    if (predictions.length === 0) return 0;
    
    const totalConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0);
    return totalConfidence / predictions.length;
  }

  private getBaseValueForModel(modelName: string): number {
    const baseValues: Record<string, number> = {
      'energy-demand-predictor': 1000,
      'price-classifier': 50,
      'supply-forecaster': 1200,
      'trading-signal-generator': 0.8,
    };

    return baseValues[modelName] || 100;
  }

  private calculateFeatureImpact(features: any, modelName: string): number {
    let impact = 0;

    // Simulate feature impact based on model type
    if (modelName.includes('demand')) {
      if (features.weather_temp) impact += features.weather_temp * 2;
      if (features.time_of_day) impact += features.time_of_day * 10;
      if (features.day_of_week) impact += features.day_of_week * 5;
    } else if (modelName.includes('price')) {
      if (features.volume) impact += features.volume * 0.001;
      if (features.sentiment_score) impact += features.sentiment_score * 20;
      if (features.market_cap) impact += features.market_cap * 0.00001;
    } else if (modelName.includes('supply')) {
      if (features.weather_temp) impact += features.weather_temp * 3;
      if (features.maintenance) impact -= features.maintenance * 50;
      if (features.capacity) impact += features.capacity * 0.8;
    }

    return impact;
  }

  private generateFeatures(modelName: string): any {
    const baseFeatures = {
      timestamp: new Date().toISOString(),
      hour_of_day: new Date().getHours(),
      day_of_week: new Date().getDay(),
    };

    if (modelName.includes('demand') || modelName.includes('supply')) {
      return {
        ...baseFeatures,
        weather_temp: 15 + Math.random() * 20,
        weather_humidity: 40 + Math.random() * 40,
        season: Math.floor(new Date().getMonth() / 3),
      };
    } else if (modelName.includes('price')) {
      return {
        ...baseFeatures,
        volume: 1000000 + Math.random() * 5000000,
        market_cap: 1000000000 + Math.random() * 9000000000,
        sentiment_score: Math.random() * 2 - 1,
      };
    } else if (modelName.includes('trading')) {
      return {
        ...baseFeatures,
        price_trend: Math.random() > 0.5 ? 1 : -1,
        volatility: Math.random() * 0.3,
        spread: Math.random() * 10,
      };
    }

    return baseFeatures;
  }

  private generatePredictionId(): string {
    return `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeEndpoints(): void {
    const models = [
      'energy-demand-predictor',
      'price-classifier',
      'supply-forecaster',
      'trading-signal-generator',
    ];

    models.forEach(modelName => {
      this.modelEndpoints.set(modelName, {
        modelName,
        url: `/api/predictive/models/${modelName}/predict`,
        method: 'POST',
        averageLatency: 50 + Math.random() * 100,
        throughput: 100 + Math.random() * 200,
        errorRate: Math.random() * 0.02,
        uptime: 99 + Math.random(),
        lastUsed: new Date().toISOString(),
      });

      // Initialize with some predictions
      this.predictions.set(modelName, this.generatePredictions(modelName, 24));
    });
  }
}
