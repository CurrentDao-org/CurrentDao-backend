import { Injectable } from '@nestjs/common';
import { PredictiveInsight } from '../predictive.service';

@Injectable()
export class InsightsGeneratorService {
  private readonly insights: PredictiveInsight[] = [];

  constructor() {
    this.initializeInsights();
  }

  async getInsights(type?: string, periodDays = 7): Promise<PredictiveInsight[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    let filteredInsights = this.insights.filter(insight => 
      new Date(insight.timestamp) >= cutoffDate
    );

    if (type) {
      filteredInsights = filteredInsights.filter(insight => insight.type === type);
    }

    return filteredInsights.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async generateInsights(data: any): Promise<PredictiveInsight[]> {
    const newInsights: PredictiveInsight[] = [];

    // Analyze trends
    const trendInsights = this.analyzeTrends(data);
    newInsights.push(...trendInsights);

    // Detect anomalies
    const anomalyInsights = this.detectAnomalies(data);
    newInsights.push(...anomalyInsights);

    // Identify opportunities
    const opportunityInsights = this.identifyOpportunities(data);
    newInsights.push(...opportunityInsights);

    // Assess risks
    const riskInsights = this.assessRisks(data);
    newInsights.push(...riskInsights);

    // Store new insights
    this.insights.push(...newInsights);

    // Keep only last 1000 insights
    if (this.insights.length > 1000) {
      this.insights.splice(0, 200);
    }

    return newInsights;
  }

  private analyzeTrends(data: any): PredictiveInsight[] {
    const insights: PredictiveInsight[] = [];

    // Energy demand trend
    if (data.energyDemand && data.energyDemand.trend === 'increasing') {
      insights.push({
        id: this.generateInsightId(),
        type: 'trend',
        title: 'Energy Demand Increasing',
        description: `Energy demand shows an increasing trend of ${data.energyDemand.rate}% over the last period`,
        confidence: 0.85,
        impact: 'high',
        actionable: true,
        recommendations: [
          'Consider increasing energy procurement',
          'Review pricing strategies',
          'Monitor supply capacity',
        ],
        timestamp: new Date().toISOString(),
      });
    }

    // Price trend
    if (data.price && data.price.volatility > 0.15) {
      insights.push({
        id: this.generateInsightId(),
        type: 'trend',
        title: 'High Price Volatility Detected',
        description: `Price volatility is ${data.price.volatility}%, indicating market uncertainty`,
        confidence: 0.78,
        impact: 'medium',
        actionable: true,
        recommendations: [
          'Implement hedging strategies',
          'Increase price monitoring frequency',
          'Consider flexible pricing contracts',
        ],
        timestamp: new Date().toISOString(),
      });
    }

    return insights;
  }

  private detectAnomalies(data: any): PredictiveInsight[] {
    const insights: PredictiveInsight[] = [];

    // Demand anomaly
    if (data.energyDemand && data.energyDemand.anomalies > 0) {
      insights.push({
        id: this.generateInsightId(),
        type: 'anomaly',
        title: 'Unusual Demand Patterns Detected',
        description: `${data.energyDemand.anomalies} anomalies detected in energy demand patterns`,
        confidence: 0.92,
        impact: 'medium',
        actionable: true,
        recommendations: [
          'Investigate cause of anomalies',
          'Review data quality',
          'Adjust forecasting models',
        ],
        timestamp: new Date().toISOString(),
      });
    }

    // Supply anomaly
    if (data.supply && data.supply.gap > 100) {
      insights.push({
        id: this.generateInsightId(),
        type: 'anomaly',
        title: 'Supply-Demand Gap Detected',
        description: `Unusual supply-demand gap of ${data.supply.gap} MW detected`,
        confidence: 0.88,
        impact: 'high',
        actionable: true,
        recommendations: [
          'Activate backup supply sources',
          'Review demand response programs',
          'Consider emergency procurement',
        ],
        timestamp: new Date().toISOString(),
      });
    }

    return insights;
  }

  private identifyOpportunities(data: any): PredictiveInsight[] {
    const insights: PredictiveInsight[] = [];

    // Trading opportunity
    if (data.trading && data.trading.spread > 5) {
      insights.push({
        id: this.generateInsightId(),
        type: 'opportunity',
        title: 'Trading Opportunity Detected',
        description: `Price spread of ${data.trading.spread}% presents trading opportunity`,
        confidence: 0.75,
        impact: 'medium',
        actionable: true,
        recommendations: [
          'Execute arbitrage strategy',
          'Monitor market conditions',
          'Set profit targets',
        ],
        timestamp: new Date().toISOString(),
      });
    }

    // Efficiency opportunity
    if (data.efficiency && data.efficiency.potential > 10) {
      insights.push({
        id: this.generateInsightId(),
        type: 'opportunity',
        title: 'Efficiency Improvement Opportunity',
        description: `${data.efficiency.potential}% efficiency improvement potential identified`,
        confidence: 0.82,
        impact: 'medium',
        actionable: true,
        recommendations: [
          'Implement optimization measures',
          'Review operational processes',
          'Invest in efficiency technologies',
        ],
        timestamp: new Date().toISOString(),
      });
    }

    return insights;
  }

  private assessRisks(data: any): PredictiveInsight[] {
    const insights: PredictiveInsight[] = [];

    // Supply risk
    if (data.supply && data.supply.reliability < 0.9) {
      insights.push({
        id: this.generateInsightId(),
        type: 'risk',
        title: 'Supply Reliability Risk',
        description: `Supply reliability at ${data.supply.reliability * 100}% below optimal levels`,
        confidence: 0.89,
        impact: 'high',
        actionable: true,
        recommendations: [
          'Diversify supply sources',
          'Increase buffer capacity',
          'Review supplier contracts',
        ],
        timestamp: new Date().toISOString(),
      });
    }

    // Weather risk
    if (data.weather && data.weather.impact > 0.3) {
      insights.push({
        id: this.generateInsightId(),
        type: 'risk',
        title: 'Weather-Related Risk',
        description: `High weather impact (${(data.weather.impact * 100).toFixed(1)}%) on operations detected`,
        confidence: 0.85,
        impact: 'medium',
        actionable: true,
        recommendations: [
          'Activate weather contingency plans',
          'Monitor forecasts closely',
          'Prepare backup systems',
        ],
        timestamp: new Date().toISOString(),
      });
    }

    return insights;
  }

  private generateInsightId(): string {
    return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeInsights(): void {
    const mockInsights: PredictiveInsight[] = [
      {
        id: 'insight_1',
        type: 'trend',
        title: 'Rising Energy Demand',
        description: 'Energy demand has increased by 15% over the past week',
        confidence: 0.87,
        impact: 'high',
        actionable: true,
        recommendations: [
          'Increase supply procurement',
          'Review pricing strategy',
          'Monitor grid capacity',
        ],
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'insight_2',
        type: 'opportunity',
        title: 'Price Arbitrage Opportunity',
        description: 'Price difference between regions presents arbitrage opportunity',
        confidence: 0.78,
        impact: 'medium',
        actionable: true,
        recommendations: [
          'Execute cross-regional trades',
          'Monitor price convergence',
          'Set profit targets',
        ],
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'insight_3',
        type: 'risk',
        title: 'Supply Chain Disruption Risk',
        description: 'Weather conditions may impact supply reliability',
        confidence: 0.82,
        impact: 'high',
        actionable: true,
        recommendations: [
          'Activate backup suppliers',
          'Increase inventory levels',
          'Review contingency plans',
        ],
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'insight_4',
        type: 'anomaly',
        title: 'Unusual Consumption Pattern',
        description: 'Anomalous energy consumption pattern detected in industrial sector',
        confidence: 0.91,
        impact: 'medium',
        actionable: true,
        recommendations: [
          'Investigate cause of anomaly',
          'Verify data quality',
          'Contact affected customers',
        ],
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      },
    ];

    this.insights.push(...mockInsights);
  }
}
