import axios, { AxiosInstance } from 'axios';
import {
  SentimentData,
  NewsItem,
  SocialMediaMention,
  TradingSignal,
  SentimentMetrics,
  SentimentHeatMapEntry,
  SentimentAlert,
  DashboardOverview,
  SentimentFilter,
  NewsFilter,
  SocialMediaFilter,
  HeatMapFilter,
  AlertConfig,
  PaginatedResponse,
  ApiResponse,
} from '../../types/sentiment';

class SentimentService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = '/api/v1/sentiment') {
    this.baseURL = baseURL;
    this.api = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Sentiment Service Error:', error);
        throw error;
      },
    );
  }

  // Core Sentiment Data
  async getSentimentData(filters?: SentimentFilter): Promise<PaginatedResponse<SentimentData>> {
    const response = await this.api.get<PaginatedResponse<SentimentData>>('/data', {
      params: filters,
    });
    return response.data;
  }

  async createSentiment(data: any): Promise<SentimentData> {
    const response = await this.api.post<SentimentData>('/', data);
    return response.data;
  }

  // News Aggregation
  async getAggregatedNews(filters?: NewsFilter): Promise<NewsItem[]> {
    const response = await this.api.get<NewsItem[]>('/news/aggregated', {
      params: filters,
    });
    return response.data;
  }

  async fetchNews(): Promise<NewsItem[]> {
    const response = await this.api.post<NewsItem[]>('/news/fetch');
    return response.data;
  }

  // Social Media Tracking
  async getSocialMediaTracking(filters?: SocialMediaFilter): Promise<SocialMediaMention[]> {
    const response = await this.api.get<SocialMediaMention[]>('/social-media', {
      params: filters,
    });
    return response.data;
  }

  async fetchSocialMedia(): Promise<SocialMediaMention[]> {
    const response = await this.api.post<SocialMediaMention[]>('/social-media/fetch');
    return response.data;
  }

  // Trading Signals
  async getTradingSignals(energyType?: string, region?: string): Promise<TradingSignal[]> {
    const response = await this.api.get<TradingSignal[]>('/trading-signals', {
      params: { energyType, region },
    });
    return response.data;
  }

  // Sentiment Metrics
  async getSentimentMetrics(
    energyType?: string,
    region?: string,
    timeRange?: 'hour' | 'day' | 'week' | 'month' | 'year',
  ): Promise<SentimentMetrics[]> {
    const response = await this.api.get<SentimentMetrics[]>('/metrics', {
      params: { energyType, region, timeRange },
    });
    return response.data;
  }

  // Heat Map Data
  async getHeatMapData(filters?: HeatMapFilter): Promise<SentimentHeatMapEntry[]> {
    const response = await this.api.get<SentimentHeatMapEntry[]>('/heat-map', {
      params: filters,
    });
    return response.data;
  }

  async updateHeatMaps(): Promise<{ status: string; message: string }> {
    const response = await this.api.post<{ status: string; message: string }>('/heat-map/update');
    return response.data;
  }

  // Alerts
  async createAlert(alertConfig: AlertConfig): Promise<SentimentAlert> {
    const response = await this.api.post<SentimentAlert>('/alerts', alertConfig);
    return response.data;
  }

  async getUserAlerts(): Promise<SentimentAlert[]> {
    const response = await this.api.get<SentimentAlert[]>('/alerts');
    return response.data;
  }

  async updateAlert(alertId: string, updates: Partial<AlertConfig>): Promise<SentimentAlert> {
    const response = await this.api.put<SentimentAlert>(`/alerts/${alertId}`, updates);
    return response.data;
  }

  async deleteAlert(alertId: string): Promise<void> {
    await this.api.delete(`/alerts/${alertId}`);
  }

  // Historical Trends
  async getHistoricalTrends(
    energyType?: string,
    region?: string,
  ): Promise<PaginatedResponse<SentimentData>> {
    const response = await this.api.get<PaginatedResponse<SentimentData>>('/trends', {
      params: { energyType, region },
    });
    return response.data;
  }

  // Dashboard Overview
  async getDashboardOverview(): Promise<DashboardOverview> {
    const response = await this.api.get<DashboardOverview>('/dashboard/overview');
    return response.data;
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; timestamp: Date; service: string }> {
    const response = await this.api.get<{ status: string; timestamp: Date; service: string }>(
      '/health',
    );
    return response.data;
  }
}

export default new SentimentService();
