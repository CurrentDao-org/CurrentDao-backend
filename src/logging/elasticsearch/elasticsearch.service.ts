import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { SearchResponse, SearchHit } from '@elastic/elasticsearch/lib/api/types';

export interface LogEntry {
  timestamp: Date;
  level: string;
  message: string;
  service_name: string;
  environment: string;
  request_id?: string;
  request_method?: string;
  request_url?: string;
  error_name?: string;
  error_message?: string;
  response_time?: number;
  memory_usage?: number;
  cpu_usage?: number;
  tx_hash?: string;
  tx_type?: string;
  tx_status?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface SearchQuery {
  query?: string;
  level?: string;
  service_name?: string;
  environment?: string;
  start_time?: Date;
  end_time?: Date;
  tags?: string[];
  size?: number;
  from?: number;
  sort?: Array<{ [key: string]: { order: 'asc' | 'desc' } }>;
}

export interface LogAggregation {
  total_logs: number;
  logs_by_level: Record<string, number>;
  logs_by_service: Record<string, number>;
  logs_by_hour: Record<string, number>;
  error_rate: number;
  average_response_time: number;
  top_errors: Array<{ error_name: string; count: number }>;
  slow_requests: Array<{ url: string; avg_response_time: number; count: number }>;
}

export interface IndexMetrics {
  index_name: string;
  doc_count: number;
  store_size: string;
  health: 'green' | 'yellow' | 'red';
  status: string;
}

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private readonly client: Client;
  private readonly indexPrefix = 'currentdao-logs';
  private readonly maxRetries = 3;
  private readonly requestTimeout = 30000;

  constructor(private configService: ConfigService) {
    this.client = new Client({
      node: this.configService.get('ELASTICSEARCH_NODE') || 'http://localhost:9200',
      auth: {
        username: this.configService.get('ELASTICSEARCH_USERNAME') || 'elastic',
        password: this.configService.get('ELASTICSEARCH_PASSWORD') || 'changeme',
      },
      maxRetries: this.maxRetries,
      requestTimeout: this.requestTimeout,
      pingTimeout: 3000,
      sniffOnStart: true,
      sniffInterval: 300000,
      compression: 'gzip',
      tls: {
        rejectUnauthorized: this.configService.get('ELASTICSEARCH_VERIFY_CERTS') !== 'false',
      },
    });
  }

  async onModuleInit() {
    try {
      await this.client.ping();
      this.logger.log('Elasticsearch connection established');
      
      // Create index template if it doesn't exist
      await this.createIndexTemplate();
      
      // Create ILM policy if it doesn't exist
      await this.createILMPolicy();
      
      this.logger.log('Elasticsearch service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Elasticsearch service', error);
      throw error;
    }
  }

