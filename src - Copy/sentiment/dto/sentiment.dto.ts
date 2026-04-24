import { IsString, IsNumber, IsDate, IsEnum, IsArray, IsOptional, Min, Max, IsISO8601 } from 'class-validator';

export enum SentimentScore {
  VERY_NEGATIVE = -2,
  NEGATIVE = -1,
  NEUTRAL = 0,
  POSITIVE = 1,
  VERY_POSITIVE = 2,
}

export enum NewsSource {
  REUTERS = 'reuters',
  BLOOMBERG = 'bloomberg',
  CNBC = 'cnbc',
  YAHOO_FINANCE = 'yahoo_finance',
  MARKETWATCH = 'marketwatch',
  COINDESK = 'coindesk',
  CRYPTONEWS = 'cryptonews',
  TECHCRUNCH = 'techcrunch',
  WSJ = 'wsj',
  FT = 'ft',
  GUARDIAN = 'guardian',
  BBC = 'bbc',
  SKY = 'sky',
  TWITTER = 'twitter',
  REDDIT = 'reddit',
  DISCORD = 'discord',
  FACEBOOK = 'facebook',
  LINKEDIN = 'linkedin',
  SEEKING_ALPHA = 'seeking_alpha',
  ZACKS = 'zacks',
  INVESTOR_PLACE = 'investor_place',
  MOTLEY_FOOL = 'motley_fool',
  STOCKANALYSIS = 'stockanalysis',
  STOCKOPEDIA = 'stockopedia',
  SEEKING_ALPHA_PRO = 'seeking_alpha_pro',
  TIPS = 'tips',
  INVESTOPEDIA = 'investopedia',
  BANKRATE = 'bankrate',
  KIPLINGER = 'kiplinger',
  MONEY = 'money',
  NBC_NEWS = 'nbc_news',
  CBS_NEWS = 'cbs_news',
  ABC_NEWS = 'abc_news',
  CNBC_PRO = 'cnbc_pro',
  BENZINGA = 'benzinga',
  SEEKING_ALPHA_EARNINGS = 'seeking_alpha_earnings',
  STOCK_NEWS_API = 'stock_news_api',
  FINVIZ = 'finviz',
  STOCKTWITS = 'stocktwits',
  SEEKING_ALPHA_FORUMS = 'seeking_alpha_forums',
  BOGLEHEADS = 'bogleheads',
  INVESTMENT_CLUB = 'investment_club',
  FINANCIAL_CONTENT = 'financial_content',
  NEWSWIRES = 'newswires',
  PRESS_RELEASES = 'press_releases',
  INDUSTRY_REPORTS = 'industry_reports',
  ENERGY_EXCHANGE = 'energy_exchange',
  ENERGY_MARKET_NEWS = 'energy_market_news',
  RENEWABLE_NEWS = 'renewable_news',
}

export enum SocialMediaPlatform {
  TWITTER = 'twitter',
  REDDIT = 'reddit',
  DISCORD = 'discord',
  TELEGRAM = 'telegram',
  FACEBOOK = 'facebook',
  LINKEDIN = 'linkedin',
  STOCKTWITS = 'stocktwits',
  SEEKING_ALPHA = 'seeking_alpha',
}

export enum TradingSignalType {
  STRONG_BUY = 'strong_buy',
  BUY = 'buy',
  HOLD = 'hold',
  SELL = 'sell',
  STRONG_SELL = 'strong_sell',
}

export enum EnergyType {
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

export class CreateSentimentDto {
  @IsString()
  content: string;

  @IsEnum(SentimentScore)
  score: SentimentScore;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @IsString()
  source: string;

  @IsOptional()
  @IsEnum(EnergyType)
  energyType?: EnergyType;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsArray()
  keywords?: string[];

  @IsOptional()
  @IsDate()
  timestamp?: Date;
}

export class NewsItemDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsString()
  url: string;

  @IsEnum(NewsSource)
  source: NewsSource;

  @IsNumber()
  @Min(-2)
  @Max(2)
  sentiment: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @IsISO8601()
  publishedAt: string;

  @IsOptional()
  @IsEnum(EnergyType)
  energyType?: EnergyType;

  @IsOptional()
  @IsArray()
  keywords?: string[];

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  engagement?: number;
}

export class SocialMediaMentionDto {
  @IsString()
  content: string;

  @IsEnum(SocialMediaPlatform)
  platform: SocialMediaPlatform;

  @IsNumber()
  @Min(-2)
  @Max(2)
  sentiment: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @IsString()
  author: string;

  @IsISO8601()
  publishedAt: string;

  @IsNumber()
  engagement: number;

  @IsOptional()
  @IsEnum(EnergyType)
  energyType?: EnergyType;

  @IsOptional()
  @IsArray()
  keywords?: string[];

  @IsOptional()
  @IsString()
  profileImageUrl?: string;
}

export class TradingSignalDto {
  @IsEnum(TradingSignalType)
  signal: TradingSignalType;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @IsString()
  reason: string;

  @IsNumber()
  @Min(-100)
  @Max(100)
  sentimentScore: number;

  @IsNumber()
  newsImpact: number;

  @IsNumber()
  socialMediaImpact: number;

  @IsOptional()
  @IsEnum(EnergyType)
  energyType?: EnergyType;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsNumber()
  suggestedPrice?: number;

  @IsISO8601()
  generatedAt: string;

  @IsOptional()
  @IsNumber()
  targetPrice?: number;

  @IsOptional()
  @IsNumber()
  stopLoss?: number;
}

export class SentimentMetricsDto {
  @IsNumber()
  @Min(-100)
  @Max(100)
  overallSentiment: number;

  @IsNumber()
  newsImpact: number;

  @IsNumber()
  socialMediaImpact: number;

  @IsNumber()
  volatilityIndex: number;

  @IsNumber()
  trendStrength: number;

  @IsOptional()
  @IsEnum(EnergyType)
  energyType?: EnergyType;

  @IsOptional()
  @IsString()
  region?: string;

  @IsISO8601()
  timestamp: string;
}

export class SentimentHeatMapDto {
  @IsEnum(EnergyType)
  energyType: EnergyType;

  @IsString()
  region: string;

  @IsNumber()
  @Min(-100)
  @Max(100)
  sentiment: number;

  @IsNumber()
  intensity: number;

  @IsNumber()
  mentionCount: number;

  @IsISO8601()
  timestamp: string;
}

export class QuerySentimentDto {
  @IsOptional()
  @IsEnum(EnergyType)
  energyType?: EnergyType;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}

export class AlertConfigDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(-100)
  @Max(100)
  threshold: number;

  @IsString()
  condition: 'above' | 'below' | 'change_by';

  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  webhook?: string;

  @IsOptional()
  @IsEnum(EnergyType)
  energyType?: EnergyType;

  @IsOptional()
  @IsString()
  region?: string;

  @IsNumber()
  @Min(0)
  checkInterval: number;

  @IsOptional()
  @IsArray()
  notificationChannels?: string[];
}
