import { Repository, DataSource } from 'typeorm';
import { EnergyListing, ListingStatus, ListingType } from './entities/energy-listing.entity';
import { Bid } from './entities/bid.entity';
import { Trade, TradeStatus } from './entities/trade.entity';
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
export declare class EnergyService {
    private readonly listingRepository;
    private readonly bidRepository;
    private readonly tradeRepository;
    private readonly dataSource;
    private readonly logger;
    constructor(listingRepository: Repository<EnergyListing>, bidRepository: Repository<Bid>, tradeRepository: Repository<Trade>, dataSource: DataSource);
    createListing(createListingDto: CreateListingDto, userId: string): Promise<EnergyListing>;
    getListings(filter?: ListingFilter, pagination?: PaginationOptions): Promise<PaginatedResult<EnergyListing>>;
    getListingById(id: string): Promise<EnergyListing>;
    updateListing(id: string, updateListingDto: UpdateListingDto, userId: string): Promise<EnergyListing>;
    cancelListing(id: string, userId: string): Promise<EnergyListing>;
    placeBid(placeBidDto: PlaceBidDto, userId: string): Promise<Bid>;
    getBidsByUser(userId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Bid>>;
    getBidsForListing(listingId: string, userId: string): Promise<Bid[]>;
    acceptBid(bidId: string, userId: string): Promise<Bid>;
    rejectBid(bidId: string, userId: string, reason?: string): Promise<Bid>;
    withdrawBid(bidId: string, userId: string): Promise<Bid>;
    executeTrade(executeTradeDto: ExecuteTradeDto, userId: string): Promise<Trade>;
    getTradeById(id: string, userId: string): Promise<Trade>;
    getTradesByUser(userId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Trade>>;
    updateTradeStatus(id: string, status: TradeStatus, userId: string, reason?: string): Promise<Trade>;
    getOrderBook(filter?: ListingFilter): Promise<{
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
    }>;
    private incrementViewCount;
    private incrementBidCount;
    private decrementBidCount;
    private rejectAllBidsForListing;
    private rejectOtherBidsForListing;
    private getValidStatusTransitions;
}
