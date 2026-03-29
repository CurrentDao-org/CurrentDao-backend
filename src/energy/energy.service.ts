import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  Between,
  LessThan,
  MoreThan,
  FindManyOptions,
} from 'typeorm';
import {
  EnergyListing,
  ListingStatus,
  ListingType,
} from './entities/energy-listing.entity';
import { Bid, BidStatus } from './entities/bid.entity';
import {
  Trade,
  TradeStatus,
  PaymentStatus,
  DeliveryStatus,
} from './entities/trade.entity';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { PlaceBidDto } from './dto/place-bid.dto';
import { ExecuteTradeDto } from './dto/execute-trade.dto';

export interface ListingFilter {
  type?: ListingType;
  energyType?: string;
  status?: ListingStatus;
  minPrice?: number;
  maxPrice?: number;
  minQuantity?: number;
  maxQuantity?: number;
  location?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  createdBy?: string;
  isFeatured?: boolean;
  isVerified?: boolean;
  expiresAfter?: Date;
  expiresBefore?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

@Injectable()
export class EnergyService {
  private readonly logger = new Logger(EnergyService.name);

  constructor(
    @InjectRepository(EnergyListing)
    private readonly listingRepository: Repository<EnergyListing>,
    @InjectRepository(Bid)
    private readonly bidRepository: Repository<Bid>,
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    private readonly dataSource: DataSource,
  ) {}

