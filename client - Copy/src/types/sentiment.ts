// Sentiment Score & Types
export enum SentimentScoreEnum {
  VERY_NEGATIVE = -2,
  NEGATIVE = -1,
  NEUTRAL = 0,
  POSITIVE = 1,
  VERY_POSITIVE = 2,
}

export enum TradingSignalEnum {
  STRONG_BUY = 'strong_buy',
  BUY = 'buy',
  HOLD = 'hold',
  SELL = 'sell',
  STRONG_SELL = 'strong_sell',
}

export enum EnergyTypeEnum {
  SOLAR = 'solar',
  WIND = 'wind',
  HYDRO = 'hydro',
  GEOTHERMAL = 'geothermal',
  BIOMASS = 'biomass',
  NATURAL_GAS = 'natural_gas',
  COAL = 'coal',
  NUCLEAR = 'nuclear',
  GRID = 'grid',
  BATTERY = 'battery',
}

// Core Sentiment Data Types
export interface SentimentData {
  id: string;
  content: string;
  score: number;
  confidence: number;
  source: string;
  energyType?: EnergyTypeEnum;
  region?: string;
  keywords?: string[];
  timestamp: Date;
  status: string;
  relevanceScore: number;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  url: string;
  source: string;
  sentiment: number;
  confidence: number;
  publishedAt: Date;
  energyType?: EnergyTypeEnum;
  keywords?: string[];
  imageUrl?: string;
  engagement: number;
  status: string;
}

export interface SocialMediaMention {
  id: string;
  content: string;
  platform: string;
  sentiment: number;
  confidence: number;
  author: string;
  publishedAt: Date;
  engagement: number;
  energyType?: EnergyTypeEnum;
  keywords?: string[];
  profileImageUrl?: string;
  status: string;
}

export interface TradingSignal {
  id: string;
  signal: TradingSignalEnum;
  confidence: number;
  reason: string;
  sentimentScore: number;
  newsImpact: number;
  socialMediaImpact: number;
  energyType?: EnergyTypeEnum;
  region?: string;
  suggestedPrice?: number;
  generatedAt: Date;
  targetPrice?: number;
  stopLoss?: number;
  status: string;
}

export interface SentimentMetrics {
  id: string;
  overallSentiment: number;
  newsImpact: number;
  socialMediaImpact: number;
  volatilityIndex: number;
  trendStrength: number;
  energyType?: EnergyTypeEnum;
  region?: string;
  timestamp: Date;
  dataPoints: number;
}

export interface SentimentHeatMapEntry {
  id: string;
  energyType: string;
  region: string;
  sentiment: number;
  intensity: number;
  mentionCount: number;
  timestamp: Date;
}

export interface SentimentAlert {
  id: string;
  userId: string;
  name: string;
  threshold: number;
  condition: 'above' | 'below' | 'change_by';
  email: string;
  webhook?: string;
  energyType?: string;
  region?: string;
  checkInterval: number;
  notificationChannels?: string[];
  active: boolean;
  triggeredAlerts?: string[];
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
}

// Dashboard Data
export interface DashboardOverview {
  metrics: SentimentMetrics[];
  signals: TradingSignal[];
  news: NewsItem[];
  socialMedia: SocialMediaMention[];
  heatMaps: SentimentHeatMapEntry[];
  lastUpdated: Date;
}

// Query/Filter Types
export interface SentimentFilter {
  energyType?: EnergyTypeEnum;
  region?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface NewsFilter {
  energyType?: EnergyTypeEnum;
  region?: string;
  limit?: number;
}

export interface SocialMediaFilter {
  platform?: string;
  energyType?: EnergyTypeEnum;
  limit?: number;
}

export interface HeatMapFilter {
  energyType?: EnergyTypeEnum;
  timeRange?: 'hour' | 'day' | 'week' | 'month';
}

// Alert Configuration
export interface AlertConfig {
  name: string;
  threshold: number;
  condition: 'above' | 'below' | 'change_by';
  email: string;
  webhook?: string;
  energyType?: EnergyTypeEnum;
  region?: string;
  checkInterval: number;
  notificationChannels?: string[];
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
  timestamp: Date;
}

// Real-time Update Types
export interface SentimentUpdate {
  type: 'sentiment' | 'news' | 'social' | 'signal' | 'metrics';
  data: any;
  timestamp: Date;
}

// Chart Data Types
export interface ChartDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface SentimentTimeSeriesData {
  points: ChartDataPoint[];
  average: number;
  min: number;
  max: number;
  trend: number;
}

// User Preferences
export interface UserPreferences {
  userId: string;
  watchedEnergyTypes: EnergyTypeEnum[];
  watchedRegions: string[];
  preferredMetrics: string[];
  updateFrequency: 'realtime' | 'hourly' | 'daily';
  alertsEnabled: boolean;
  theme: 'light' | 'dark';
  defaultTimeRange: 'hour' | 'day' | 'week' | 'month' | 'year';
  createdAt: Date;
  updatedAt: Date;
}

// Heat Map Grid Types
export interface HeatMapGridCell {
  energyType: EnergyTypeEnum;
  region: string;
  sentiment: number;
  intensity: number;
  mentionCount: number;
}

export interface HeatMapGrid {
  cells: HeatMapGridCell[];
  timestamp: Date;
  minSentiment: number;
  maxSentiment: number;
}
