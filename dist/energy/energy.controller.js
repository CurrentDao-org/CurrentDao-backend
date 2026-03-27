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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnergyController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const energy_service_1 = require("./energy.service");
const create_listing_dto_1 = require("./dto/create-listing.dto");
const update_listing_dto_1 = require("./dto/update-listing.dto");
const place_bid_dto_1 = require("./dto/place-bid.dto");
const execute_trade_dto_1 = require("./dto/execute-trade.dto");
const energy_listing_entity_1 = require("./entities/energy-listing.entity");
const bid_entity_1 = require("./entities/bid.entity");
const trade_entity_1 = require("./entities/trade.entity");
const auth_guard_1 = require("./guards/auth.guard");
let EnergyController = class EnergyController {
    constructor(energyService) {
        this.energyService = energyService;
    }
    async createListing(createListingDto, req) {
        return this.energyService.createListing(createListingDto, req.user.id);
    }
    async getListings(filter, pagination) {
        return this.energyService.getListings(filter, pagination);
    }
    async getListingById(id) {
        return this.energyService.getListingById(id);
    }
    async updateListing(id, updateListingDto, req) {
        return this.energyService.updateListing(id, updateListingDto, req.user.id);
    }
    async cancelListing(id, req) {
        return this.energyService.cancelListing(id, req.user.id);
    }
    async placeBid(placeBidDto, req) {
        return this.energyService.placeBid(placeBidDto, req.user.id);
    }
    async getBidsByUser(pagination, req) {
        return this.energyService.getBidsByUser(req.user.id, pagination);
    }
    async getBidsForListing(listingId, req) {
        return this.energyService.getBidsForListing(listingId, req.user.id);
    }
    async acceptBid(bidId, req) {
        return this.energyService.acceptBid(bidId, req.user.id);
    }
    async rejectBid(bidId, body, req) {
        return this.energyService.rejectBid(bidId, req.user.id, body.reason);
    }
    async withdrawBid(bidId, req) {
        return this.energyService.withdrawBid(bidId, req.user.id);
    }
    async executeTrade(executeTradeDto, req) {
        return this.energyService.executeTrade(executeTradeDto, req.user.id);
    }
    async getTradeById(id, req) {
        return this.energyService.getTradeById(id, req.user.id);
    }
    async getTradesByUser(pagination, req) {
        return this.energyService.getTradesByUser(req.user.id, pagination);
    }
    async updateTradeStatus(id, body, req) {
        return this.energyService.updateTradeStatus(id, body.status, req.user.id, body.reason);
    }
    async getOrderBook(filter) {
        return this.energyService.getOrderBook(filter);
    }
    async getListingAnalytics(id) {
        const listing = await this.energyService.getListingById(id);
        return {
            viewCount: listing.viewCount,
            bidCount: listing.bidCount,
            averageBidPrice: listing.analytics?.avgBidPrice || 0,
            priceRange: listing.analytics?.priceRange || { min: 0, max: 0, avg: 0 },
            conversionRate: listing.analytics?.conversionRate || 0,
            matchScore: listing.matchScore,
            visibilityScore: listing.visibilityScore,
        };
    }
    async getDashboard(req) {
        const userId = req.user.id;
        const [userListings, userBids, userTrades] = await Promise.all([
            this.energyService.getListings({ createdBy: userId }, { page: 1, limit: 100 }),
            this.energyService.getBidsByUser(userId, { page: 1, limit: 100 }),
            this.energyService.getTradesByUser(userId, { page: 1, limit: 100 }),
        ]);
        const activeListings = userListings.data.filter(listing => listing.status === 'active');
        const pendingBids = userBids.data.filter(bid => bid.status === 'pending');
        const activeTrades = userTrades.data.filter(trade => trade.status === 'pending' || trade.status === 'confirmed' || trade.status === 'in_progress');
        const totalValue = userListings.data.reduce((sum, listing) => sum + (listing.quantity * listing.price), 0);
        const avgListingPrice = userListings.data.length > 0
            ? userListings.data.reduce((sum, listing) => sum + listing.price, 0) / userListings.data.length
            : 0;
        return {
            summary: {
                totalListings: userListings.total,
                activeListings: activeListings.length,
                totalBids: userBids.total,
                pendingBids: pendingBids.length,
                totalTrades: userTrades.total,
                activeTrades: activeTrades.length,
                totalValue,
                avgListingPrice,
            },
            recentActivity: {
                recentListings: userListings.data.slice(0, 5),
                recentBids: userBids.data.slice(0, 5),
                recentTrades: userTrades.data.slice(0, 5),
            },
            performance: {
                listingViews: userListings.data.reduce((sum, listing) => sum + listing.viewCount, 0),
                bidSuccessRate: userBids.data.length > 0
                    ? (userBids.data.filter(bid => bid.status === 'accepted').length / userBids.data.length) * 100
                    : 0,
                tradeCompletionRate: userTrades.data.length > 0
                    ? (userTrades.data.filter(trade => trade.status === 'completed').length / userTrades.data.length) * 100
                    : 0,
            },
        };
    }
    async getStatistics() {
        const [allListings, orderBook] = await Promise.all([
            this.energyService.getListings({}, { page: 1, limit: 1000 }),
            this.energyService.getOrderBook({}),
        ]);
        const listingsByType = allListings.data.reduce((acc, listing) => {
            acc[listing.type] = (acc[listing.type] || 0) + 1;
            return acc;
        }, {});
        const listingsByEnergyType = allListings.data.reduce((acc, listing) => {
            acc[listing.energyType] = (acc[listing.energyType] || 0) + 1;
            return acc;
        }, {});
        const avgPriceByEnergyType = allListings.data.reduce((acc, listing) => {
            if (!acc[listing.energyType]) {
                acc[listing.energyType] = { total: 0, count: 0 };
            }
            acc[listing.energyType].total += listing.price;
            acc[listing.energyType].count += 1;
            return acc;
        }, {});
        const avgPriceByType = Object.entries(avgPriceByEnergyType).reduce((acc, [energyType, data]) => {
            acc[energyType] = data.total / data.count;
            return acc;
        }, {});
        return {
            overview: {
                totalListings: allListings.total,
                activeListings: allListings.data.filter(listing => listing.status === 'active').length,
                totalBuyOrders: orderBook.summary.totalBuyOrders,
                totalSellOrders: orderBook.summary.totalSellOrders,
                totalBuyQuantity: orderBook.summary.totalBuyQuantity,
                totalSellQuantity: orderBook.summary.totalSellQuantity,
                marketSpread: orderBook.summary.spread,
            },
            breakdowns: {
                listingsByType,
                listingsByEnergyType,
                avgPriceByType,
            },
            metrics: {
                avgBuyPrice: orderBook.summary.avgBuyPrice,
                avgSellPrice: orderBook.summary.avgSellPrice,
                priceVolatility: this.calculatePriceVolatility(allListings.data),
                marketDepth: orderBook.summary.totalBuyQuantity + orderBook.summary.totalSellQuantity,
            },
        };
    }
    calculatePriceVolatility(listings) {
        if (listings.length < 2)
            return 0;
        const prices = listings.map(listing => listing.price);
        const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
        const standardDeviation = Math.sqrt(variance);
        return (standardDeviation / mean) * 100;
    }
};
exports.EnergyController = EnergyController;
__decorate([
    (0, common_1.Post)('listings'),
    (0, swagger_1.ApiOperation)({ summary: 'Create new energy listing' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.CREATED, description: 'Listing created successfully', type: energy_listing_entity_1.EnergyListing }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.BAD_REQUEST, description: 'Invalid input data' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.UNAUTHORIZED, description: 'Unauthorized' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_listing_dto_1.CreateListingDto, Object]),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "createListing", null);