  private async createIndexTemplate(): Promise<void> {
    const templateName = 'currentdao-logs-template';
    
    try {
      const exists = await this.client.indices.existsIndexTemplate({
        name: templateName,
      });

      if (!exists) {
        await this.client.indices.putIndexTemplate({
          name: templateName,
          index_patterns: [`${this.indexPrefix}-*`],
          template: {
            settings: {
              number_of_shards: 3,
              number_of_replicas: 1,
              'index.refresh_interval': '5s',
              'index.translog.flush_threshold_size': '512mb',
              'index.mapping.total_fields.limit': 2000,
              analysis: {
                analyzer: {
                  currentdao_log_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'stop'],
                  },
                },
              },
            },
            mappings: {
              properties: {
                '@timestamp': { type: 'date' },
                timestamp: { type: 'date' },
                level: { 
                  type: 'keyword',
                  fields: {
                    text: {
                      type: 'text',
                      analyzer: 'currentdao_log_analyzer',
                    },
                  },
                },
                message: {
                  type: 'text',
                  analyzer: 'currentdao_log_analyzer',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256,
                    },
                  },
                },
                service_name: { type: 'keyword' },
                environment: { type: 'keyword' },
                request_id: { type: 'keyword' },
                request_method: { type: 'keyword' },
                request_url: { type: 'keyword' },
                error_name: { type: 'keyword' },
                error_message: { type: 'text' },
                response_time: { type: 'float' },
                memory_usage: { type: 'float' },
                cpu_usage: { type: 'float' },
                tx_hash: { type: 'keyword' },
                tx_type: { type: 'keyword' },
                tx_status: { type: 'keyword' },
                tags: { type: 'keyword' },
                clientip: { type: 'ip' },
                geoip: {
                  properties: {
                    location: { type: 'geo_point' },
                    country_name: { type: 'keyword' },
                    city_name: { type: 'keyword' },
                  },
                },
              },
            },
            aliases: {
              [this.indexPrefix]: {},
            },
          },
          composed_of: [],
          priority: 100,
          version: 1,
        });

        this.logger.log(`Index template ${templateName} created successfully`);
      }
    } catch (error) {
      this.logger.error('Failed to create index template', error);
      throw error;
    }
  }

  private async createILMPolicy(): Promise<void> {
    const policyName = 'currentdao-logs-policy';
    
    try {
      const exists = await this.client.ilm.lifecycle.get({
        policy: policyName,
      });

      if (!exists) {
        await this.client.ilm.lifecycle.put({
          policy: policyName,
          policy: {
            phases: {
              hot: {
                actions: {
                  rollover: {
                    max_size: '10GB',
                    max_age: '24h',
                    max_docs: 1000000,
                  },
                  set_priority: { priority: 100 },
                },
              },
              warm: {
                min_age: '7d',
                actions: {
                  set_priority: { priority: 50 },
                  forcemerge: { max_num_segments: 1 },
                },
              },
              cold: {
                min_age: '30d',
                actions: {
                  set_priority: { priority: 0 },
                },
              },
              delete: {
                min_age: '90d',
              },
            },
          },
        });

        this.logger.log(`ILM policy ${policyName} created successfully`);
      }
    } catch (error) {
      this.logger.error('Failed to create ILM policy', error);
      throw error;
    }
  }

  async indexLog(logEntry: LogEntry): Promise<void> {
    try {
      const indexName = `${this.indexPrefix}-${new Date().toISOString().split('T')[0]}`;
      
      await this.client.index({
        index: indexName,
        body: {
          ...logEntry,
          '@timestamp': logEntry.timestamp,
        },
      });
    } catch (error) {
      this.logger.error('Failed to index log entry', error);
      throw error;
    }
  }

  async indexLogs(logEntries: LogEntry[]): Promise<void> {
    try {
      const body = logEntries.flatMap(logEntry => [
        {
          index: {
            _index: `${this.indexPrefix}-${new Date(logEntry.timestamp).toISOString().split('T')[0]}`,
          },
        },
        {
          ...logEntry,
          '@timestamp': logEntry.timestamp,
        },
      ]);

      const response = await this.client.bulk({ body });

      if (response.errors) {
        const erroredDocuments = response.items
          .filter((item: any) => item.index.error)
          .map((item: any) => ({
            status: item.index.status,
            error: item.index.error,
          }));

        this.logger.error('Bulk indexing errors', erroredDocuments);
      }
    } catch (error) {
      this.logger.error('Failed to bulk index log entries', error);
      throw error;
    }
  }

  async searchLogs(searchQuery: SearchQuery): Promise<SearchResponse> {
    try {
      const esQuery = this.buildElasticsearchQuery(searchQuery);
      
      const response = await this.client.search({
        index: `${this.indexPrefix}-*`,
        body: esQuery,
      });

      return response;
    } catch (error) {
      this.logger.error('Failed to search logs', error);
      throw error;
    }
  }

  private buildElasticsearchQuery(searchQuery: SearchQuery): any {
    const query: any = {
      query: {
        bool: {
          must: [],
          filter: [],
        },
      },
      size: searchQuery.size || 100,
      from: searchQuery.from || 0,
      sort: searchQuery.sort || [{ '@timestamp': { order: 'desc' } }],
    };

    // Text search
    if (searchQuery.query) {
      query.query.bool.must.push({
        multi_match: {
          query: searchQuery.query,
          fields: ['message', 'error_message', 'request_url'],
          type: 'best_fields',
        },
      });
    }

    // Level filter
    if (searchQuery.level) {
      query.query.bool.filter.push({
        term: { level: searchQuery.level },
      });
    }

    // Service name filter
    if (searchQuery.service_name) {
      query.query.bool.filter.push({
        term: { service_name: searchQuery.service_name },
      });
    }

    // Environment filter
    if (searchQuery.environment) {
      query.query.bool.filter.push({
        term: { environment: searchQuery.environment },
      });
    }

    // Time range filter
    if (searchQuery.start_time || searchQuery.end_time) {
      const timeRange: any = {};
      if (searchQuery.start_time) {
        timeRange.gte = searchQuery.start_time.toISOString();
      }
      if (searchQuery.end_time) {
        timeRange.lte = searchQuery.end_time.toISOString();
      }
      
      query.query.bool.filter.push({
        range: { '@timestamp': timeRange },
      });
    }

    // Tags filter
    if (searchQuery.tags && searchQuery.tags.length > 0) {
      query.query.bool.filter.push({
        terms: { tags: searchQuery.tags },
      });
    }

    // If no query specified, match all
    if (query.query.bool.must.length === 0 && query.query.bool.filter.length === 0) {
      query.query = { match_all: {} };
    }

    return query;
  }

  async getLogAggregations(searchQuery: SearchQuery): Promise<LogAggregation> {
    try {
      const esQuery = {
        ...this.buildElasticsearchQuery(searchQuery),
        size: 0,
        aggs: {
          logs_by_level: {
            terms: {
              field: 'level',
              size: 10,
            },
          },
          logs_by_service: {
            terms: {
              field: 'service_name',
              size: 20,
            },
          },
          logs_by_hour: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: 'hour',
              format: 'yyyy-MM-dd HH:mm',
            },
          },
          error_rate: {
            filters: {
              filters: {
                errors: {
                  term: { level: 'error' },
                },
                total: {
                  match_all: {},
                },
              },
            },
          },
          avg_response_time: {
            avg: {
              field: 'response_time',
            },
          },
          top_errors: {
            terms: {
              field: 'error_name',
              size: 10,
            },
          },
          slow_requests: {
            terms: {
              field: 'request_url',
              size: 10,
              order: {
                avg_response_time: 'desc',
              },
              aggs: {
                avg_response_time: {
                  avg: {
                    field: 'response_time',
                  },
                },
              },
            },
          },
        },
      };

      const response = await this.client.search({
        index: `${this.indexPrefix}-*`,
        body: esQuery,
      });

      return this.parseAggregations(response);
    } catch (error) {
      this.logger.error('Failed to get log aggregations', error);
      throw error;
    }
  }

  private parseAggregations(response: SearchResponse): LogAggregation {
    const aggregations = response.aggregations as any;

    const totalLogs = response.hits.total?.value || 0;
    const logsByLevel = this.parseTermsAggregation(aggregations.logs_by_level);
    const logsByService = this.parseTermsAggregation(aggregations.logs_by_service);
    const logsByHour = this.parseDateHistogramAggregation(aggregations.logs_by_hour);
    
    const errorBuckets = aggregations.error_rate.buckets;
    const errorCount = errorBuckets.errors.doc_count;
    const errorRate = totalLogs > 0 ? (errorCount / totalLogs) * 100 : 0;

    const avgResponseTime = aggregations.avg_response_time.value || 0;
    const topErrors = aggregations.top_errors.buckets.map((bucket: any) => ({
      error_name: bucket.key,
      count: bucket.doc_count,
    }));
    
    const slowRequests = aggregations.slow_requests.buckets.map((bucket: any) => ({
      url: bucket.key,
      avg_response_time: bucket.avg_response_time.value,
      count: bucket.doc_count,
    }));

    return {
      total_logs: totalLogs,
      logs_by_level: logsByLevel,
      logs_by_service: logsByService,
      logs_by_hour: logsByHour,
      error_rate: errorRate,
      average_response_time: avgResponseTime,
      top_errors: topErrors,
      slow_requests: slowRequests,
    };
  }

  private parseTermsAggregation(agg: any): Record<string, number> {
    const result: Record<string, number> = {};
    if (agg && agg.buckets) {
      for (const bucket of agg.buckets) {
        result[bucket.key] = bucket.doc_count;
      }
    }
    return result;
  }

  private parseDateHistogramAggregation(agg: any): Record<string, number> {
    const result: Record<string, number> = {};
    if (agg && agg.buckets) {
      for (const bucket of agg.buckets) {
        result[bucket.key_as_string] = bucket.doc_count;
      }
    }
    return result;
  }

  async getIndexMetrics(): Promise<IndexMetrics[]> {
    try {
      const response = await this.client.cat.indices({
        index: `${this.indexPrefix}-*`,
        format: 'json',
      });

      return response.map((index: any) => ({
        index_name: index.index,
        doc_count: parseInt(index['docs.count'] || '0'),
        store_size: index['store.size'],
        health: index.health as 'green' | 'yellow' | 'red',
        status: index.status,
      }));
    } catch (error) {
      this.logger.error('Failed to get index metrics', error);
      throw error;
    }
  }

  async getClusterHealth(): Promise<any> {
    try {
      return await this.client.cluster.health();
    } catch (error) {
      this.logger.error('Failed to get cluster health', error);
      throw error;
    }
  }

  async deleteIndex(indexName: string): Promise<void> {
    try {
      await this.client.indices.delete({
        index: indexName,
      });
      this.logger.log(`Index ${indexName} deleted successfully`);
    } catch (error) {
      this.logger.error(`Failed to delete index ${indexName}`, error);
      throw error;
    }
  }

  async optimizeIndex(indexName: string): Promise<void> {
    try {
      await this.client.indices.forcemerge({
        index: indexName,
        max_num_segments: 1,
      });
      this.logger.log(`Index ${indexName} optimized successfully`);
    } catch (error) {
      this.logger.error(`Failed to optimize index ${indexName}`, error);
      throw error;
    }
  }

  async refreshIndex(indexName: string): Promise<void> {
    try {
      await this.client.indices.refresh({
        index: indexName,
      });
    } catch (error) {
      this.logger.error(`Failed to refresh index ${indexName}`, error);
      throw error;
    }
  }

  // Performance monitoring methods
  async getSearchPerformance(): Promise<any> {
    try {
      const response = await this.client.indices.stats({
        index: `${this.indexPrefix}-*`,
        metric: 'search',
      });

      return response.indices;
    } catch (error) {
      this.logger.error('Failed to get search performance metrics', error);
      throw error;
    }
  }

  async getIndexingPerformance(): Promise<any> {
    try {
      const response = await this.client.indices.stats({
        index: `${this.indexPrefix}-*`,
        metric: 'indexing',
      });

      return response.indices;
    } catch (error) {
      this.logger.error('Failed to get indexing performance metrics', error);
      throw error;
    }
  }

  // Health check method
  async isHealthy(): Promise<boolean> {
    try {
      const health = await this.getClusterHealth();
      return health.status === 'green' || health.status === 'yellow';
    } catch (error) {
      this.logger.error('Health check failed', error);
      return false;
    }
  }
}
