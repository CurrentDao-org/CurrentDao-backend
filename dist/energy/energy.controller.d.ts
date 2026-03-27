import { EnergyService, ListingFilter, PaginationOptions } from './energy.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { PlaceBidDto } from './dto/place-bid.dto';
import { ExecuteTradeDto } from './dto/execute-trade.dto';
import { EnergyListing } from './entities/energy-listing.entity';
import { Bid } from './entities/bid.entity';
import { Trade } from './entities/trade.entity';
export declare class EnergyController {
    private readonly energyService;
    constructor(energyService: EnergyService);
    createListing(createListingDto: CreateListingDto, req: any): Promise<EnergyListing>;
    getListings(filter: ListingFilter, pagination: PaginationOptions): Promise<import("./energy.service").PaginatedResult<EnergyListing>>;
    getListingById(id: string): Promise<EnergyListing>;
    updateListing(id: string, updateListingDto: UpdateListingDto, req: any): Promise<EnergyListing>;
    cancelListing(id: string, req: any): Promise<EnergyListing>;
    placeBid(placeBidDto: PlaceBidDto, req: any): Promise<Bid>;
    getBidsByUser(pagination: PaginationOptions, req: any): Promise<import("./energy.service").PaginatedResult<Bid>>;
    getBidsForListing(listingId: string, req: any): Promise<Bid[]>;
    acceptBid(bidId: string, req: any): Promise<Bid>;
    rejectBid(bidId: string, body: {
        reason?: string;
    }, req: any): Promise<Bid>;
    withdrawBid(bidId: string, req: any): Promise<Bid>;
    executeTrade(executeTradeDto: ExecuteTradeDto, req: any): Promise<Trade>;
    getTradeById(id: string, req: any): Promise<Trade>;
    getTradesByUser(pagination: PaginationOptions, req: any): Promise<import("./energy.service").PaginatedResult<Trade>>;
    updateTradeStatus(id: string, body: {
        status: string;
        reason?: string;
    }, req: any): Promise<Trade>;
    getOrderBook(filter: ListingFilter): Promise<{
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
    getListingAnalytics(id: string): Promise<any>;
    getDashboard(req: any): Promise<any>;
    getStatistics(): Promise<any>;
    private calculatePriceVolatility;
}