  async createListing(
    createListingDto: CreateListingDto,
    userId: string,
  ): Promise<EnergyListing> {
    this.logger.log(`Creating new energy listing for user: ${userId}`);

    const listing = this.listingRepository.create({
      ...createListingDto,
      createdBy: userId,
      status: ListingStatus.ACTIVE,
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

  async getListings(
    filter: ListingFilter = {},
    pagination: PaginationOptions = { page: 1, limit: 10 },
  ): Promise<PaginatedResult<EnergyListing>> {
    this.logger.log(
      `Fetching listings with filter: ${JSON.stringify(filter)}, pagination: ${JSON.stringify(pagination)}`,
    );

    const queryBuilder = this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.bids', 'bids')
      .leftJoinAndSelect('listing.trades', 'trades');

    if (filter.type) {
      queryBuilder.andWhere('listing.type = :type', { type: filter.type });
    }

    if (filter.energyType) {
      queryBuilder.andWhere('listing.energyType = :energyType', {
        energyType: filter.energyType,
      });
    }

    if (filter.status) {
      queryBuilder.andWhere('listing.status = :status', {
        status: filter.status,
      });
    }

    if (filter.minPrice) {
      queryBuilder.andWhere('listing.price >= :minPrice', {
        minPrice: filter.minPrice,
      });
    }

    if (filter.maxPrice) {
      queryBuilder.andWhere('listing.price <= :maxPrice', {
        maxPrice: filter.maxPrice,
      });
    }

    if (filter.minQuantity) {
      queryBuilder.andWhere('listing.quantity >= :minQuantity', {
        minQuantity: filter.minQuantity,
      });
    }

    if (filter.maxQuantity) {
      queryBuilder.andWhere('listing.quantity <= :maxQuantity', {
        maxQuantity: filter.maxQuantity,
      });
    }

    if (filter.createdBy) {
      queryBuilder.andWhere('listing.createdBy = :createdBy', {
        createdBy: filter.createdBy,
      });
    }

    if (filter.isFeatured !== undefined) {
      queryBuilder.andWhere('listing.isFeatured = :isFeatured', {
        isFeatured: filter.isFeatured,
      });
    }

    if (filter.isVerified !== undefined) {
      queryBuilder.andWhere('listing.isVerified = :isVerified', {
        isVerified: filter.isVerified,
      });
    }

    if (filter.expiresAfter) {
      queryBuilder.andWhere('listing.expiresAt >= :expiresAfter', {
        expiresAfter: filter.expiresAfter,
      });
    }

    if (filter.expiresBefore) {
      queryBuilder.andWhere('listing.expiresAt <= :expiresBefore', {
        expiresBefore: filter.expiresBefore,
      });
    }

    if (filter.location) {
      queryBuilder.andWhere(
        "(6371 * acos(cos(radians(:latitude)) * cos(radians(listing.location->>'latitude')) * cos(radians(listing.location->>'longitude') - radians(:longitude)) + sin(radians(:latitude)) * sin(radians(listing.location->>'latitude')))) <= :radius",
        {
          latitude: filter.location.latitude,
          longitude: filter.location.longitude,
          radius: filter.location.radius,
        },
      );
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

  async getListingById(id: string): Promise<EnergyListing> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: ['bids', 'trades'],
    });

    if (!listing) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    await this.incrementViewCount(id);

    return listing;
  }

  async updateListing(
    id: string,
    updateListingDto: UpdateListingDto,
    userId: string,
  ): Promise<EnergyListing> {
    const listing = await this.getListingById(id);

    if (listing.createdBy !== userId) {
      throw new ForbiddenException('You can only update your own listings');
    }

    if (
      listing.status === ListingStatus.FILLED ||
      listing.status === ListingStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cannot update listing that is filled or cancelled',
      );
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

  async cancelListing(id: string, userId: string): Promise<EnergyListing> {
    const listing = await this.getListingById(id);

    if (listing.createdBy !== userId) {
      throw new ForbiddenException('You can only cancel your own listings');
    }

    if (listing.status === ListingStatus.FILLED) {
      throw new BadRequestException(
        'Cannot cancel listing that is already filled',
      );
    }

    if (listing.status === ListingStatus.CANCELLED) {
      throw new BadRequestException('Listing is already cancelled');
    }

    listing.status = ListingStatus.CANCELLED;
    listing.cancelledAt = new Date();
    listing.updatedBy = userId;

    const cancelledListing = await this.listingRepository.save(listing);

    await this.rejectAllBidsForListing(id, userId);

    this.logger.log(`Cancelled listing: ${id} by user: ${userId}`);
    return cancelledListing;
  }

  async placeBid(placeBidDto: PlaceBidDto, userId: string): Promise<Bid> {
    this.logger.log(
      `Placing bid on listing: ${placeBidDto.listingId} by user: ${userId}`,
    );

    const listing = await this.getListingById(placeBidDto.listingId);

    if (listing.createdBy === userId) {
      throw new ForbiddenException('You cannot bid on your own listing');
    }

    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException('Can only bid on active listings');
    }

    if (listing.expiresAt && listing.expiresAt < new Date()) {
      throw new BadRequestException('Cannot bid on expired listing');
    }

    if (placeBidDto.quantity > listing.quantity) {
      throw new BadRequestException(
        'Bid quantity cannot exceed listing quantity',
      );
    }

    if (listing.minPrice && placeBidDto.price < listing.minPrice) {
      throw new BadRequestException(
        `Bid price cannot be below minimum price: ${listing.minPrice}`,
      );
    }

    if (listing.maxPrice && placeBidDto.price > listing.maxPrice) {
      throw new BadRequestException(
        `Bid price cannot exceed maximum price: ${listing.maxPrice}`,
      );
    }

    if (
      listing.requirements?.minimumBidQuantity &&
      placeBidDto.quantity < listing.requirements.minimumBidQuantity
    ) {
      throw new BadRequestException(
        `Bid quantity must be at least: ${listing.requirements.minimumBidQuantity}`,
      );
    }

    if (
      listing.requirements?.maximumBidQuantity &&
      placeBidDto.quantity > listing.requirements.maximumBidQuantity
    ) {
      throw new BadRequestException(
        `Bid quantity cannot exceed: ${listing.requirements.maximumBidQuantity}`,
      );
    }

    const existingBid = await this.bidRepository.findOne({
      where: {
        listingId: placeBidDto.listingId,
        bidderId: userId,
        status: BidStatus.PENDING,
      },
    });

    if (existingBid) {
      throw new BadRequestException(
        'You already have a pending bid on this listing',
      );
    }

    const bid = this.bidRepository.create({
      ...placeBidDto,
      bidderId: userId,
      status: BidStatus.PENDING,
      totalPrice: placeBidDto.quantity * placeBidDto.price,
      createdBy: userId,
    });

    if (placeBidDto.expiresAt) {
      bid.expiresAt = new Date(placeBidDto.expiresAt);
    }

    const savedBid = await this.bidRepository.save(bid);

    await this.incrementBidCount(placeBidDto.listingId);

    this.logger.log(
      `Placed bid: ${savedBid.id} on listing: ${placeBidDto.listingId}`,
    );
    return savedBid;
  }

  async getBidsByUser(
    userId: string,
    pagination: PaginationOptions = { page: 1, limit: 10 },
  ): Promise<PaginatedResult<Bid>> {
    this.logger.log(`Fetching bids for user: ${userId}`);

    const queryBuilder = this.bidRepository
      .createQueryBuilder('bid')
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

  async getBidsForListing(listingId: string, userId: string): Promise<Bid[]> {
    const listing = await this.getListingById(listingId);

    if (listing.createdBy !== userId) {
      throw new ForbiddenException(
        'You can only view bids for your own listings',
      );
    }

    return this.bidRepository.find({
      where: { listingId },
      relations: ['listing'],
      order: { createdAt: 'DESC' },
    });
  }

  async acceptBid(bidId: string, userId: string): Promise<Bid> {
    const bid = await this.bidRepository.findOne({
      where: { id: bidId },
      relations: ['listing'],
    });

    if (!bid) {
      throw new NotFoundException(`Bid with ID ${bidId} not found`);
    }

    if (bid.listing.createdBy !== userId) {
      throw new ForbiddenException(
        'You can only accept bids for your own listings',
      );
    }

    if (bid.status !== BidStatus.PENDING) {
      throw new BadRequestException('Can only accept pending bids');
    }

    if (bid.listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException('Listing is no longer active');
    }

    return await this.dataSource.transaction(async (manager) => {
      bid.status = BidStatus.ACCEPTED;
      bid.acceptedAt = new Date();
      bid.respondedBy = userId;
      await manager.save(bid);

      bid.listing.status = ListingStatus.FILLED;
      bid.listing.filledAt = new Date();
      await manager.save(bid.listing);

      await this.rejectOtherBidsForListing(bid.listingId, bidId, manager);

      this.logger.log(`Accepted bid: ${bidId} for listing: ${bid.listingId}`);
      return bid;
    });
  }

  async rejectBid(
    bidId: string,
    userId: string,
    reason?: string,
  ): Promise<Bid> {
    const bid = await this.bidRepository.findOne({
      where: { id: bidId },
      relations: ['listing'],
    });

    if (!bid) {
      throw new NotFoundException(`Bid with ID ${bidId} not found`);
    }

    if (bid.listing.createdBy !== userId) {
      throw new ForbiddenException(
        'You can only reject bids for your own listings',
      );
    }

    if (bid.status !== BidStatus.PENDING) {
      throw new BadRequestException('Can only reject pending bids');
    }

    bid.status = BidStatus.REJECTED;
    bid.rejectedAt = new Date();
    bid.respondedBy = userId;

    if (!bid.auditTrail) bid.auditTrail = [];
    bid.auditTrail.push({
      timestamp: new Date(),
      action: 'rejected',
      userId,
      reason: reason || 'Bid rejected by listing owner',
      previousStatus: BidStatus.PENDING,
      newStatus: BidStatus.REJECTED,
    });

    const rejectedBid = await this.bidRepository.save(bid);

    this.logger.log(`Rejected bid: ${bidId} for listing: ${bid.listingId}`);
    return rejectedBid;
  }

  async withdrawBid(bidId: string, userId: string): Promise<Bid> {
    const bid = await this.bidRepository.findOne({ where: { id: bidId } });

    if (!bid) {
      throw new NotFoundException(`Bid with ID ${bidId} not found`);
    }

    if (bid.bidderId !== userId) {
      throw new ForbiddenException('You can only withdraw your own bids');
    }

    if (bid.status !== BidStatus.PENDING) {
      throw new BadRequestException('Can only withdraw pending bids');
    }

    bid.status = BidStatus.WITHDRAWN;
    bid.withdrawnAt = new Date();
    bid.updatedBy = userId;

    const withdrawnBid = await this.bidRepository.save(bid);

    await this.decrementBidCount(bid.listingId);

    this.logger.log(`Withdrew bid: ${bidId} by user: ${userId}`);
    return withdrawnBid;
  }

  async executeTrade(
    executeTradeDto: ExecuteTradeDto,
    userId: string,
  ): Promise<Trade> {
    this.logger.log(
      `Executing trade for bid: ${executeTradeDto.bidId} by user: ${userId}`,
    );

    const bid = await this.bidRepository.findOne({
      where: { id: executeTradeDto.bidId },
      relations: ['listing'],
    });

    if (!bid) {
      throw new NotFoundException(
        `Bid with ID ${executeTradeDto.bidId} not found`,
      );
    }

    if (bid.status !== BidStatus.ACCEPTED) {
      throw new BadRequestException('Can only execute trade for accepted bids');
    }

    const isBuyer = bid.listing.type === ListingType.SELL;
    const isSeller = bid.listing.type === ListingType.BUY;

    if (
      (isBuyer && bid.bidderId !== userId) ||
      (isSeller && bid.listing.createdBy !== userId)
    ) {
      throw new ForbiddenException(
        'You are not authorized to execute this trade',
      );
    }

    const existingTrade = await this.tradeRepository.findOne({
      where: { bidId: executeTradeDto.bidId },
    });

    if (existingTrade) {
      throw new BadRequestException('Trade already exists for this bid');
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
      status: TradeStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      deliveryStatus: DeliveryStatus.PENDING,
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
        paymentSchedule: executeTradeDto.paymentDetails.paymentSchedule.map(
          (schedule) => ({
            ...schedule,
            dueDate: new Date(schedule.dueDate),
          }),
        ),
      };
    }

    if (executeTradeDto.contractTerms?.termsAcceptedAt) {
      trade.contractTerms = {
        ...executeTradeDto.contractTerms,
        termsAcceptedAt: new Date(
          executeTradeDto.contractTerms.termsAcceptedAt,
        ),
      };
    }

    if (executeTradeDto.qualityAssurance?.inspectionDate) {
      trade.qualityAssurance = {
        ...executeTradeDto.qualityAssurance,
        inspectionDate: new Date(
          executeTradeDto.qualityAssurance.inspectionDate,
        ),
      };
    }

    if (executeTradeDto.milestones) {
      trade.milestones = executeTradeDto.milestones.map((milestone) => ({
        ...milestone,
        dueDate: new Date(milestone.dueDate),
        completedDate: milestone.completedDate
          ? new Date(milestone.completedDate)
          : undefined,
      }));
    }

    const savedTrade = await this.tradeRepository.save(trade);

    this.logger.log(
      `Executed trade: ${savedTrade.id} for bid: ${executeTradeDto.bidId}`,
    );
    return savedTrade;
  }

  async getTradeById(id: string, userId: string): Promise<Trade> {
    const trade = await this.tradeRepository.findOne({
      where: { id },
      relations: ['listing', 'bid'],
    });

    if (!trade) {
      throw new NotFoundException(`Trade with ID ${id} not found`);
    }

    if (trade.buyerId !== userId && trade.sellerId !== userId) {
      throw new ForbiddenException(
        'You can only view trades you are involved in',
      );
    }

    return trade;
  }

  async getTradesByUser(
    userId: string,
    pagination: PaginationOptions = { page: 1, limit: 10 },
  ): Promise<PaginatedResult<Trade>> {
    this.logger.log(`Fetching trades for user: ${userId}`);

    const queryBuilder = this.tradeRepository
      .createQueryBuilder('trade')
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

  async updateTradeStatus(
    id: string,
    status: TradeStatus,
    userId: string,
    reason?: string,
  ): Promise<Trade> {
    const trade = await this.getTradeById(id, userId);

    const validTransitions = this.getValidStatusTransitions(trade.status);
    if (!validTransitions.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from ${trade.status} to ${status}`,
      );
    }

    const previousStatus = trade.status;
    trade.status = status;
    trade.updatedBy = userId;

    if (!trade.auditTrail) trade.auditTrail = [];
    trade.auditTrail.push({
      timestamp: new Date(),
      action: 'status_changed',
      userId,
      reason: reason || `Status changed from ${previousStatus} to ${status}`,
      previousStatus,
      newStatus: status,
    });

    switch (status) {
      case TradeStatus.CONFIRMED:
        trade.confirmedAt = new Date();
        trade.confirmedBy = userId;
        break;
      case TradeStatus.COMPLETED:
        trade.completedAt = new Date();
        break;
      case TradeStatus.CANCELLED:
        trade.cancelledAt = new Date();
        trade.cancelledBy = userId;
        break;
      case TradeStatus.DISPUTED:
        trade.disputedAt = new Date();
        trade.disputedBy = userId;
        trade.isDisputed = true;
        trade.disputeReason = reason;
        break;
    }

    const updatedTrade = await this.tradeRepository.save(trade);

    this.logger.log(
      `Updated trade status: ${id} to ${status} by user: ${userId}`,
    );
    return updatedTrade;
  }

  async getOrderBook(filter: ListingFilter = {}): Promise<{
    buyOrders: EnergyListing[];
    sellOrders: EnergyListing[];
    summary: {
      totalBuyOrders: number;
      totalSellOrders: number;
      totalBuyQuantity: number;
      totalSellQuantity: number;
      avgBuyPrice: number;
      avgSellPrice: number;
      spread: number;
    };
  }> {
    const buyFilter = { ...filter, type: ListingType.BUY };
    const sellFilter = { ...filter, type: ListingType.SELL };

    const [buyOrders, sellOrders] = await Promise.all([
      this.getListings(buyFilter, {
        page: 1,
        limit: 100,
        sortBy: 'price',
        sortOrder: 'DESC',
      }),
      this.getListings(sellFilter, {
        page: 1,
        limit: 100,
        sortBy: 'price',
        sortOrder: 'ASC',
      }),
    ]);

    const totalBuyQuantity = buyOrders.data.reduce(
      (sum, order) => sum + order.quantity,
      0,
    );
    const totalSellQuantity = sellOrders.data.reduce(
      (sum, order) => sum + order.quantity,
      0,
    );

    const avgBuyPrice =
      buyOrders.data.length > 0
        ? buyOrders.data.reduce((sum, order) => sum + order.price, 0) /
          buyOrders.data.length
        : 0;

    const avgSellPrice =
      sellOrders.data.length > 0
        ? sellOrders.data.reduce((sum, order) => sum + order.price, 0) /
          sellOrders.data.length
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

  private async incrementViewCount(listingId: string): Promise<void> {
    await this.listingRepository.increment({ id: listingId }, 'viewCount', 1);
  }

  private async incrementBidCount(listingId: string): Promise<void> {
    await this.listingRepository.increment({ id: listingId }, 'bidCount', 1);
  }

  private async decrementBidCount(listingId: string): Promise<void> {
    await this.listingRepository.decrement({ id: listingId }, 'bidCount', 1);
  }

  private async rejectAllBidsForListing(
    listingId: string,
    userId: string,
  ): Promise<void> {
    const pendingBids = await this.bidRepository.find({
      where: { listingId, status: BidStatus.PENDING },
    });

    for (const bid of pendingBids) {
      bid.status = BidStatus.REJECTED;
      bid.rejectedAt = new Date();
      bid.respondedBy = userId;
      await this.bidRepository.save(bid);
    }
  }

  private async rejectOtherBidsForListing(
    listingId: string,
    acceptedBidId: string,
    manager: Repository<Bid>,
  ): Promise<void> {
    const otherBids = await manager.find({
      where: {
        listingId,
        status: BidStatus.PENDING,
        id: Not(acceptedBidId),
      },
    });

    for (const bid of otherBids) {
      bid.status = BidStatus.REJECTED;
      bid.rejectedAt = new Date();
      await manager.save(bid);
    }
  }

  private getValidStatusTransitions(currentStatus: TradeStatus): TradeStatus[] {
    const transitions: Record<TradeStatus, TradeStatus[]> = {
      [TradeStatus.PENDING]: [TradeStatus.CONFIRMED, TradeStatus.CANCELLED],
      [TradeStatus.CONFIRMED]: [TradeStatus.IN_PROGRESS, TradeStatus.CANCELLED],
      [TradeStatus.IN_PROGRESS]: [
        TradeStatus.COMPLETED,
        TradeStatus.DISPUTED,
        TradeStatus.CANCELLED,
      ],
      [TradeStatus.COMPLETED]: [TradeStatus.REFUNDED],
      [TradeStatus.CANCELLED]: [],
      [TradeStatus.DISPUTED]: [
        TradeStatus.COMPLETED,
        TradeStatus.CANCELLED,
        TradeStatus.REFUNDED,
      ],
      [TradeStatus.REFUNDED]: [],
    };

    return transitions[currentStatus] || [];
  }
}
