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
var EnergyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnergyService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const energy_listing_entity_1 = require("./entities/energy-listing.entity");
const bid_entity_1 = require("./entities/bid.entity");
const trade_entity_1 = require("./entities/trade.entity");
let EnergyService = EnergyService_1 = class EnergyService {
    constructor(listingRepository, bidRepository, tradeRepository, dataSource) {
        this.listingRepository = listingRepository;
        this.bidRepository = bidRepository;
        this.tradeRepository = tradeRepository;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(EnergyService_1.name);
    }
    async createListing(createListingDto, userId) {
        this.logger.log(`Creating new energy listing for user: ${userId}`);
        const listing = this.listingRepository.create({
            ...createListingDto,
            createdBy: userId,
            status: energy_listing_entity_1.ListingStatus.ACTIVE,
            viewCount: 0,
            bidCount: 0,
        });
        if (createListingDto.expiresAt) {
            listing.expiresAt = new Date(createListingDto.expiresAt);
        }
        if (createListingDto.deliveryDate) {
            listing.deliveryDate = new Date(createListingDto.deliveryDate);
        }
        if (createListingDto.deliveryStartDate) {
            listing.deliveryStartDate = new Date(createListingDto.deliveryStartDate);
        }
        if (createListingDto.deliveryEndDate) {
            listing.deliveryEndDate = new Date(createListingDto.deliveryEndDate);
        }
        const savedListing = await this.listingRepository.save(listing);
        this.logger.log(`Created listing: ${savedListing.id}`);
        return savedListing;
    }
    async getListings(filter = {}, pagination = { page: 1, limit: 10 }) {
        this.logger.log(`Fetching listings with filter: ${JSON.stringify(filter)}, pagination: ${JSON.stringify(pagination)}`);
        const queryBuilder = this.listingRepository.createQueryBuilder('listing')
            .leftJoinAndSelect('listing.bids', 'bids')
            .leftJoinAndSelect('listing.trades', 'trades');
        if (filter.type) {
            queryBuilder.andWhere('listing.type = :type', { type: filter.type });
        }
        if (filter.energyType) {
            queryBuilder.andWhere('listing.energyType = :energyType', { energyType: filter.energyType });
        }
        if (filter.status) {
            queryBuilder.andWhere('listing.status = :status', { status: filter.status });
        }
        if (filter.minPrice) {
            queryBuilder.andWhere('listing.price >= :minPrice', { minPrice: filter.minPrice });
        }
        if (filter.maxPrice) {
            queryBuilder.andWhere('listing.price <= :maxPrice', { maxPrice: filter.maxPrice });
        }
        if (filter.minQuantity) {
            queryBuilder.andWhere('listing.quantity >= :minQuantity', { minQuantity: filter.minQuantity });
        }
        if (filter.maxQuantity) {
            queryBuilder.andWhere('listing.quantity <= :maxQuantity', { maxQuantity: filter.maxQuantity });
        }
        if (filter.createdBy) {
            queryBuilder.andWhere('listing.createdBy = :createdBy', { createdBy: filter.createdBy });
        }
        if (filter.isFeatured !== undefined) {
            queryBuilder.andWhere('listing.isFeatured = :isFeatured', { isFeatured: filter.isFeatured });
        }
        if (filter.isVerified !== undefined) {
            queryBuilder.andWhere('listing.isVerified = :isVerified', { isVerified: filter.isVerified });
        }
        if (filter.expiresAfter) {
            queryBuilder.andWhere('listing.expiresAt >= :expiresAfter', { expiresAfter: filter.expiresAfter });
        }
        if (filter.expiresBefore) {
            queryBuilder.andWhere('listing.expiresAt <= :expiresBefore', { expiresBefore: filter.expiresBefore });
        }
        if (filter.location) {
            queryBuilder.andWhere('(6371 * acos(cos(radians(:latitude)) * cos(radians(listing.location->>\'latitude\')) * cos(radians(listing.location->>\'longitude\') - radians(:longitude)) + sin(radians(:latitude)) * sin(radians(listing.location->>\'latitude\')))) <= :radius', {
                latitude: filter.location.latitude,
                longitude: filter.location.longitude,
                radius: filter.location.radius,
            });
        }
        const sortBy = pagination.sortBy || 'createdAt';
        const sortOrder = pagination.sortOrder || 'DESC';
        queryBuilder.orderBy(`listing.${sortBy}`, sortOrder);
        const skip = (pagination.page - 1) * pagination.limit;
        queryBuilder.skip(skip).take(pagination.limit);
        const [listings, total] = await queryBuilder.getManyAndCount();
        const totalPages = Math.ceil(total / pagination.limit);
        return {
            data: listings,
            total,
            page: pagination.page,
            limit: pagination.limit,
            totalPages,
            hasNext: pagination.page < totalPages,
            hasPrev: pagination.page > 1,
        };
    }
    async getListingById(id) {
        const listing = await this.listingRepository.findOne({
            where: { id },
            relations: ['bids', 'trades'],
        });
        if (!listing) {
            throw new common_1.NotFoundException(`Listing with ID ${id} not found`);
        }
        await this.incrementViewCount(id);
        return listing;
    }
    async updateListing(id, updateListingDto, userId) {
        const listing = await this.getListingById(id);
        if (listing.createdBy !== userId) {
            throw new common_1.ForbiddenException('You can only update your own listings');
        }
        if (listing.status === energy_listing_entity_1.ListingStatus.FILLED || listing.status === energy_listing_entity_1.ListingStatus.CANCELLED) {
            throw new common_1.BadRequestException('Cannot update listing that is filled or cancelled');
        }
        Object.assign(listing, updateListingDto);
        listing.updatedBy = userId;
        if (updateListingDto.expiresAt) {
            listing.expiresAt = new Date(updateListingDto.expiresAt);
        }
        if (updateListingDto.deliveryDate) {
            listing.deliveryDate = new Date(updateListingDto.deliveryDate);
        }
        if (updateListingDto.deliveryStartDate) {
            listing.deliveryStartDate = new Date(updateListingDto.deliveryStartDate);
        }
        if (updateListingDto.deliveryEndDate) {
            listing.deliveryEndDate = new Date(updateListingDto.deliveryEndDate);
        }
        const updatedListing = await this.listingRepository.save(listing);
        this.logger.log(`Updated listing: ${id} by user: ${userId}`);
        return updatedListing;
    }
    async cancelListing(id, userId) {
        const listing = await this.getListingById(id);
        if (listing.createdBy !== userId) {
            throw new common_1.ForbiddenException('You can only cancel your own listings');
        }
        if (listing.status === energy_listing_entity_1.ListingStatus.FILLED) {
            throw new common_1.BadRequestException('Cannot cancel listing that is already filled');
        }
        if (listing.status === energy_listing_entity_1.ListingStatus.CANCELLED) {
            throw new common_1.BadRequestException('Listing is already cancelled');
        }
        listing.status = energy_listing_entity_1.ListingStatus.CANCELLED;
        listing.cancelledAt = new Date();
        listing.updatedBy = userId;
        const cancelledListing = await this.listingRepository.save(listing);
        await this.rejectAllBidsForListing(id, userId);
        this.logger.log(`Cancelled listing: ${id} by user: ${userId}`);
        return cancelledListing;
    }
    async placeBid(placeBidDto, userId) {
        this.logger.log(`Placing bid on listing: ${placeBidDto.listingId} by user: ${userId}`);
        const listing = await this.getListingById(placeBidDto.listingId);
        if (listing.createdBy === userId) {
            throw new common_1.ForbiddenException('You cannot bid on your own listing');
        }
        if (listing.status !== energy_listing_entity_1.ListingStatus.ACTIVE) {
            throw new common_1.BadRequestException('Can only bid on active listings');
        }
        if (listing.expiresAt && listing.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Cannot bid on expired listing');
        }
        if (placeBidDto.quantity > listing.quantity) {
            throw new common_1.BadRequestException('Bid quantity cannot exceed listing quantity');
        }
        if (listing.minPrice && placeBidDto.price < listing.minPrice) {
            throw new common_1.BadRequestException(`Bid price cannot be below minimum price: ${listing.minPrice}`);
        }
        if (listing.maxPrice && placeBidDto.price > listing.maxPrice) {
            throw new common_1.BadRequestException(`Bid price cannot exceed maximum price: ${listing.maxPrice}`);
        }
        if (listing.requirements?.minimumBidQuantity && placeBidDto.quantity < listing.requirements.minimumBidQuantity) {
            throw new common_1.BadRequestException(`Bid quantity must be at least: ${listing.requirements.minimumBidQuantity}`);
        }
        if (listing.requirements?.maximumBidQuantity && placeBidDto.quantity > listing.requirements.maximumBidQuantity) {
            throw new common_1.BadRequestException(`Bid quantity cannot exceed: ${listing.requirements.maximumBidQuantity}`);
        }
        const existingBid = await this.bidRepository.findOne({
            where: {
                listingId: placeBidDto.listingId,
                bidderId: userId,
                status: bid_entity_1.BidStatus.PENDING,
            },
        });
        if (existingBid) {
            throw new common_1.BadRequestException('You already have a pending bid on this listing');
        }
        const bid = this.bidRepository.create({
            ...placeBidDto,
            bidderId: userId,
            status: bid_entity_1.BidStatus.PENDING,
            totalPrice: placeBidDto.quantity * placeBidDto.price,
            createdBy: userId,
        });
        if (placeBidDto.expiresAt) {
            bid.expiresAt = new Date(placeBidDto.expiresAt);
        }
        const savedBid = await this.bidRepository.save(bid);
        await this.incrementBidCount(placeBidDto.listingId);
        this.logger.log(`Placed bid: ${savedBid.id} on listing: ${placeBidDto.listingId}`);
        return savedBid;
    }
    async getBidsByUser(userId, pagination = { page: 1, limit: 10 }) {
        this.logger.log(`Fetching bids for user: ${userId}`);
        const queryBuilder = this.bidRepository.createQueryBuilder('bid')
            .leftJoinAndSelect('bid.listing', 'listing')
            .where('bid.bidderId = :userId', { userId });
        const sortBy = pagination.sortBy || 'createdAt';
        const sortOrder = pagination.sortOrder || 'DESC';
        queryBuilder.orderBy(`bid.${sortBy}`, sortOrder);
        const skip = (pagination.page - 1) * pagination.limit;
        queryBuilder.skip(skip).take(pagination.limit);
        const [bids, total] = await queryBuilder.getManyAndCount();
        const totalPages = Math.ceil(total / pagination.limit);
        return {
            data: bids,
            total,
            page: pagination.page,
            limit: pagination.limit,
            totalPages,
            hasNext: pagination.page < totalPages,
            hasPrev: pagination.page > 1,
        };
    }
    async getBidsForListing(listingId, userId) {
        const listing = await this.getListingById(listingId);
        if (listing.createdBy !== userId) {
            throw new common_1.ForbiddenException('You can only view bids for your own listings');
        }
        return this.bidRepository.find({
            where: { listingId },
            relations: ['listing'],
            order: { createdAt: 'DESC' },
        });
    }
    async acceptBid(bidId, userId) {
        const bid = await this.bidRepository.findOne({
            where: { id: bidId },
            relations: ['listing'],
        });
        if (!bid) {
            throw new common_1.NotFoundException(`Bid with ID ${bidId} not found`);
        }
        if (bid.listing.createdBy !== userId) {
            throw new common_1.ForbiddenException('You can only accept bids for your own listings');
        }
        if (bid.status !== bid_entity_1.BidStatus.PENDING) {
            throw new common_1.BadRequestException('Can only accept pending bids');
        }
        if (bid.listing.status !== energy_listing_entity_1.ListingStatus.ACTIVE) {
            throw new common_1.BadRequestException('Listing is no longer active');
        }
        return await this.dataSource.transaction(async (manager) => {
            bid.status = bid_entity_1.BidStatus.ACCEPTED;
            bid.acceptedAt = new Date();
            bid.respondedBy = userId;
            await manager.save(bid);
            bid.listing.status = energy_listing_entity_1.ListingStatus.FILLED;
            bid.listing.filledAt = new Date();
            await manager.save(bid.listing);
            await this.rejectOtherBidsForListing(bid.listingId, bidId, manager);
            this.logger.log(`Accepted bid: ${bidId} for listing: ${bid.listingId}`);
            return bid;
        });
    }
    async rejectBid(bidId, userId, reason) {
        const bid = await this.bidRepository.findOne({
            where: { id: bidId },
            relations: ['listing'],
        });
        if (!bid) {
            throw new common_1.NotFoundException(`Bid with ID ${bidId} not found`);
        }
        if (bid.listing.createdBy !== userId) {
            throw new common_1.ForbiddenException('You can only reject bids for your own listings');
        }
        if (bid.status !== bid_entity_1.BidStatus.PENDING) {
            throw new common_1.BadRequestException('Can only reject pending bids');
        }
        bid.status = bid_entity_1.BidStatus.REJECTED;
        bid.rejectedAt = new Date();
        bid.respondedBy = userId;
        if (!bid.auditTrail)
            bid.auditTrail = [];
        bid.auditTrail.push({
            timestamp: new Date(),
            action: 'rejected',
            userId,
            reason: reason || 'Bid rejected by listing owner',
            previousStatus: bid_entity_1.BidStatus.PENDING,
            newStatus: bid_entity_1.BidStatus.REJECTED,
        });
        const rejectedBid = await this.bidRepository.save(bid);
        this.logger.log(`Rejected bid: ${bidId} for listing: ${bid.listingId}`);
        return rejectedBid;
    }
    async withdrawBid(bidId, userId) {
        const bid = await this.bidRepository.findOne({ where: { id: bidId } });
        if (!bid) {
            throw new common_1.NotFoundException(`Bid with ID ${bidId} not found`);
        }
        if (bid.bidderId !== userId) {
            throw new common_1.ForbiddenException('You can only withdraw your own bids');
        }
        if (bid.status !== bid_entity_1.BidStatus.PENDING) {
            throw new common_1.BadRequestException('Can only withdraw pending bids');
        }
        bid.status = bid_entity_1.BidStatus.WITHDRAWN;
        bid.withdrawnAt = new Date();
        bid.updatedBy = userId;
        const withdrawnBid = await this.bidRepository.save(bid);
        await this.decrementBidCount(bid.listingId);
        this.logger.log(`Withdrew bid: ${bidId} by user: ${userId}`);
        return withdrawnBid;
    }
    async executeTrade(executeTradeDto, userId) {
        this.logger.log(`Executing trade for bid: ${executeTradeDto.bidId} by user: ${userId}`);
        const bid = await this.bidRepository.findOne({
            where: { id: executeTradeDto.bidId },
            relations: ['listing'],
        });
        if (!bid) {
            throw new common_1.NotFoundException(`Bid with ID ${executeTradeDto.bidId} not found`);
        }
        if (bid.status !== bid_entity_1.BidStatus.ACCEPTED) {
            throw new common_1.BadRequestException('Can only execute trade for accepted bids');
        }
        const isBuyer = bid.listing.type === energy_listing_entity_1.ListingType.SELL;
        const isSeller = bid.listing.type === energy_listing_entity_1.ListingType.BUY;
        if ((isBuyer && bid.bidderId !== userId) || (isSeller && bid.listing.createdBy !== userId)) {
            throw new common_1.ForbiddenException('You are not authorized to execute this trade');
        }
        const existingTrade = await this.tradeRepository.findOne({
            where: { bidId: executeTradeDto.bidId },
        });
        if (existingTrade) {
            throw new common_1.BadRequestException('Trade already exists for this bid');
        }
        const finalPrice = executeTradeDto.negotiatedDiscount
            ? bid.price * (1 - executeTradeDto.negotiatedDiscount)
            : bid.price;
        const finalAmount = bid.quantity * finalPrice;
        const serviceFee = executeTradeDto.serviceFee || 0;
        const taxAmount = executeTradeDto.taxAmount || 0;
        const deliveryCost = executeTradeDto.deliveryCost || 0;
        const totalAmount = finalAmount + serviceFee + taxAmount + deliveryCost;
        const trade = this.tradeRepository.create({
            ...executeTradeDto,
            listingId: bid.listingId,
            bidId: bid.id,
            buyerId: isBuyer ? bid.bidderId : bid.listing.createdBy,
            sellerId: isSeller ? bid.bidderId : bid.listing.createdBy,
            quantity: bid.quantity,
            price: bid.price,
            finalPrice,
            totalAmount: finalAmount,
            finalAmount: totalAmount,
            status: trade_entity_1.TradeStatus.PENDING,
            paymentStatus: trade_entity_1.PaymentStatus.PENDING,
            deliveryStatus: trade_entity_1.DeliveryStatus.PENDING,
            createdBy: userId,
        });
        if (executeTradeDto.deliveryDetails?.deliveryDate) {
            trade.deliveryDetails = {
                ...executeTradeDto.deliveryDetails,
                deliveryDate: new Date(executeTradeDto.deliveryDetails.deliveryDate),
                deliveryWindow: {
                    start: new Date(executeTradeDto.deliveryDetails.deliveryWindow.start),
                    end: new Date(executeTradeDto.deliveryDetails.deliveryWindow.end),
                },
            };
        }
        if (executeTradeDto.paymentDetails?.paymentSchedule) {
            trade.paymentDetails = {
                ...executeTradeDto.paymentDetails,
                paymentSchedule: executeTradeDto.paymentDetails.paymentSchedule.map(schedule => ({
                    ...schedule,
                    dueDate: new Date(schedule.dueDate),
                })),
            };
        }
        if (executeTradeDto.contractTerms?.termsAcceptedAt) {
            trade.contractTerms = {
                ...executeTradeDto.contractTerms,
                termsAcceptedAt: new Date(executeTradeDto.contractTerms.termsAcceptedAt),
            };
        }
        if (executeTradeDto.qualityAssurance?.inspectionDate) {
            trade.qualityAssurance = {
                ...executeTradeDto.qualityAssurance,
                inspectionDate: new Date(executeTradeDto.qualityAssurance.inspectionDate),
            };
        }
        if (executeTradeDto.milestones) {
            trade.milestones = executeTradeDto.milestones.map(milestone => ({
                ...milestone,
                dueDate: new Date(milestone.dueDate),
                completedDate: milestone.completedDate ? new Date(milestone.completedDate) : undefined,
            }));
        }
        const savedTrade = await this.tradeRepository.save(trade);
        this.logger.log(`Executed trade: ${savedTrade.id} for bid: ${executeTradeDto.bidId}`);
        return savedTrade;
    }
    async getTradeById(id, userId) {
        const trade = await this.tradeRepository.findOne({
            where: { id },
            relations: ['listing', 'bid'],
        });
        if (!trade) {
            throw new common_1.NotFoundException(`Trade with ID ${id} not found`);
        }
        if (trade.buyerId !== userId && trade.sellerId !== userId) {
            throw new common_1.ForbiddenException('You can only view trades you are involved in');
        }
        return trade;
    }
    async getTradesByUser(userId, pagination = { page: 1, limit: 10 }) {
        this.logger.log(`Fetching trades for user: ${userId}`);
        const queryBuilder = this.tradeRepository.createQueryBuilder('trade')
            .leftJoinAndSelect('trade.listing', 'listing')
            .leftJoinAndSelect('trade.bid', 'bid')
            .where('trade.buyerId = :userId OR trade.sellerId = :userId', { userId });
        const sortBy = pagination.sortBy || 'createdAt';
        const sortOrder = pagination.sortOrder || 'DESC';
        queryBuilder.orderBy(`trade.${sortBy}`, sortOrder);
        const skip = (pagination.page - 1) * pagination.limit;
        queryBuilder.skip(skip).take(pagination.limit);
        const [trades, total] = await queryBuilder.getManyAndCount();
        const totalPages = Math.ceil(total / pagination.limit);
        return {
            data: trades,
            total,
            page: pagination.page,
            limit: pagination.limit,
            totalPages,
            hasNext: pagination.page < totalPages,
            hasPrev: pagination.page > 1,
        };
    }
    async updateTradeStatus(id, status, userId, reason) {
        const trade = await this.getTradeById(id, userId);
        const validTransitions = this.getValidStatusTransitions(trade.status);
        if (!validTransitions.includes(status)) {
            throw new common_1.BadRequestException(`Cannot transition from ${trade.status} to ${status}`);
        }
        const previousStatus = trade.status;
        trade.status = status;
        trade.updatedBy = userId;
        if (!trade.auditTrail)
            trade.auditTrail = [];
        trade.auditTrail.push({
            timestamp: new Date(),
            action: 'status_changed',
            userId,
            reason: reason || `Status changed from ${previousStatus} to ${status}`,
            previousStatus,
            newStatus: status,
        });
        switch (status) {
            case trade_entity_1.TradeStatus.CONFIRMED:
                trade.confirmedAt = new Date();
                trade.confirmedBy = userId;
                break;
            case trade_entity_1.TradeStatus.COMPLETED:
                trade.completedAt = new Date();
                break;
            case trade_entity_1.TradeStatus.CANCELLED:
                trade.cancelledAt = new Date();
                trade.cancelledBy = userId;
                break;
            case trade_entity_1.TradeStatus.DISPUTED:
                trade.disputedAt = new Date();
                trade.disputedBy = userId;
                trade.isDisputed = true;
                trade.disputeReason = reason;
                break;
        }
        const updatedTrade = await this.tradeRepository.save(trade);
        this.logger.log(`Updated trade status: ${id} to ${status} by user: ${userId}`);
        return updatedTrade;
    }
    async getOrderBook(filter = {}) {
        const buyFilter = { ...filter, type: energy_listing_entity_1.ListingType.BUY };
        const sellFilter = { ...filter, type: energy_listing_entity_1.ListingType.SELL };
        const [buyOrders, sellOrders] = await Promise.all([
            this.getListings(buyFilter, { page: 1, limit: 100, sortBy: 'price', sortOrder: 'DESC' }),
            this.getListings(sellFilter, { page: 1, limit: 100, sortBy: 'price', sortOrder: 'ASC' }),
        ]);
        const totalBuyQuantity = buyOrders.data.reduce((sum, order) => sum + order.quantity, 0);
        const totalSellQuantity = sellOrders.data.reduce((sum, order) => sum + order.quantity, 0);
        const avgBuyPrice = buyOrders.data.length > 0
            ? buyOrders.data.reduce((sum, order) => sum + order.price, 0) / buyOrders.data.length
            : 0;
        const avgSellPrice = sellOrders.data.length > 0
            ? sellOrders.data.reduce((sum, order) => sum + order.price, 0) / sellOrders.data.length
            : 0;
        const spread = avgSellPrice - avgBuyPrice;
        return {
            buyOrders: buyOrders.data,
            sellOrders: sellOrders.data,
            summary: {
                totalBuyOrders: buyOrders.total,
                totalSellOrders: sellOrders.total,
                totalBuyQuantity,
                totalSellQuantity,
                avgBuyPrice,
                avgSellPrice,
                spread,
            },
        };
    }
    async incrementViewCount(listingId) {
        await this.listingRepository.increment({ id: listingId }, 'viewCount', 1);
    }
    async incrementBidCount(listingId) {
        await this.listingRepository.increment({ id: listingId }, 'bidCount', 1);
    }
    async decrementBidCount(listingId) {
        await this.listingRepository.decrement({ id: listingId }, 'bidCount', 1);
    }
    async rejectAllBidsForListing(listingId, userId) {
        const pendingBids = await this.bidRepository.find({
            where: { listingId, status: bid_entity_1.BidStatus.PENDING },
        });
        for (const bid of pendingBids) {
            bid.status = bid_entity_1.BidStatus.REJECTED;
            bid.rejectedAt = new Date();
            bid.respondedBy = userId;
            await this.bidRepository.save(bid);
        }
    }
    async rejectOtherBidsForListing(listingId, acceptedBidId, manager) {
        const otherBids = await manager.find({
            where: {
                listingId,
                status: bid_entity_1.BidStatus.PENDING,
                id: Not(acceptedBidId),
            },
        });
        for (const bid of otherBids) {
            bid.status = bid_entity_1.BidStatus.REJECTED;
            bid.rejectedAt = new Date();
            await manager.save(bid);
        }
    }
    getValidStatusTransitions(currentStatus) {
        const transitions = {
            [trade_entity_1.TradeStatus.PENDING]: [trade_entity_1.TradeStatus.CONFIRMED, trade_entity_1.TradeStatus.CANCELLED],
            [trade_entity_1.TradeStatus.CONFIRMED]: [trade_entity_1.TradeStatus.IN_PROGRESS, trade_entity_1.TradeStatus.CANCELLED],
            [trade_entity_1.TradeStatus.IN_PROGRESS]: [trade_entity_1.TradeStatus.COMPLETED, trade_entity_1.TradeStatus.DISPUTED, trade_entity_1.TradeStatus.CANCELLED],
            [trade_entity_1.TradeStatus.COMPLETED]: [trade_entity_1.TradeStatus.REFUNDED],
            [trade_entity_1.TradeStatus.CANCELLED]: [],
            [trade_entity_1.TradeStatus.DISPUTED]: [trade_entity_1.TradeStatus.COMPLETED, trade_entity_1.TradeStatus.CANCELLED, trade_entity_1.TradeStatus.REFUNDED],
            [trade_entity_1.TradeStatus.REFUNDED]: [],
        };
        return transitions[currentStatus] || [];
    }
};
exports.EnergyService = EnergyService;
exports.EnergyService = EnergyService = EnergyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(energy_listing_entity_1.EnergyListing)),
    __param(1, (0, typeorm_1.InjectRepository)(bid_entity_1.Bid)),
    __param(2, (0, typeorm_1.InjectRepository)(trade_entity_1.Trade)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], EnergyService);
//# sourceMappingURL=energy.service.js.map