import { Injectable, Logger } from '@nestjs/common';

export interface ProcessedText {
  tokens: string[];
  keywords: string[];
  entities: string[];
  language: string;
  isRelevant: boolean;
}

@Injectable()
export class TextProcessorService {
  private readonly logger = new Logger(TextProcessorService.name);

  async process(text: string): Promise<ProcessedText> {
    this.logger.log('Processing text for NLP analysis');

    // Tokenization
    const tokens = this.tokenize(text);

    // Keyword extraction
    const keywords = this.extractKeywords(tokens);

    // Named entity recognition (simplified)
    const entities = this.extractEntities(text);

    // Language detection
    const language = this.detectLanguage(text);

    // Relevance filtering
    const isRelevant = this.checkRelevance(keywords, entities);

    return { tokens, keywords, entities, language, isRelevant };
  }

  private tokenize(text: string): string[] {
    // Simple tokenization - in production use proper NLP libraries
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 2);
  }

  private extractKeywords(tokens: string[]): string[] {
    // Remove stop words and extract meaningful keywords
    const stopWords = [
      'the',
      'and',
      'is',
      'in',
      'at',
      'of',
      'to',
      'for',
      'on',
      'with',
    ];
    const keywordCounts = tokens.reduce(
      (acc, token) => {
        if (!stopWords.includes(token)) {
          acc[token] = (acc[token] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private extractEntities(text: string): string[] {
    // Simplified entity extraction - detect capitalized terms
    const entities = text.match(/\b[A-Z][A-Z]+\b/g) || [];
    return [...new Set(entities)];
  }

  private detectLanguage(text: string): string {
    // Simplified language detection
    return 'en'; // Default to English
  }

  private checkRelevance(keywords: string[], entities: string[]): boolean {
    // Check if content is relevant to energy/markets
    const relevantTerms = [
      'energy',
      'power',
      'electricity',
      'renewable',
      'solar',
      'wind',
      'market',
      'price',
      'trading',
      'grid',
      'consumption',
    ];

    const hasRelevantKeyword = keywords.some((k) =>
      relevantTerms.includes(k.toLowerCase()),
    );
    const hasRelevantEntity = entities.some((e) =>
      e.toLowerCase().includes('energy'),
    );

    return hasRelevantKeyword || hasRelevantEntity;
  }

  async batchProcess(texts: string[]): Promise<ProcessedText[]> {
    this.logger.log(`Batch processing ${texts.length} texts`);

    // Process in parallel for performance
    const results = await Promise.all(texts.map((text) => this.process(text)));

    return results.filter((result) => result.isRelevant);
  }
}
