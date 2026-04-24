import { Injectable, Logger } from '@nestjs/common';

export interface ResearchPublication {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  category: string;
  type: 'journal' | 'conference' | 'preprint' | 'technical_report';
  status: 'draft' | 'submitted' | 'under_review' | 'accepted' | 'published';
  publicationDate?: Date;
  journal?: string;
  conference?: string;
  doi?: string;
  citations: number;
  downloads: number;
  keywords: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ResearchManagementService {
  private readonly logger = new Logger(ResearchManagementService.name);
  private readonly publications = new Map<string, ResearchPublication>();

  async getPublications(query: any): Promise<ResearchPublication[]> {
    let publications = Array.from(this.publications.values());

    if (query.year) {
      publications = publications.filter(pub => 
        pub.publicationDate?.getFullYear() === parseInt(query.year)
      );
    }

    if (query.category) {
      publications = publications.filter(pub => pub.category === query.category);
    }

    if (query.author) {
      publications = publications.filter(pub => 
        pub.authors.includes(query.author)
      );
    }

    if (query.status) {
      publications = publications.filter(pub => pub.status === query.status);
    }

    return publications
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, query.limit || 50);
  }

  async createPublication(publicationData: any): Promise<ResearchPublication> {
    const publication: ResearchPublication = {
      id: `publication_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...publicationData,
      authors: publicationData.authors || [],
      keywords: publicationData.keywords || [],
      citations: 0,
      downloads: 0,
      publicationDate: publicationData.publicationDate ? new Date(publicationData.publicationDate) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.publications.set(publication.id, publication);
    this.logger.log(`Created research publication: ${publication.title}`);
    
    return publication;
  }

  async getAnalytics(query: any): Promise<any> {
    const publications = Array.from(this.publications.values());
    
    return {
      totalPublications: publications.length,
      publicationsByYear: this.groupPublicationsByYear(publications),
      publicationsByCategory: this.groupPublicationsByCategory(publications),
      publicationsByType: this.groupPublicationsByType(publications),
      totalCitations: publications.reduce((sum, pub) => sum + pub.citations, 0),
      totalDownloads: publications.reduce((sum, pub) => sum + pub.downloads, 0),
      averageCitations: publications.length > 0 ? publications.reduce((sum, pub) => sum + pub.citations, 0) / publications.length : 0,
      topAuthors: this.getTopAuthors(publications),
      trendingTopics: this.getTrendingTopics(publications),
    };
  }

  private groupPublicationsByYear(publications: ResearchPublication[]): Record<string, number> {
    return publications.reduce((acc, pub) => {
      const year = pub.publicationDate?.getFullYear() || new Date().getFullYear();
      acc[year.toString()] = (acc[year.toString()] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupPublicationsByCategory(publications: ResearchPublication[]): Record<string, number> {
    return publications.reduce((acc, pub) => {
      acc[pub.category] = (acc[pub.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupPublicationsByType(publications: ResearchPublication[]): Record<string, number> {
    return publications.reduce((acc, pub) => {
      acc[pub.type] = (acc[pub.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getTopAuthors(publications: ResearchPublication[]): Array<{ author: string; publications: number; citations: number }> {
    const authorStats = new Map<string, { publications: number; citations: number }>();

    publications.forEach(pub => {
      pub.authors.forEach(author => {
        const stats = authorStats.get(author) || { publications: 0, citations: 0 };
        stats.publications++;
        stats.citations += pub.citations;
        authorStats.set(author, stats);
      });
    });

    return Array.from(authorStats.entries())
      .map(([author, stats]) => ({ author, ...stats }))
      .sort((a, b) => b.citations - a.citations)
      .slice(0, 10);
  }

  private getTrendingTopics(publications: ResearchPublication[]): Array<{ topic: string; frequency: number }> {
    const topicCounts = new Map<string, number>();

    publications.forEach(pub => {
      pub.keywords.forEach(keyword => {
        topicCounts.set(keyword, (topicCounts.get(keyword) || 0) + 1);
      });
    });

    return Array.from(topicCounts.entries())
      .map(([topic, frequency]) => ({ topic, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }
}
