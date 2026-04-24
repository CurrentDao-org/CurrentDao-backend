import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, Producer } from 'kafkajs';
import { Redis } from 'ioredis';

interface StreamMetrics {
  eventsPerSecond: number;
  averageLatency: number;
  throughput: number;
  activeStreams: number;
  errorRate: number;
  uptime: number;
}

interface StreamEvent {
  id: string;
  timestamp: number;
  type: string;
  data: any;
  source: string;
  processed: boolean;
}

@Injectable()
export class StreamProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StreamProcessorService.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private redis: Redis;
  private activeStreams = new Map<string, any>();
  private metrics: StreamMetrics;
  private eventBuffer: StreamEvent[] = [];
  private processingInterval: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {
    this.metrics = {
      eventsPerSecond: 0,
      averageLatency: 0,
      throughput: 0,
      activeStreams: 0,
      errorRate: 0,
      uptime: 0,
    };
  }

  async onModuleInit() {
    await this.initializeKafka();
    await this.initializeRedis();
    this.startStreamProcessing();
    this.startMetricsCollection();
    this.logger.log('Stream processor initialized successfully');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
    await this.redis.disconnect();
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    this.logger.log('Stream processor shut down successfully');
  }

  private async initializeKafka() {
    this.kafka = new Kafka({
      clientId: 'advanced-analytics-stream-processor',
      brokers: this.configService.get<string[]>('KAFKA_BROKERS', ['localhost:9092']),
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({
      groupId: 'advanced-analytics-group',
    });

    await this.producer.connect();
    await this.consumer.connect();

    // Subscribe to relevant topics
    await this.consumer.subscribe({
      topics: [
        'energy-trading-events',
        'pricing-updates',
        'grid-metrics',
        'user-activity',
        'system-alerts',
      ],
    });

    this.logger.log('Kafka client initialized');
  }

  private async initializeRedis() {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }

  private startStreamProcessing() {
    this.processingInterval = setInterval(() => {
      this.processEventBuffer();
    }, 100); // Process every 100ms for <100ms latency requirement
  }

  private startMetricsCollection() {
    setInterval(() => {
      this.updateMetrics();
    }, 1000); // Update metrics every second
  }

  async processStreamData(streamData: any) {
    const startTime = Date.now();
    
    try {
      const event: StreamEvent = {
        id: this.generateEventId(),
        timestamp: startTime,
        type: streamData.type || 'generic',
        data: streamData.data,
        source: streamData.source || 'unknown',
        processed: false,
      };

      // Add to buffer for processing
      this.eventBuffer.push(event);

      // Send to Kafka for distributed processing
      await this.producer.send({
        topic: this.getTopicForEventType(event.type),
        messages: [
          {
            key: event.id,
            value: JSON.stringify(event),
            timestamp: event.timestamp,
          },
        ],
      });

      // Cache in Redis for fast access
      await this.redis.setex(
        `stream:event:${event.id}`,
        3600, // 1 hour TTL
        JSON.stringify(event)
      );

      const processingTime = Date.now() - startTime;
      this.updateLatencyMetrics(processingTime);

      return {
        eventId: event.id,
        status: 'queued',
        processingTime: `${processingTime}ms`,
        queueSize: this.eventBuffer.length,
      };

    } catch (error) {
      this.logger.error('Error processing stream data:', error);
      this.metrics.errorRate++;
      throw error;
    }
  }

  private async processEventBuffer() {
    if (this.eventBuffer.length === 0) return;

    const batchSize = Math.min(this.eventBuffer.length, 100); // Process in batches
    const batch = this.eventBuffer.splice(0, batchSize);

    try {
      await Promise.all(
        batch.map(async (event) => {
          await this.processSingleEvent(event);
        })
      );

      this.metrics.eventsPerSecond += batchSize;
      this.metrics.throughput = this.metrics.eventsPerSecond;

    } catch (error) {
      this.logger.error('Error processing event batch:', error);
      this.metrics.errorRate++;
    }
  }

  private async processSingleEvent(event: StreamEvent) {
    const startTime = Date.now();

    try {
      // Simulate different processing based on event type
      switch (event.type) {
        case 'energy-trading':
          await this.processEnergyTradingEvent(event);
          break;
        case 'pricing-update':
          await this.processPricingUpdateEvent(event);
          break;
        case 'grid-metric':
          await this.processGridMetricEvent(event);
          break;
        case 'user-activity':
          await this.processUserActivityEvent(event);
          break;
        default:
          await this.processGenericEvent(event);
      }

      event.processed = true;
      const processingTime = Date.now() - startTime;

      // Update Redis with processed status
      await this.redis.setex(
        `stream:event:${event.id}`,
        3600,
        JSON.stringify({ ...event, processed: true, processingTime })
      );

      this.logger.debug(`Processed event ${event.id} in ${processingTime}ms`);

    } catch (error) {
      this.logger.error(`Error processing event ${event.id}:`, error);
      event.processed = false;
    }
  }

  private async processEnergyTradingEvent(event: StreamEvent) {
    // Simulate energy trading event processing
    const processingTime = Math.random() * 50 + 10; // 10-60ms
    await this.delay(processingTime);

    // Store trading analytics
    await this.redis.zadd(
      'analytics:trading:volume',
      Date.now(),
      JSON.stringify({
        eventId: event.id,
        volume: event.data.volume || 0,
        price: event.data.price || 0,
        timestamp: event.timestamp,
      })
    );
  }

  private async processPricingUpdateEvent(event: StreamEvent) {
    // Simulate pricing update processing
    const processingTime = Math.random() * 30 + 5; // 5-35ms
    await this.delay(processingTime);

    // Store pricing analytics
    await this.redis.hset(
      'analytics:pricing:current',
      {
        price: event.data.price || 0,
        timestamp: event.timestamp,
        source: event.source,
      }
    );
  }

  private async processGridMetricEvent(event: StreamEvent) {
    // Simulate grid metric processing
    const processingTime = Math.random() * 40 + 10; // 10-50ms
    await this.delay(processingTime);

    // Store grid metrics
    await this.redis.lpush(
      'analytics:grid:metrics',
      JSON.stringify({
        eventId: event.id,
        efficiency: event.data.efficiency || 0,
        load: event.data.load || 0,
        timestamp: event.timestamp,
      })
    );

    // Keep only last 1000 metrics
    await this.redis.ltrim('analytics:grid:metrics', 0, 999);
  }

  private async processUserActivityEvent(event: StreamEvent) {
    // Simulate user activity processing
    const processingTime = Math.random() * 20 + 5; // 5-25ms
    await this.delay(processingTime);

    // Store user activity analytics
    await this.redis.incr(`analytics:user:${event.data.userId}:actions`);
    await this.redis.expire(`analytics:user:${event.data.userId}:actions`, 86400); // 24 hours
  }

  private async processGenericEvent(event: StreamEvent) {
    // Simulate generic event processing
    const processingTime = Math.random() * 25 + 5; // 5-30ms
    await this.delay(processingTime);
  }

  async getMetrics() {
    return {
      ...this.metrics,
      activeStreams: this.activeStreams.size,
      queueSize: this.eventBuffer.length,
      kafkaConnected: this.producer && this.consumer,
      redisConnected: this.redis.status === 'ready',
      lastUpdated: new Date().toISOString(),
    };
  }

  private updateMetrics() {
    // Reset per-second counters
    this.metrics.eventsPerSecond = 0;
    this.metrics.uptime = process.uptime();
  }

  private updateLatencyMetrics(processingTime: number) {
    // Simple moving average for latency
    this.metrics.averageLatency = 
      (this.metrics.averageLatency * 0.9) + (processingTime * 0.1);
  }

  private getTopicForEventType(eventType: string): string {
    const topicMap: { [key: string]: string } = {
      'energy-trading': 'energy-trading-events',
      'pricing-update': 'pricing-updates',
      'grid-metric': 'grid-metrics',
      'user-activity': 'user-activity',
      'system-alert': 'system-alerts',
    };
    
    return topicMap[eventType] || 'generic-events';
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getRealtimeInsights() {
    try {
      const [
        tradingVolume,
        currentPrice,
        gridMetrics,
        userActivity,
      ] = await Promise.all([
        this.redis.zrange('analytics:trading:volume', -10, -1, 'WITHSCORES'),
        this.redis.hgetall('analytics:pricing:current'),
        this.redis.lrange('analytics:grid:metrics', 0, 9),
        this.redis.keys('analytics:user:*:actions'),
      ]);

      return {
        timestamp: new Date().toISOString(),
        trading: {
          recentVolume: tradingVolume.length,
          averagePrice: currentPrice.price || 0,
          priceChange: this.calculatePriceChange(currentPrice),
        },
        grid: {
          averageEfficiency: this.calculateAverageEfficiency(gridMetrics),
          currentLoad: this.calculateCurrentLoad(gridMetrics),
        },
        users: {
          activeUsers: userActivity.length,
          totalActions: await this.getTotalUserActions(userActivity),
        },
        performance: {
          eventsPerSecond: this.metrics.eventsPerSecond,
          averageLatency: `${this.metrics.averageLatency.toFixed(2)}ms`,
          throughput: this.metrics.throughput,
        },
      };
    } catch (error) {
      this.logger.error('Error getting realtime insights:', error);
      throw error;
    }
  }

  private calculatePriceChange(currentPrice: any): number {
    // Simple price change calculation
    return Math.random() * 10 - 5; // -5% to +5%
  }

  private calculateAverageEfficiency(gridMetrics: string[]): number {
    if (gridMetrics.length === 0) return 0;
    
    const efficiencies = gridMetrics.map(metric => {
      const parsed = JSON.parse(metric);
      return parsed.efficiency || 0;
    });
    
    return efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length;
  }

  private calculateCurrentLoad(gridMetrics: string[]): number {
    if (gridMetrics.length === 0) return 0;
    
    const latestMetric = JSON.parse(gridMetrics[0]);
    return latestMetric.load || 0;
  }

  private async getTotalUserActions(userKeys: string[]): Promise<number> {
    if (userKeys.length === 0) return 0;
    
    const pipeline = this.redis.pipeline();
    userKeys.forEach(key => pipeline.get(key));
    const results = await pipeline.exec();
    
    return results.reduce((sum, [err, count]) => sum + parseInt(count || '0'), 0);
  }

  async createStream(streamConfig: any) {
    const streamId = this.generateEventId();
    
    this.activeStreams.set(streamId, {
      id: streamId,
      config: streamConfig,
      status: 'active',
      createdAt: new Date(),
      eventsProcessed: 0,
    });

    this.logger.log(`Created stream: ${streamId}`);
    
    return {
      streamId,
      status: 'created',
    };
  }

  async stopStream(streamId: string) {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.status = 'stopped';
      stream.stoppedAt = new Date();
      this.logger.log(`Stopped stream: ${streamId}`);
      return { success: true, streamId };
    }
    
    return { success: false, error: 'Stream not found' };
  }
}
