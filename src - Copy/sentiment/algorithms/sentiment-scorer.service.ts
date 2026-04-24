import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SentimentScorerService {
  private readonly logger = new Logger(SentimentScorerService.name);

  async calculateSentiment(
    text: string,
    processedData?: any,
  ): Promise<{ score: number; confidence: number }> {
    this.logger.log('Calculating sentiment score');

    // In production, use NLP libraries like sentiment, natural, or transformer models
    const positiveWords = [
      'growth',
      'surge',
      'profit',
      'gain',
      'positive',
      'strong',
      'bullish',
    ];
    const negativeWords = [
      'decline',
      'loss',
      'drop',
      'fall',
      'negative',
      'weak',
      'bearish',
    ];

    const words = text.toLowerCase().split(/\W+/);

    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach((word) => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });

    const total = words.length;
    const score = (positiveCount - negativeCount) / Math.sqrt(total);
    const normalizedScore = Math.max(-1, Math.min(1, score));

    const confidence = Math.min(1, (positiveCount + negativeCount) / 10);

    return { score: normalizedScore, confidence };
  }

  async calculateEngagementScore(metrics: {
    likes?: number;
    shares?: number;
    comments?: number;
  }): Promise<number> {
    const weights = { likes: 1, shares: 3, comments: 2 };
    const score =
      (metrics.likes || 0) * weights.likes +
      (metrics.shares || 0) * weights.shares +
      (metrics.comments || 0) * weights.comments;

    return Math.min(100, score);
  }
}
