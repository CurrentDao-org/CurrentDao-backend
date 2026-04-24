import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { SentimentScore, EnergyType } from '../dto/sentiment.dto';

@Entity('sentiment_data')
@Index(['energyType', 'region', 'timestamp'])
@Index(['score', 'timestamp'])
export class SentimentDataEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column('numeric')
  score: SentimentScore;

  @Column('numeric', { precision: 3, scale: 2 })
  confidence: number;

  @Column('varchar', { length: 100 })
  source: string;

  @Column('varchar', { length: 50, nullable: true })
  energyType?: EnergyType;

  @Column('varchar', { length: 100, nullable: true })
  region?: string;

  @Column('simple-array', { nullable: true })
  keywords?: string[];

  @CreateDateColumn()
  timestamp: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('varchar', { length: 50, default: 'active' })
  status: string;

  @Column('integer', { default: 0 })
  relevanceScore: number;
}

@Entity('news_items')
@Index(['energyType', 'source', 'publishedAt'])
@Index(['sentiment', 'publishedAt'])
export class NewsItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 500 })
  title: string;

  @Column('text')
  content: string;

  @Column('varchar')
  url: string;

  @Column('varchar', { length: 50 })
  source: string;

  @Column('numeric', { precision: 3, scale: 2 })
  sentiment: number;

  @Column('numeric', { precision: 3, scale: 2 })
  confidence: number;

  @CreateDateColumn()
  publishedAt: Date;

  @Column('varchar', { length: 50, nullable: true })
  energyType?: EnergyType;

  @Column('simple-array', { nullable: true })
  keywords?: string[];

  @Column('varchar', { nullable: true })
  imageUrl?: string;

  @Column('integer', { default: 0 })
  engagement: number;

  @Column('varchar', { length: 50, default: 'active' })
  status: string;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('social_media_mentions')
@Index(['platform', 'energyType', 'publishedAt'])
@Index(['sentiment', 'publishedAt'])
export class SocialMediaMentionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column('varchar', { length: 50 })
  platform: string;

  @Column('numeric', { precision: 3, scale: 2 })
  sentiment: number;

  @Column('numeric', { precision: 3, scale: 2 })
  confidence: number;

  @Column('varchar', { length: 255 })
  author: string;

  @CreateDateColumn()
  publishedAt: Date;

  @Column('integer', { default: 0 })
  engagement: number;

  @Column('varchar', { length: 50, nullable: true })
  energyType?: EnergyType;

  @Column('simple-array', { nullable: true })
  keywords?: string[];

  @Column('varchar', { nullable: true })
  profileImageUrl?: string;

  @Column('varchar', { length: 50, default: 'active' })
  status: string;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('trading_signals')
@Index(['energyType', 'region', 'generatedAt'])
@Index(['signal', 'generatedAt'])
export class TradingSignalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 50 })
  signal: string;

  @Column('numeric', { precision: 3, scale: 2 })
  confidence: number;

  @Column('text')
  reason: string;

  @Column('numeric', { precision: 5, scale: 2 })
  sentimentScore: number;

  @Column('numeric', { precision: 5, scale: 2 })
  newsImpact: number;

  @Column('numeric', { precision: 5, scale: 2 })
  socialMediaImpact: number;

  @Column('varchar', { length: 50, nullable: true })
  energyType?: EnergyType;

  @Column('varchar', { length: 100, nullable: true })
  region?: string;

  @Column('numeric', { nullable: true })
  suggestedPrice?: number;

  @CreateDateColumn()
  generatedAt: Date;

  @Column('numeric', { nullable: true })
  targetPrice?: number;

  @Column('numeric', { nullable: true })
  stopLoss?: number;

  @Column('varchar', { length: 50, default: 'active' })
  status: string;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('sentiment_metrics')
@Index(['energyType', 'region', 'timestamp'])
@Index(['overallSentiment', 'timestamp'])
export class SentimentMetricsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('numeric', { precision: 5, scale: 2 })
  overallSentiment: number;

  @Column('numeric', { precision: 5, scale: 2 })
  newsImpact: number;

  @Column('numeric', { precision: 5, scale: 2 })
  socialMediaImpact: number;

  @Column('numeric', { precision: 5, scale: 2 })
  volatilityIndex: number;

  @Column('numeric', { precision: 5, scale: 2 })
  trendStrength: number;

  @Column('varchar', { length: 50, nullable: true })
  energyType?: EnergyType;

  @Column('varchar', { length: 100, nullable: true })
  region?: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column('integer', { default: 0 })
  dataPoints: number;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('sentiment_heat_maps')
@Index(['energyType', 'region', 'timestamp'])
export class SentimentHeatMapEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 50 })
  energyType: string;

  @Column('varchar', { length: 100 })
  region: string;

  @Column('numeric', { precision: 5, scale: 2 })
  sentiment: number;

  @Column('numeric', { precision: 5, scale: 2 })
  intensity: number;

  @Column('integer', { default: 0 })
  mentionCount: number;

  @CreateDateColumn()
  timestamp: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('sentiment_alerts')
@Index(['userId', 'active', 'timestamp'])
export class SentimentAlertEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255 })
  userId: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('numeric', { precision: 5, scale: 2 })
  threshold: number;

  @Column('varchar', { length: 50 })
  condition: string;

  @Column('varchar', { length: 255 })
  email: string;

  @Column('varchar', { nullable: true })
  webhook?: string;

  @Column('varchar', { length: 50, nullable: true })
  energyType?: string;

  @Column('varchar', { length: 100, nullable: true })
  region?: string;

  @Column('integer', { default: 300 })
  checkInterval: number;

  @Column('simple-array', { nullable: true })
  notificationChannels?: string[];

  @Column('boolean', { default: true })
  active: boolean;

  @Column('simple-array', { default: '{}' })
  triggeredAlerts?: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  lastTriggeredAt?: Date;
}
