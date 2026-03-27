import { OnModuleInit } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MatchingService, MatchingEvent } from '../matching.service';
import { AuditService } from '../audit/audit.service';
export interface MatchingEventData {
    event: MatchingEvent;
    recipients?: string[];
    channels?: string[];
}
export interface NotificationPayload {
    type: 'match_created' | 'match_confirmed' | 'match_rejected' | 'match_expired' | 'conflict_resolved';
    title: string;
    message: string;
    data: any;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    timestamp: Date;
    userId?: string;
    orderId?: string;
    matchId?: string;
}
export declare class MatchingEventsService implements OnModuleInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly matchingService;
    private readonly auditService;
    server: Server;
    private readonly logger;
    private readonly eventEmitter;
    private connectedClients;
    private userSubscriptions;
    constructor(matchingService: MatchingService, auditService: AuditService);
    onModuleInit(): Promise<void>;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleSubscribeToOrder(client: Socket, orderId: string): Promise<void>;
    handleSubscribeToUser(client: Socket, userId: string): Promise<void>;
    handleSubscribeToMatches(client: Socket): Promise<void>;
    handleUnsubscribeFromOrder(client: Socket, orderId: string): Promise<void>;
    private setupEventHandlers;
    handleMatchingEvent(event: MatchingEvent): Promise<void>;
    createNotificationFromEvent(event: MatchingEvent): NotificationPayload;
    sendNotification(notification: NotificationPayload): Promise<void>;
    broadcastEvent(event: MatchingEvent): Promise<void>;
    private determineNotificationChannels;
    sendCustomNotification(notification: Omit<NotificationPayload, 'timestamp'>): Promise<void>;
    broadcastToAllClients(event: string, data: any): Promise<void>;
    broadcastToChannel(channel: string, event: string, data: any): Promise<void>;
    broadcastToUser(userId: string, event: string, data: any): Promise<void>;
    broadcastToOrder(orderId: string, event: string, data: any): Promise<void>;
    private authenticateClient;
    private subscribeToChannels;
    private unsubscribeFromChannels;
    getConnectedClientsCount(): number;
    getSubscribedUsersCount(): number;
    getActiveChannels(): Promise<string[]>;
    sendSystemMessage(message: string, priority?: 'info' | 'warning' | 'error'): Promise<void>;
    sendMatchingStatistics(stats: any): Promise<void>;
    emitMatchingPerformanceMetrics(metrics: {
        processingTime: number;
        successRate: number;
        totalMatches: number;
        algorithmPerformance: Record<string, number>;
    }): Promise<void>;
}
