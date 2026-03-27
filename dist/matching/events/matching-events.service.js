"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MatchingEventsService_1;
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchingEventsService = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const matching_service_1 = require("../matching.service");
const audit_service_1 = require("../audit/audit.service");
let MatchingEventsService = MatchingEventsService_1 = class MatchingEventsService {
    constructor(matchingService, auditService) {
        this.matchingService = matchingService;
        this.auditService = auditService;
        this.logger = new common_1.Logger(MatchingEventsService_1.name);
        this.eventEmitter = new common_1.EventEmitter();
        this.connectedClients = new Map();
        this.userSubscriptions = new Map();
    }
    async onModuleInit() {
        this.setupEventHandlers();
        this.logger.log('Matching events service initialized');
    }
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
        this.connectedClients.set(client.id, client);
        client.on('authenticate', async (data) => {
            await this.authenticateClient(client, data.userId);
        });
        client.on('subscribe', async (data) => {
            await this.subscribeToChannels(client, data.channels);
        });
        client.on('unsubscribe', async (data) => {
            await this.unsubscribeFromChannels(client, data.channels);
        });
        client.emit('connected', {
            message: 'Connected to matching events service',
            clientId: client.id,
            timestamp: new Date(),
        });
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
        this.connectedClients.delete(client.id);
        for (const [userId, subscriptions] of this.userSubscriptions) {
            if (subscriptions.has(client.id)) {
                subscriptions.delete(client.id);
            }
        }
    }
    async handleSubscribeToOrder(client, orderId) {
        const room = `order_${orderId}`;
        await client.join(room);
        this.logger.debug(`Client ${client.id} subscribed to order ${orderId}`);
        client.emit('subscribed', { type: 'order', id: orderId });
    }
    async handleSubscribeToUser(client, userId) {
        const room = `user_${userId}`;
        await client.join(room);
        if (!this.userSubscriptions.has(userId)) {
            this.userSubscriptions.set(userId, new Set());
        }
        this.userSubscriptions.get(userId).add(client.id);
        this.logger.debug(`Client ${client.id} subscribed to user ${userId}`);
        client.emit('subscribed', { type: 'user', id: userId });
    }
    async handleSubscribeToMatches(client) {
        const room = 'matches';
        await client.join(room);
        this.logger.debug(`Client ${client.id} subscribed to all matches`);
        client.emit('subscribed', { type: 'matches' });
    }
    async handleUnsubscribeFromOrder(client, orderId) {
        const room = `order_${orderId}`;
        await client.leave(room);
        this.logger.debug(`Client ${client.id} unsubscribed from order ${orderId}`);
        client.emit('unsubscribed', { type: 'order', id: orderId });
    }
    setupEventHandlers() {
        this.matchingService.onMatchingEvent(async (event) => {
            await this.handleMatchingEvent(event);
        });
        this.eventEmitter.on('notification', async (notification) => {
            await this.sendNotification(notification);
        });
    }
    async handleMatchingEvent(event) {
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
    createNotificationFromEvent(event) {
        const baseNotification = {
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
                };
        }
    }
    async sendNotification(notification) {
        const channels = this.determineNotificationChannels(notification);
        for (const channel of channels) {
            this.server.to(channel).emit('notification', notification);
        }
        if (notification.userId) {
            this.server.to(`user_${notification.userId}`).emit('notification', notification);
        }
        if (notification.orderId) {
            this.server.to(`order_${notification.orderId}`).emit('notification', notification);
        }
        this.logger.debug(`Notification sent: ${notification.type} to channels: ${channels.join(', ')}`);
    }
    async broadcastEvent(event) {
        this.server.emit('matching_event', event);
        this.server.to('matches').emit('matching_event', event);
        if (event.data.buyerOrderId) {
            this.server.to(`order_${event.data.buyerOrderId}`).emit('matching_event', event);
        }
        if (event.data.sellerOrderId) {
            this.server.to(`order_${event.data.sellerOrderId}`).emit('matching_event', event);
        }
        this.logger.debug(`Event broadcasted: ${event.type}`);
    }
    determineNotificationChannels(notification) {
        const channels = [];
        switch (notification.type) {
            case 'match_created':
                channels.push('matches');
                if (notification.priority === 'high' || notification.priority === 'urgent') {
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
    async sendCustomNotification(notification) {
        const fullNotification = {
            ...notification,
            timestamp: new Date(),
        };
        await this.sendNotification(fullNotification);
    }
    async broadcastToAllClients(event, data) {
        this.server.emit(event, data);
    }
    async broadcastToChannel(channel, event, data) {
        this.server.to(channel).emit(event, data);
    }
    async broadcastToUser(userId, event, data) {
        this.server.to(`user_${userId}`).emit(event, data);
    }
    async broadcastToOrder(orderId, event, data) {
        this.server.to(`order_${orderId}`).emit(event, data);
    }
    async authenticateClient(client, userId) {
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
    async subscribeToChannels(client, channels) {
        for (const channel of channels) {
            await client.join(channel);
        }
        this.logger.debug(`Client ${client.id} subscribed to channels: ${channels.join(', ')}`);
        client.emit('subscribed', { type: 'channels', channels });
    }
    async unsubscribeFromChannels(client, channels) {
        for (const channel of channels) {
            await client.leave(channel);
        }
        this.logger.debug(`Client ${client.id} unsubscribed from channels: ${channels.join(', ')}`);
        client.emit('unsubscribed', { type: 'channels', channels });
    }
    getConnectedClientsCount() {
        return this.connectedClients.size;
    }
    getSubscribedUsersCount() {
        return this.userSubscriptions.size;
    }
    async getActiveChannels() {
        const sockets = await this.server.fetchSockets();
        const channels = new Set();
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
    async sendSystemMessage(message, priority = 'info') {
        const systemMessage = {
            type: 'system_message',
            message,
            priority,
            timestamp: new Date(),
        };
        this.server.emit('system_message', systemMessage);
    }
    async sendMatchingStatistics(stats) {
        this.server.to('matches').emit('matching_statistics', {
            ...stats,
            timestamp: new Date(),
        });
    }
    async emitMatchingPerformanceMetrics(metrics) {
        this.server.to('performance').emit('performance_metrics', {
            ...metrics,
            timestamp: new Date(),
        });
    }
};
exports.MatchingEventsService = MatchingEventsService;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", typeof (_a = typeof socket_io_1.Server !== "undefined" && socket_io_1.Server) === "function" ? _a : Object)
], MatchingEventsService.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe_to_order'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _b : Object, String]),
    __metadata("design:returntype", Promise)
], MatchingEventsService.prototype, "handleSubscribeToOrder", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe_to_user'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_c = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _c : Object, String]),
    __metadata("design:returntype", Promise)
], MatchingEventsService.prototype, "handleSubscribeToUser", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe_to_matches'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_d = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _d : Object]),
    __metadata("design:returntype", Promise)
], MatchingEventsService.prototype, "handleSubscribeToMatches", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribe_from_order'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_e = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _e : Object, String]),
    __metadata("design:returntype", Promise)
], MatchingEventsService.prototype, "handleUnsubscribeFromOrder", null);
exports.MatchingEventsService = MatchingEventsService = MatchingEventsService_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        namespace: '/matching',
    }),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [matching_service_1.MatchingService,
        audit_service_1.AuditService])
], MatchingEventsService);
//# sourceMappingURL=matching-events.service.js.map