__decorate([
    (0, common_1.Get)('listings'),
    (0, swagger_1.ApiOperation)({ summary: 'Browse energy listings with pagination and filters' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Listings retrieved successfully' }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: false, enum: ['buy', 'sell'] }),
    (0, swagger_1.ApiQuery)({ name: 'energyType', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'minPrice', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'maxPrice', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'minQuantity', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'maxQuantity', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'createdBy', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'isFeatured', required: false, type: Boolean }),
    (0, swagger_1.ApiQuery)({ name: 'isVerified', required: false, type: Boolean }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, example: 10 }),
    (0, swagger_1.ApiQuery)({ name: 'sortBy', required: false, example: 'createdAt' }),
    (0, swagger_1.ApiQuery)({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], example: 'DESC' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "getListings", null);
__decorate([
    (0, common_1.Get)('listings/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get specific listing details' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Listing retrieved successfully', type: energy_listing_entity_1.EnergyListing }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.NOT_FOUND, description: 'Listing not found' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Listing ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "getListingById", null);
__decorate([
    (0, common_1.Put)('listings/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update listing (owner only)' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Listing updated successfully', type: energy_listing_entity_1.EnergyListing }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.NOT_FOUND, description: 'Listing not found' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.FORBIDDEN, description: 'Not authorized to update this listing' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.BAD_REQUEST, description: 'Cannot update listing in current state' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Listing ID' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_listing_dto_1.UpdateListingDto, Object]),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "updateListing", null);
__decorate([
    (0, common_1.Delete)('listings/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel listing (owner only)' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Listing cancelled successfully', type: energy_listing_entity_1.EnergyListing }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.NOT_FOUND, description: 'Listing not found' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.FORBIDDEN, description: 'Not authorized to cancel this listing' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.BAD_REQUEST, description: 'Cannot cancel listing in current state' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Listing ID' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "cancelListing", null);
__decorate([
    (0, common_1.Post)('bids'),
    (0, swagger_1.ApiOperation)({ summary: 'Place bid on listing' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.CREATED, description: 'Bid placed successfully', type: bid_entity_1.Bid }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.BAD_REQUEST, description: 'Invalid bid data or listing not available' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.FORBIDDEN, description: 'Cannot bid on own listing' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.NOT_FOUND, description: 'Listing not found' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [place_bid_dto_1.PlaceBidDto, Object]),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "placeBid", null);
__decorate([
    (0, common_1.Get)('bids'),
    (0, swagger_1.ApiOperation)({ summary: "Get user's bids" }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'User bids retrieved successfully' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, example: 10 }),
    (0, swagger_1.ApiQuery)({ name: 'sortBy', required: false, example: 'createdAt' }),
    (0, swagger_1.ApiQuery)({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], example: 'DESC' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "getBidsByUser", null);
__decorate([
    (0, common_1.Get)('listings/:listingId/bids'),
    (0, swagger_1.ApiOperation)({ summary: 'Get bids for a listing (owner only)' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Listing bids retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.NOT_FOUND, description: 'Listing not found' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.FORBIDDEN, description: 'Not authorized to view bids for this listing' }),
    (0, swagger_1.ApiParam)({ name: 'listingId', description: 'Listing ID' }),
    __param(0, (0, common_1.Param)('listingId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "getBidsForListing", null);
__decorate([
    (0, common_1.Post)('bids/:bidId/accept'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Accept bid (listing owner only)' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Bid accepted successfully', type: bid_entity_1.Bid }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.NOT_FOUND, description: 'Bid not found' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.FORBIDDEN, description: 'Not authorized to accept this bid' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.BAD_REQUEST, description: 'Cannot accept bid in current state' }),
    (0, swagger_1.ApiParam)({ name: 'bidId', description: 'Bid ID' }),
    __param(0, (0, common_1.Param)('bidId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "acceptBid", null);
__decorate([
    (0, common_1.Post)('bids/:bidId/reject'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reject bid (listing owner only)' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Bid rejected successfully', type: bid_entity_1.Bid }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.NOT_FOUND, description: 'Bid not found' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.FORBIDDEN, description: 'Not authorized to reject this bid' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.BAD_REQUEST, description: 'Cannot reject bid in current state' }),
    (0, swagger_1.ApiParam)({ name: 'bidId', description: 'Bid ID' }),
    __param(0, (0, common_1.Param)('bidId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "rejectBid", null);
__decorate([
    (0, common_1.Post)('bids/:bidId/withdraw'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Withdraw bid (bid owner only)' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Bid withdrawn successfully', type: bid_entity_1.Bid }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.NOT_FOUND, description: 'Bid not found' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.FORBIDDEN, description: 'Not authorized to withdraw this bid' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.BAD_REQUEST, description: 'Cannot withdraw bid in current state' }),
    (0, swagger_1.ApiParam)({ name: 'bidId', description: 'Bid ID' }),
    __param(0, (0, common_1.Param)('bidId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "withdrawBid", null);
__decorate([
    (0, common_1.Post)('trades/execute'),
    (0, swagger_1.ApiOperation)({ summary: 'Execute matched trade' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.CREATED, description: 'Trade executed successfully', type: trade_entity_1.Trade }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.BAD_REQUEST, description: 'Cannot execute trade in current state' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.FORBIDDEN, description: 'Not authorized to execute this trade' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.NOT_FOUND, description: 'Bid not found' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [execute_trade_dto_1.ExecuteTradeDto, Object]),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "executeTrade", null);
__decorate([
    (0, common_1.Get)('trades/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get trade status' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Trade retrieved successfully', type: trade_entity_1.Trade }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.NOT_FOUND, description: 'Trade not found' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.FORBIDDEN, description: 'Not authorized to view this trade' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Trade ID' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "getTradeById", null);
__decorate([
    (0, common_1.Get)('trades'),
    (0, swagger_1.ApiOperation)({ summary: "Get user's trades" }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'User trades retrieved successfully' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, example: 10 }),
    (0, swagger_1.ApiQuery)({ name: 'sortBy', required: false, example: 'createdAt' }),
    (0, swagger_1.ApiQuery)({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], example: 'DESC' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "getTradesByUser", null);
__decorate([
    (0, common_1.Put)('trades/:id/status'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Update trade status' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Trade status updated successfully', type: trade_entity_1.Trade }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.NOT_FOUND, description: 'Trade not found' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.FORBIDDEN, description: 'Not authorized to update this trade' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.BAD_REQUEST, description: 'Invalid status transition' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Trade ID' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "updateTradeStatus", null);
__decorate([
    (0, common_1.Get)('orderbook'),
    (0, swagger_1.ApiOperation)({ summary: 'Get order book functionality' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Order book retrieved successfully' }),
    (0, swagger_1.ApiQuery)({ name: 'energyType', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'minPrice', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'maxPrice', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'minQuantity', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'maxQuantity', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'createdBy', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'isFeatured', required: false, type: Boolean }),
    (0, swagger_1.ApiQuery)({ name: 'isVerified', required: false, type: Boolean }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "getOrderBook", null);
__decorate([
    (0, common_1.Get)('listings/:id/analytics'),
    (0, swagger_1.ApiOperation)({ summary: 'Get listing analytics' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Analytics retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.NOT_FOUND, description: 'Listing not found' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Listing ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "getListingAnalytics", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user dashboard data' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Dashboard data retrieved successfully' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('statistics'),
    (0, swagger_1.ApiOperation)({ summary: 'Get platform statistics' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Statistics retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "getStatistics", null);
exports.EnergyController = EnergyController = __decorate([
    (0, swagger_1.ApiTags)('energy'),
    (0, common_1.Controller)('api/energy'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [energy_service_1.EnergyService])
], EnergyController);
//# sourceMappingURL=energy.controller.js.map