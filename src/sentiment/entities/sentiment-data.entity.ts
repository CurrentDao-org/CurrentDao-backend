import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum SentimentType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
}

export enum SourceType {
  NEWS = 'news',
  SOCIAL_MEDIA = 'social_media',
  ANALYST_REPORT = 'analyst_report',
  BLOG = 'blog',
  FORUM = 'forum',
}

@Entity('sentiment_data')
export class SentimentData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column({ type: 'float', default: 0 })
  sentimentScore: number; // -1 to 1

  @Column({ type: 'enum', enum: SentimentType })
  sentimentType: SentimentType;

  @Column({ type: 'float', default: 0 })
  confidence: number;

  @Column({ type: 'enum', enum: SourceType })
  sourceType: SourceType;

  @Column()
  sourceUrl: string;

  @Column({ nullable: true })
  author?: string;

  @Column({ nullable: true })
  @Index()
  assetSymbol?: string;

  @Column({ nullable: true })
  @Index()
  topic?: string;

  @Column('jsonb')
  keywords: string[];

  @Column({ default: 0 })
  engagementScore: number;

  @CreateDateColumn()
  @Index()
  publishedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  getSentimentLabel(): string {
    if (this.sentimentScore > 0.3) return 'Positive';
    if (this.sentimentScore < -0.3) return 'Negative';
    return 'Neutral';
  }
}
