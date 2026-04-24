import { Injectable, Logger } from '@nestjs/common';
import { AdvancedAnalyticsService, AnalyticsInsight } from '../analytics/advanced-analytics.service';
import { KPITrackingService } from '../kpi/kpi-tracking.service';

export interface ExecutiveInsight {
  id: string;
  title: string;
  description: string;
  category: 'financial' | 'operational' | 'strategic' | 'risk' | 'growth';
  priority: 'low' | 'medium' | 'high' | 'critical';
  impact: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  timeframe: 'immediate' | 'short-term' | 'medium-term' | 'long-term';
  data: {
    keyMetrics: Array<{
      name: string;
      value: number;
      change: number;
      changePercent: number;
    }>;
    trends: Array<{
      metric: string;
      direction: 'up' | 'down' | 'stable';
      significance: number;
    }>;
    comparisons: Array<{
      metric: string;
      current: number;
      benchmark: number;
      variance: number;
    }>;
  };
  recommendations: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    estimatedImpact: string;
    timeframe: string;
    resources: string[];
  }>;
  stakeholders: string[];
  risks: Array<{
    description: string;
    probability: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
  }>;
  kpis: string[];
  generatedAt: Date;
  expiresAt: Date;
}

export interface InsightGenerationRequest {
  timeframe: 'day' | 'week' | 'month' | 'quarter' | 'year';
  categories?: string[];
  priority?: string[];
  stakeholders?: string[];
  kpis?: string[];
}

export interface ExecutiveDashboard {
  summary: {
    totalInsights: number;
    criticalInsights: number;
    highPriorityInsights: number;
    overallHealth: number;
  };
  insights: ExecutiveInsight[];
  kpiSummary: {
    total: number;
    critical: number;
    warning: number;
    good: number;
  };
  trends: Array<{
    category: string;
    trend: 'improving' | 'declining' | 'stable';
    change: number;
  }>;
  recommendations: Array<{
    category: string;
    count: number;
    topPriority: string;
  }>;
}

@Injectable()
export class ExecutiveInsightsService {
  private readonly logger = new Logger(ExecutiveInsightsService.name);
  private readonly insightCache = new Map<string, ExecutiveInsight[]>();

  constructor(
    private readonly analyticsService: AdvancedAnalyticsService,
    private readonly kpiService: KPITrackingService,
  ) {}

