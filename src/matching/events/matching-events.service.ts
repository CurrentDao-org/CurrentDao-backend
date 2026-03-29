import { Injectable, Logger, EventEmitter, OnModuleInit } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Match, MatchStatus } from '../entities/match.entity';
import { MatchingService, MatchingEvent } from '../matching.service';
import { AuditService } from '../audit/audit.service';

export interface MatchingEventData {
  event: MatchingEvent;
  recipients?: string[];
  channels?: string[];
}

export interface NotificationPayload {
  type:
    | 'match_created'
    | 'match_confirmed'
    | 'match_rejected'
    | 'match_expired'
    | 'conflict_resolved';
  title: string;
  message: string;
  data: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
  userId?: string;
  orderId?: string;
  matchId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/matching',
})
@Injectable()
export class MatchingEventsService
  implements OnModuleInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MatchingEventsService.name);
  private readonly eventEmitter = new EventEmitter();
  private connectedClients = new Map<string, Socket>();
  private userSubscriptions = new Map<string, Set<string>>();

  constructor(
    private readonly matchingService: MatchingService,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit() {
    this.setupEventHandlers();
    this.logger.log('Matching events service initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);

    client.on(
      'authenticate',
      async (data: { userId: string; token?: string }) => {
        await this.authenticateClient(client, data.userId);
      },
    );

    client.on('subscribe', async (data: { channels: string[] }) => {
      await this.subscribeToChannels(client, data.channels);
    });

    client.on('unsubscribe', async (data: { channels: string[] }) => {
      await this.unsubscribeFromChannels(client, data.channels);
    });

    client.emit('connected', {
      message: 'Connected to matching events service',
      clientId: client.id,
      timestamp: new Date(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);

    for (const [userId, subscriptions] of this.userSubscriptions) {
      if (subscriptions.has(client.id)) {
        subscriptions.delete(client.id);
      }
    }
  }

  @SubscribeMessage('subscribe_to_order')
  async handleSubscribeToOrder(client: Socket, orderId: string) {
    const room = `order_${orderId}`;
    await client.join(room);

    this.logger.debug(`Client ${client.id} subscribed to order ${orderId}`);

    client.emit('subscribed', { type: 'order', id: orderId });
  }

  @SubscribeMessage('subscribe_to_user')
  async handleSubscribeToUser(client: Socket, userId: string) {
    const room = `user_${userId}`;
    await client.join(room);

    if (!this.userSubscriptions.has(userId)) {
      this.userSubscriptions.set(userId, new Set());
    }
    this.userSubscriptions.get(userId).add(client.id);

    this.logger.debug(`Client ${client.id} subscribed to user ${userId}`);

    client.emit('subscribed', { type: 'user', id: userId });
  }

  @SubscribeMessage('subscribe_to_matches')
  async handleSubscribeToMatches(client: Socket) {
    const room = 'matches';
    await client.join(room);

    this.logger.debug(`Client ${client.id} subscribed to all matches`);

    client.emit('subscribed', { type: 'matches' });
  }

  @SubscribeMessage('unsubscribe_from_order')
  async handleUnsubscribeFromOrder(client: Socket, orderId: string) {
    const room = `order_${orderId}`;
    await client.leave(room);

    this.logger.debug(`Client ${client.id} unsubscribed from order ${orderId}`);

    client.emit('unsubscribed', { type: 'order', id: orderId });
  }

  private setupEventHandlers() {
    this.matchingService.onMatchingEvent(async (event: MatchingEvent) => {
      await this.handleMatchingEvent(event);
    });

    this.eventEmitter.on(
      'notification',
      async (notification: NotificationPayload) => {
        await this.sendNotification(notification);
      },
    );
  }

  async handleMatchingEvent(event: MatchingEvent) {
    await this.auditService.logEntry({
      entityType: 'match',
      entityId: event.data.matchId || 'unknown',
      action: event.type,
      newState: event.data,
      metadata: {
        eventType: event.type,
        timestamp: event.timestamp,
      },
    });

    const notification = this.createNotificationFromEvent(event);
    await this.sendNotification(notification);

    await this.broadcastEvent(event);
  }

  createNotificationFromEvent(event: MatchingEvent): NotificationPayload {
    const baseNotification: Partial<NotificationPayload> = {
      data: event.data,
      timestamp: event.timestamp,
      matchId: event.data.matchId,
      orderId: event.data.buyerOrderId || event.data.sellerOrderId,
    };

    switch (event.type) {
      case 'match_created':
        return {
          ...baseNotification,
          type: 'match_created',
          title: 'New Match Created',
          message: `A new match has been created between buyer ${event.data.buyerOrderId} and seller ${event.data.sellerOrderId}`,
          priority: 'medium',
        };

      case 'match_confirmed':
        return {
          ...baseNotification,
          type: 'match_confirmed',
          title: 'Match Confirmed',
          message: `Match ${event.data.matchId} has been confirmed`,
          priority: 'high',
          userId: event.data.confirmedBy,
        };

      case 'match_rejected':
        return {
          ...baseNotification,
          type: 'match_rejected',
          title: 'Match Rejected',
          message: `Match ${event.data.matchId} has been rejected`,
          priority: 'high',
          userId: event.data.rejectedBy,
        };

      case 'match_expired':
        return {
          ...baseNotification,
          type: 'match_expired',
          title: 'Match Expired',
          message: `Match ${event.data.matchId} has expired`,
          priority: 'medium',
        };

      case 'conflict_resolved':
        return {
          ...baseNotification,
          type: 'conflict_resolved',
          title: 'Conflict Resolved',
          message: `Matching conflict has been resolved`,
          priority: 'high',
        };

      default:
        return {
          ...baseNotification,
          type: event.type,
          title: 'Matching Event',
          message: `A matching event occurred: ${event.type}`,
          priority: 'low',
        } as NotificationPayload;
    }
  }

  async sendNotification(notification: NotificationPayload) {
    const channels = this.determineNotificationChannels(notification);

    for (const channel of channels) {
      this.server.to(channel).emit('notification', notification);
    }

    if (notification.userId) {
      this.server
        .to(`user_${notification.userId}`)
        .emit('notification', notification);
    }

    if (notification.orderId) {
      this.server
        .to(`order_${notification.orderId}`)
        .emit('notification', notification);
    }

    this.logger.debug(
      `Notification sent: ${notification.type} to channels: ${channels.join(', ')}`,
    );
  }

  async broadcastEvent(event: MatchingEvent) {
    this.server.emit('matching_event', event);
    this.server.to('matches').emit('matching_event', event);

    if (event.data.buyerOrderId) {
      this.server
        .to(`order_${event.data.buyerOrderId}`)
        .emit('matching_event', event);
    }

    if (event.data.sellerOrderId) {
      this.server
        .to(`order_${event.data.sellerOrderId}`)
        .emit('matching_event', event);
    }

    this.logger.debug(`Event broadcasted: ${event.type}`);
  }

  private determineNotificationChannels(
    notification: NotificationPayload,
  ): string[] {
    const channels: string[] = [];

    switch (notification.type) {
      case 'match_created':
        channels.push('matches');
        if (
          notification.priority === 'high' ||
          notification.priority === 'urgent'
        ) {
          channels.push('urgent_matches');
        }
        break;

      case 'match_confirmed':
      case 'match_rejected':
        channels.push('match_updates');
        break;

      case 'match_expired':
        channels.push('expired_matches');
        break;

      case 'conflict_resolved':
        channels.push('conflict_resolution');
        break;

      default:
        channels.push('general');
        break;
    }

    return channels;
  }

  async sendCustomNotification(
    notification: Omit<NotificationPayload, 'timestamp'>,
  ) {
    const fullNotification: NotificationPayload = {
      ...notification,
      timestamp: new Date(),
    };

    await this.sendNotification(fullNotification);
  }

  async broadcastToAllClients(event: string, data: any) {
    this.server.emit(event, data);
  }

  async broadcastToChannel(channel: string, event: string, data: any) {
    this.server.to(channel).emit(event, data);
  }

  async broadcastToUser(userId: string, event: string, data: any) {
    this.server.to(`user_${userId}`).emit(event, data);
  }

  async broadcastToOrder(orderId: string, event: string, data: any) {
    this.server.to(`order_${orderId}`).emit(event, data);
  }

  private async authenticateClient(client: Socket, userId: string) {
    client.data.userId = userId;

    const room = `user_${userId}`;
    await client.join(room);

    if (!this.userSubscriptions.has(userId)) {
      this.userSubscriptions.set(userId, new Set());
    }
    this.userSubscriptions.get(userId).add(client.id);

    this.logger.debug(`Client ${client.id} authenticated as user ${userId}`);

    client.emit('authenticated', { userId, timestamp: new Date() });
  }

  private async subscribeToChannels(client: Socket, channels: string[]) {
    for (const channel of channels) {
      await client.join(channel);
    }

    this.logger.debug(
      `Client ${client.id} subscribed to channels: ${channels.join(', ')}`,
    );

    client.emit('subscribed', { type: 'channels', channels });
  }

  private async unsubscribeFromChannels(client: Socket, channels: string[]) {
    for (const channel of channels) {
      await client.leave(channel);
    }

    this.logger.debug(
      `Client ${client.id} unsubscribed from channels: ${channels.join(', ')}`,
    );

    client.emit('unsubscribed', { type: 'channels', channels });
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  getSubscribedUsersCount(): number {
    return this.userSubscriptions.size;
  }

  async getActiveChannels(): Promise<string[]> {
    const sockets = await this.server.fetchSockets();
    const channels = new Set<string>();

    for (const socket of sockets) {
      const socketRooms = socket.rooms;
      for (const room of socketRooms) {
        if (room !== socket.id) {
          channels.add(room);
        }
      }
    }

    return Array.from(channels);
  }

  async sendSystemMessage(
    message: string,
    priority: 'info' | 'warning' | 'error' = 'info',
  ) {
    const systemMessage = {
      type: 'system_message',
      message,
      priority,
      timestamp: new Date(),
    };

    this.server.emit('system_message', systemMessage);
  }

  async sendMatchingStatistics(stats: any) {
    this.server.to('matches').emit('matching_statistics', {
      ...stats,
      timestamp: new Date(),
    });
  }

  async emitMatchingPerformanceMetrics(metrics: {
    processingTime: number;
    successRate: number;
    totalMatches: number;
    algorithmPerformance: Record<string, number>;
  }) {
    this.server.to('performance').emit('performance_metrics', {
      ...metrics,
      timestamp: new Date(),
    });
  }
}