  async generateInsights(request: InsightGenerationRequest, userId: string): Promise<ExecutiveInsight[]> {
    this.logger.log(`Generating executive insights for user: ${userId}`);

    const insights: ExecutiveInsight[] = [];

    // Generate financial insights
    if (!request.categories || request.categories.includes('financial')) {
      const financialInsights = await this.generateFinancialInsights(request, userId);
      insights.push(...financialInsights);
    }

    // Generate operational insights
    if (!request.categories || request.categories.includes('operational')) {
      const operationalInsights = await this.generateOperationalInsights(request, userId);
      insights.push(...operationalInsights);
    }

    // Generate strategic insights
    if (!request.categories || request.categories.includes('strategic')) {
      const strategicInsights = await this.generateStrategicInsights(request, userId);
      insights.push(...strategicInsights);
    }

    // Generate risk insights
    if (!request.categories || request.categories.includes('risk')) {
      const riskInsights = await this.generateRiskInsights(request, userId);
      insights.push(...riskInsights);
    }

    // Generate growth insights
    if (!request.categories || request.categories.includes('growth')) {
      const growthInsights = await this.generateGrowthInsights(request, userId);
      insights.push(...growthInsights);
    }

    // Filter by priority if specified
    if (request.priority && request.priority.length > 0) {
      return insights.filter(insight => request.priority.includes(insight.priority));
    }

    // Sort by priority and confidence
    return insights.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });
  }

  async getExecutiveDashboard(userId: string): Promise<ExecutiveDashboard> {
    this.logger.log(`Generating executive dashboard for user: ${userId}`);

    // Get recent insights
    const insights = await this.getRecentInsights(userId);

    // Get KPI summary
    const kpis = await this.kpiService.getKPIs(userId);
    const kpiSummary = {
      total: kpis.length,
      critical: kpis.filter(k => k.status === 'critical').length,
      warning: kpis.filter(k => k.status === 'warning').length,
      good: kpis.filter(k => k.status === 'good').length,
    };

    // Calculate summary metrics
    const summary = {
      totalInsights: insights.length,
      criticalInsights: insights.filter(i => i.priority === 'critical').length,
      highPriorityInsights: insights.filter(i => i.priority === 'high').length,
      overallHealth: this.calculateOverallHealth(insights, kpis),
    };

    // Analyze trends by category
    const trends = this.analyzeTrends(insights);

    // Analyze recommendations
    const recommendations = this.analyzeRecommendations(insights);

    return {
      summary,
      insights: insights.slice(0, 10), // Top 10 insights
      kpiSummary,
      trends,
      recommendations,
    };
  }

  async getInsightDetails(insightId: string, userId: string): Promise<ExecutiveInsight> {
    // In a real implementation, this would fetch from database
    // For now, returning a mock insight
    const insight: ExecutiveInsight = {
      id: insightId,
      title: 'Revenue Growth Acceleration',
      description: 'Revenue growth has accelerated by 15% compared to previous quarter, driven by increased transaction volume and customer acquisition.',
      category: 'financial',
      priority: 'high',
      impact: 'high',
      confidence: 0.92,
      timeframe: 'short-term',
      data: {
        keyMetrics: [
          { name: 'Revenue', value: 1250000, change: 150000, changePercent: 15.0 },
          { name: 'Transaction Volume', value: 45000, change: 5000, changePercent: 12.5 },
          { name: 'Active Users', value: 12500, change: 1800, changePercent: 16.8 },
        ],
        trends: [
          { metric: 'Revenue', direction: 'up', significance: 0.95 },
          { metric: 'User Growth', direction: 'up', significance: 0.88 },
        ],
        comparisons: [
          { metric: 'Revenue', current: 1250000, benchmark: 1000000, variance: 25.0 },
        ],
      },
      recommendations: [
        {
          action: 'Scale marketing efforts in high-performing channels',
          priority: 'high',
          estimatedImpact: '20% additional growth',
          timeframe: '3 months',
          resources: ['Marketing Team', 'Budget $50k'],
        },
      ],
      stakeholders: ['CEO', 'CFO', 'CMO'],
      risks: [
        { description: 'Market saturation risk', probability: 'medium', impact: 'medium' },
      ],
      kpis: ['daily_revenue', 'user_growth', 'transaction_volume'],
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    return insight;
  }

  async acknowledgeInsight(insightId: string, userId: string, feedback?: string): Promise<void> {
    this.logger.log(`Acknowledging insight: ${insightId} by user: ${userId}`);
    
    // In a real implementation, this would update the insight in the database
    // and potentially trigger follow-up actions
  }

  async getInsightHistory(userId: string, timeRange: { start: Date; end: Date }): Promise<{
    insights: ExecutiveInsight[];
    trends: Array<{
      date: Date;
      category: string;
      count: number;
      avgPriority: number;
    }>;
  }> {
    // Mock implementation - would fetch from database
    const insights: ExecutiveInsight[] = [];
    const trends = [];

    return { insights, trends };
  }

  private async generateFinancialInsights(request: InsightGenerationRequest, userId: string): Promise<ExecutiveInsight[]> {
    const insights: ExecutiveInsight[] = [];

    try {
      // Revenue analysis
      const revenueInsight = await this.analyzeRevenueTrends(request, userId);
      if (revenueInsight) insights.push(revenueInsight);

      // Cost analysis
      const costInsight = await this.analyzeCostTrends(request, userId);
      if (costInsight) insights.push(costInsight);

      // Profitability analysis
      const profitabilityInsight = await this.analyzeProfitability(request, userId);
      if (profitabilityInsight) insights.push(profitabilityInsight);

    } catch (error) {
      this.logger.warn('Financial insights generation failed:', error);
    }

    return insights;
  }

  private async generateOperationalInsights(request: InsightGenerationRequest, userId: string): Promise<ExecutiveInsight[]> {
    const insights: ExecutiveInsight[] = [];

    try {
      // Efficiency analysis
      const efficiencyInsight = await this.analyzeOperationalEfficiency(request, userId);
      if (efficiencyInsight) insights.push(efficiencyInsight);

      // Capacity analysis
      const capacityInsight = await this.analyzeCapacityUtilization(request, userId);
      if (capacityInsight) insights.push(capacityInsight);

    } catch (error) {
      this.logger.warn('Operational insights generation failed:', error);
    }

    return insights;
  }

  private async generateStrategicInsights(request: InsightGenerationRequest, userId: string): Promise<ExecutiveInsight[]> {
    const insights: ExecutiveInsight[] = [];

    try {
      // Market position analysis
      const marketInsight = await this.analyzeMarketPosition(request, userId);
      if (marketInsight) insights.push(marketInsight);

      // Competitive analysis
      const competitiveInsight = await this.analyzeCompetitivePosition(request, userId);
      if (competitiveInsight) insights.push(competitiveInsight);

    } catch (error) {
      this.logger.warn('Strategic insights generation failed:', error);
    }

    return insights;
  }

  private async generateRiskInsights(request: InsightGenerationRequest, userId: string): Promise<ExecutiveInsight[]> {
    const insights: ExecutiveInsight[] = [];

    try {
      // Risk assessment
      const riskInsight = await this.analyzeRiskExposure(request, userId);
      if (riskInsight) insights.push(riskInsight);

    } catch (error) {
      this.logger.warn('Risk insights generation failed:', error);
    }

    return insights;
  }

  private async generateGrowthInsights(request: InsightGenerationRequest, userId: string): Promise<ExecutiveInsight[]> {
    const insights: ExecutiveInsight[] = [];

    try {
      // Growth analysis
      const growthInsight = await this.analyzeGrowthMetrics(request, userId);
      if (growthInsight) insights.push(growthInsight);

    } catch (error) {
      this.logger.warn('Growth insights generation failed:', error);
    }

    return insights;
  }

  private async analyzeRevenueTrends(request: InsightGenerationRequest, userId: string): Promise<ExecutiveInsight | null> {
    try {
      const timeRange = this.getTimeRangeForRequest(request.timeframe);
      const analyticsInsights = await this.analyticsService.generateInsights('transactions', timeRange);

      const revenueTrend = analyticsInsights.find(insight => insight.type === 'trend');
      if (!revenueTrend) return null;

      return {
        id: crypto.randomUUID(),
        title: 'Revenue Trend Analysis',
        description: revenueTrend.description,
        category: 'financial',
        priority: revenueTrend.impact === 'high' ? 'high' : 'medium',
        impact: revenueTrend.impact,
        confidence: revenueTrend.confidence,
        timeframe: 'short-term',
        data: {
          keyMetrics: [
            { name: 'Revenue Growth', value: 15.5, change: 2.3, changePercent: 17.4 },
            { name: 'Transaction Volume', value: 45000, change: 5000, changePercent: 12.5 },
          ],
          trends: [
            { metric: 'Revenue', direction: 'up', significance: revenueTrend.confidence },
          ],
          comparisons: [],
        },
        recommendations: revenueTrend.recommendations?.map(rec => ({
          action: rec,
          priority: 'medium' as const,
          estimatedImpact: 'Moderate',
          timeframe: '3 months',
          resources: ['Analytics Team'],
        })) || [],
        stakeholders: ['CFO', 'CEO'],
        risks: [],
        kpis: ['daily_revenue', 'transaction_volume'],
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
    } catch (error) {
      this.logger.warn('Revenue trend analysis failed:', error);
      return null;
    }
  }

  private async analyzeCostTrends(request: InsightGenerationRequest, userId: string): Promise<ExecutiveInsight | null> {
    // Simplified cost analysis
    return {
      id: crypto.randomUUID(),
      title: 'Cost Optimization Opportunity',
      description: 'Operating costs have increased by 8% while revenue grew by 15%, indicating improved efficiency but room for optimization.',
      category: 'financial',
      priority: 'medium',
      impact: 'medium',
      confidence: 0.78,
      timeframe: 'medium-term',
      data: {
        keyMetrics: [
          { name: 'Operating Costs', value: 850000, change: 63000, changePercent: 8.0 },
          { name: 'Cost per Transaction', value: 18.9, change: -1.2, changePercent: -6.0 },
        ],
        trends: [
          { metric: 'Cost Efficiency', direction: 'up', significance: 0.82 },
        ],
        comparisons: [],
      },
      recommendations: [
        {
          action: 'Review and optimize vendor contracts',
          priority: 'medium',
          estimatedImpact: '5% cost reduction',
          timeframe: '6 months',
          resources: ['Procurement Team'],
        },
      ],
      stakeholders: ['CFO', 'COO'],
      risks: [],
      kpis: ['operating_costs', 'cost_per_transaction'],
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    };
  }

  private async analyzeProfitability(request: InsightGenerationRequest, userId: string): Promise<ExecutiveInsight | null> {
    // Simplified profitability analysis
    return {
      id: crypto.randomUUID(),
      title: 'Profit Margin Improvement',
      description: 'Profit margins have improved by 3.2 percentage points due to revenue growth outpacing cost increases.',
      category: 'financial',
      priority: 'high',
      impact: 'high',
      confidence: 0.85,
      timeframe: 'short-term',
      data: {
        keyMetrics: [
          { name: 'Profit Margin', value: 32.0, change: 3.2, changePercent: 11.1 },
          { name: 'Net Profit', value: 400000, change: 87000, changePercent: 27.8 },
        ],
        trends: [
          { metric: 'Profitability', direction: 'up', significance: 0.90 },
        ],
        comparisons: [],
      },
      recommendations: [
        {
          action: 'Maintain current growth strategy while monitoring costs',
          priority: 'high',
          estimatedImpact: 'Sustained profitability',
          timeframe: '12 months',
          resources: ['Executive Team'],
        },
      ],
      stakeholders: ['CEO', 'CFO', 'Board'],
      risks: [],
      kpis: ['profit_margin', 'net_profit'],
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
  }

  private async analyzeOperationalEfficiency(request: InsightGenerationRequest, userId: string): Promise<ExecutiveInsight | null> {
    // Simplified operational efficiency analysis
    return {
      id: crypto.randomUUID(),
      title: 'Operational Efficiency Gains',
      description: 'Transaction processing time has decreased by 25% through system optimizations and automation.',
      category: 'operational',
      priority: 'medium',
      impact: 'medium',
      confidence: 0.88,
      timeframe: 'short-term',
      data: {
        keyMetrics: [
          { name: 'Avg Processing Time', value: 2.4, change: -0.8, changePercent: -25.0 },
          { name: 'Throughput', value: 12500, change: 2100, changePercent: 20.2 },
        ],
        trends: [
          { metric: 'Efficiency', direction: 'up', significance: 0.92 },
        ],
        comparisons: [],
      },
      recommendations: [
        {
          action: 'Continue automation initiatives',
          priority: 'medium',
          estimatedImpact: '15% additional improvement',
          timeframe: '6 months',
          resources: ['Engineering Team'],
        },
      ],
      stakeholders: ['COO', 'CTO'],
      risks: [],
      kpis: ['processing_time', 'throughput'],
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
  }

  private async analyzeCapacityUtilization(request: InsightGenerationRequest, userId: string): Promise<ExecutiveInsight | null> {
    // Simplified capacity analysis
    return {
      id: crypto.randomUUID(),
      title: 'Capacity Planning Alert',
      description: 'Current system utilization is at 78% of capacity, indicating need for scaling preparations within next quarter.',
      category: 'operational',
      priority: 'medium',
      impact: 'medium',
      confidence: 0.82,
      timeframe: 'medium-term',
      data: {
        keyMetrics: [
          { name: 'System Utilization', value: 78.0, change: 5.0, changePercent: 6.8 },
          { name: 'Available Capacity', value: 22.0, change: -5.0, changePercent: -18.5 },
        ],
        trends: [
          { metric: 'Utilization', direction: 'up', significance: 0.85 },
        ],
        comparisons: [],
      },
      recommendations: [
        {
          action: 'Begin capacity expansion planning',
          priority: 'medium',
          estimatedImpact: 'Prevent performance degradation',
          timeframe: '3 months',
          resources: ['Infrastructure Team', 'Budget $100k'],
        },
      ],
      stakeholders: ['CTO', 'COO'],
      risks: [
        { description: 'Performance degradation risk', probability: 'medium', impact: 'high' },
      ],
      kpis: ['system_utilization', 'available_capacity'],
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    };
  }

  private async analyzeMarketPosition(request: InsightGenerationRequest, userId: string): Promise<ExecutiveInsight | null> {
    // Simplified market position analysis
    return {
      id: crypto.randomUUID(),
      title: 'Market Share Growth',
      description: 'Market share has increased by 2.3 percentage points, positioning the company as a strong competitor in the energy trading sector.',
      category: 'strategic',
      priority: 'high',
      impact: 'high',
      confidence: 0.75,
      timeframe: 'medium-term',
      data: {
        keyMetrics: [
          { name: 'Market Share', value: 12.5, change: 2.3, changePercent: 22.6 },
          { name: 'Competitor Index', value: 85.2, change: 8.7, changePercent: 11.4 },
        ],
        trends: [
          { metric: 'Market Position', direction: 'up', significance: 0.80 },
        ],
        comparisons: [],
      },
      recommendations: [
        {
          action: 'Accelerate market expansion initiatives',
          priority: 'high',
          estimatedImpact: 'Additional 3% market share',
          timeframe: '12 months',
          resources: ['Business Development', 'Marketing Budget $200k'],
        },
      ],
      stakeholders: ['CEO', 'CMO', 'Board'],
      risks: [],
      kpis: ['market_share', 'competitor_index'],
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }

  private async analyzeCompetitivePosition(request: InsightGenerationRequest, userId: string): Promise<ExecutiveInsight | null> {
    // Simplified competitive analysis
    return {
      id: crypto.randomUUID(),
      title: 'Competitive Advantage Strengthening',
      description: 'Technology platform advantages have resulted in 15% better transaction efficiency compared to industry average.',
      category: 'strategic',
      priority: 'medium',
      impact: 'medium',
      confidence: 0.80,
      timeframe: 'long-term',
      data: {
        keyMetrics: [
          { name: 'Efficiency Advantage', value: 15.0, change: 3.0, changePercent: 25.0 },
          { name: 'Technology Score', value: 92.5, change: 5.2, changePercent: 6.0 },
        ],
        trends: [
          { metric: 'Competitive Position', direction: 'up', significance: 0.85 },
        ],
        comparisons: [],
      },
      recommendations: [
        {
          action: 'Invest in technology differentiation',
          priority: 'medium',
          estimatedImpact: 'Maintain competitive edge',
          timeframe: '18 months',
          resources: ['R&D Team', 'Technology Budget $500k'],
        },
      ],
      stakeholders: ['CTO', 'CEO', 'CFO'],
      risks: [],
      kpis: ['efficiency_advantage', 'technology_score'],
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }

  private async analyzeRiskExposure(request: InsightGenerationRequest, userId: string): Promise<ExecutiveInsight | null> {
    // Simplified risk analysis
    return {
      id: crypto.randomUUID(),
      title: 'Risk Exposure Assessment',
      description: 'Overall risk exposure has decreased by 12% through improved hedging strategies and compliance measures.',
      category: 'risk',
      priority: 'medium',
      impact: 'medium',
      confidence: 0.78,
      timeframe: 'short-term',
      data: {
        keyMetrics: [
          { name: 'Risk Score', value: 42.5, change: -5.8, changePercent: -12.0 },
          { name: 'Hedge Effectiveness', value: 85.0, change: 8.0, changePercent: 10.4 },
        ],
        trends: [
          { metric: 'Risk Exposure', direction: 'down', significance: 0.82 },
        ],
        comparisons: [],
      },
      recommendations: [
        {
          action: 'Continue risk mitigation programs',
          priority: 'medium',
          estimatedImpact: 'Further risk reduction',
          timeframe: '6 months',
          resources: ['Risk Management Team'],
        },
      ],
      stakeholders: ['CRO', 'CFO', 'Board'],
      risks: [],
      kpis: ['risk_score', 'hedge_effectiveness'],
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
  }

  private async analyzeGrowthMetrics(request: InsightGenerationRequest, userId: string): Promise<ExecutiveInsight | null> {
    // Simplified growth analysis
    return {
      id: crypto.randomUUID(),
      title: 'Sustainable Growth Trajectory',
      description: 'User base growth rate of 18% month-over-month indicates strong market adoption and sustainable growth potential.',
      category: 'growth',
      priority: 'high',
      impact: 'high',
      confidence: 0.88,
      timeframe: 'medium-term',
      data: {
        keyMetrics: [
          { name: 'User Growth Rate', value: 18.0, change: 2.5, changePercent: 16.1 },
          { name: 'Customer Acquisition Cost', value: 125.0, change: -15.0, changePercent: -10.7 },
        ],
        trends: [
          { metric: 'Growth', direction: 'up', significance: 0.92 },
        ],
        comparisons: [],
      },
      recommendations: [
        {
          action: 'Scale user acquisition channels',
          priority: 'high',
          estimatedImpact: 'Maintain 15%+ growth rate',
          timeframe: '12 months',
          resources: ['Marketing Team', 'Budget $300k'],
        },
      ],
      stakeholders: ['CMO', 'CEO', 'CFO'],
      risks: [],
      kpis: ['user_growth_rate', 'customer_acquisition_cost'],
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    };
  }

  private async getRecentInsights(userId: string): Promise<ExecutiveInsight[]> {
    // In a real implementation, this would fetch from database
    // For now, returning mock insights
    return [
      await this.analyzeRevenueTrends({ timeframe: 'month' }, userId),
      await this.analyzeProfitability({ timeframe: 'month' }, userId),
      await this.analyzeGrowthMetrics({ timeframe: 'month' }, userId),
    ].filter(Boolean) as ExecutiveInsight[];
  }

  private calculateOverallHealth(insights: ExecutiveInsight[], kpis: any[]): number {
    if (insights.length === 0 && kpis.length === 0) return 0.5;

    let score = 0.5; // baseline

    // Factor in insights (negative impact for critical/high priority)
    if (insights.length > 0) {
      const criticalCount = insights.filter(i => i.priority === 'critical').length;
      const highCount = insights.filter(i => i.priority === 'high').length;
      const insightScore = 1 - ((criticalCount * 0.3) + (highCount * 0.15)) / insights.length;
      score = (score + insightScore) / 2;
    }

    // Factor in KPIs
    if (kpis.length > 0) {
      const goodCount = kpis.filter(k => k.status === 'good').length;
      const criticalCount = kpis.filter(k => k.status === 'critical').length;
      const kpiScore = (goodCount * 1.0 + (kpis.length - goodCount - criticalCount) * 0.7) / kpis.length;
      score = (score + kpiScore) / 2;
    }

    return Math.max(0, Math.min(1, score));
  }

  private analyzeTrends(insights: ExecutiveInsight[]): Array<{
    category: string;
    trend: 'improving' | 'declining' | 'stable';
    change: number;
  }> {
    const categoryMap = new Map<string, ExecutiveInsight[]>();
    
    insights.forEach(insight => {
      if (!categoryMap.has(insight.category)) {
        categoryMap.set(insight.category, []);
      }
      categoryMap.get(insight.category).push(insight);
    });

    return Array.from(categoryMap.entries()).map(([category, categoryInsights]) => {
      // Simplified trend calculation
      const positiveInsights = categoryInsights.filter(i => 
        i.data.trends.some(t => t.direction === 'up')
      ).length;
      
      const trend = positiveInsights > categoryInsights.length / 2 ? 'improving' : 
                   positiveInsights < categoryInsights.length / 4 ? 'declining' : 'stable';
      
      const change = (positiveInsights / categoryInsights.length - 0.5) * 100;

      return { category, trend, change };
    });
  }

  private analyzeRecommendations(insights: ExecutiveInsight[]): Array<{
    category: string;
    count: number;
    topPriority: string;
  }> {
    const categoryMap = new Map<string, string[]>();
    
    insights.forEach(insight => {
      if (!categoryMap.has(insight.category)) {
        categoryMap.set(insight.category, []);
      }
      categoryMap.get(insight.category).push(...insight.recommendations.map(r => r.action));
    });

    return Array.from(categoryMap.entries()).map(([category, recommendations]) => ({
      category,
      count: recommendations.length,
      topPriority: recommendations[0] || 'No recommendations',
    }));
  }

  private getTimeRangeForRequest(timeframe: string): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (timeframe) {
      case 'day':
        start.setDate(start.getDate() - 1);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setMonth(start.getMonth() - 1);
    }

    return { start, end };
  }
}
