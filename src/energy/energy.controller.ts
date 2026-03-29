import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import {
  EnergyService,
  ListingFilter,
  PaginationOptions,
} from './energy.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { PlaceBidDto } from './dto/place-bid.dto';
import { ExecuteTradeDto } from './dto/execute-trade.dto';
import { EnergyListing } from './entities/energy-listing.entity';
import { Bid } from './entities/bid.entity';
import { Trade } from './entities/trade.entity';
import { AuthGuard } from './guards/auth.guard';

@ApiTags('energy')
@Controller('api/energy')
@UseGuards(AuthGuard)
export class EnergyController {
  constructor(private readonly energyService: EnergyService) {}

  @Post('listings')
  @ApiOperation({ summary: 'Create new energy listing' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Listing created successfully',
    type: EnergyListing,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async createListing(
    @Body() createListingDto: CreateListingDto,
    @Request() req,
  ): Promise<EnergyListing> {
    return this.energyService.createListing(createListingDto, req.user.id);
  }

  @Get('listings')
  @ApiOperation({
    summary: 'Browse energy listings with pagination and filters',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Listings retrieved successfully',
  })
  @ApiQuery({ name: 'type', required: false, enum: ['buy', 'sell'] })
  @ApiQuery({ name: 'energyType', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'minQuantity', required: false, type: Number })
  @ApiQuery({ name: 'maxQuantity', required: false, type: Number })
  @ApiQuery({ name: 'createdBy', required: false })
  @ApiQuery({ name: 'isFeatured', required: false, type: Boolean })
  @ApiQuery({ name: 'isVerified', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, example: 'createdAt' })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  async getListings(
    @Query() filter: ListingFilter,
    @Query() pagination: PaginationOptions,
  ) {
    return this.energyService.getListings(filter, pagination);
  }

  @Get('listings/:id')
  @ApiOperation({ summary: 'Get specific listing details' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Listing retrieved successfully',
    type: EnergyListing,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Listing not found',
  })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  async getListingById(@Param('id') id: string): Promise<EnergyListing> {
    return this.energyService.getListingById(id);
  }

  @Put('listings/:id')
  @ApiOperation({ summary: 'Update listing (owner only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Listing updated successfully',
    type: EnergyListing,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Listing not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to update this listing',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot update listing in current state',
  })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  async updateListing(
    @Param('id') id: string,
    @Body() updateListingDto: UpdateListingDto,
    @Request() req,
  ): Promise<EnergyListing> {
    return this.energyService.updateListing(id, updateListingDto, req.user.id);
  }

  @Delete('listings/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel listing (owner only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Listing cancelled successfully',
    type: EnergyListing,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Listing not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to cancel this listing',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot cancel listing in current state',
  })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  async cancelListing(
    @Param('id') id: string,
    @Request() req,
  ): Promise<EnergyListing> {
    return this.energyService.cancelListing(id, req.user.id);
  }

  @Post('bids')
  @ApiOperation({ summary: 'Place bid on listing' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bid placed successfully',
    type: Bid,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid bid data or listing not available',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot bid on own listing',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Listing not found',
  })
  async placeBid(
    @Body() placeBidDto: PlaceBidDto,
    @Request() req,
  ): Promise<Bid> {
    return this.energyService.placeBid(placeBidDto, req.user.id);
  }

  @Get('bids')
  @ApiOperation({ summary: "Get user's bids" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User bids retrieved successfully',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, example: 'createdAt' })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  async getBidsByUser(@Query() pagination: PaginationOptions, @Request() req) {
    return this.energyService.getBidsByUser(req.user.id, pagination);
  }

  @Get('listings/:listingId/bids')
  @ApiOperation({ summary: 'Get bids for a listing (owner only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Listing bids retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Listing not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to view bids for this listing',
  })
  @ApiParam({ name: 'listingId', description: 'Listing ID' })
  async getBidsForListing(
    @Param('listingId') listingId: string,
    @Request() req,
  ): Promise<Bid[]> {
    return this.energyService.getBidsForListing(listingId, req.user.id);
  }

  @Post('bids/:bidId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept bid (listing owner only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bid accepted successfully',
    type: Bid,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Bid not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to accept this bid',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot accept bid in current state',
  })
  @ApiParam({ name: 'bidId', description: 'Bid ID' })
  async acceptBid(@Param('bidId') bidId: string, @Request() req): Promise<Bid> {
    return this.energyService.acceptBid(bidId, req.user.id);
  }

  @Post('bids/:bidId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject bid (listing owner only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bid rejected successfully',
    type: Bid,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Bid not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to reject this bid',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot reject bid in current state',
  })
  @ApiParam({ name: 'bidId', description: 'Bid ID' })
  async rejectBid(
    @Param('bidId') bidId: string,
    @Body() body: { reason?: string },
    @Request() req,
  ): Promise<Bid> {
    return this.energyService.rejectBid(bidId, req.user.id, body.reason);
  }

  @Post('bids/:bidId/withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw bid (bid owner only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bid withdrawn successfully',
    type: Bid,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Bid not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to withdraw this bid',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot withdraw bid in current state',
  })
  @ApiParam({ name: 'bidId', description: 'Bid ID' })
  async withdrawBid(
    @Param('bidId') bidId: string,
    @Request() req,
  ): Promise<Bid> {
    return this.energyService.withdrawBid(bidId, req.user.id);
  }

  @Post('trades/execute')
  @ApiOperation({ summary: 'Execute matched trade' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Trade executed successfully',
    type: Trade,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot execute trade in current state',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to execute this trade',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Bid not found' })
  async executeTrade(
    @Body() executeTradeDto: ExecuteTradeDto,
    @Request() req,
  ): Promise<Trade> {
    return this.energyService.executeTrade(executeTradeDto, req.user.id);
  }

  @Get('trades/:id')
  @ApiOperation({ summary: 'Get trade status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trade retrieved successfully',
    type: Trade,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Trade not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to view this trade',
  })
  @ApiParam({ name: 'id', description: 'Trade ID' })
  async getTradeById(@Param('id') id: string, @Request() req): Promise<Trade> {
    return this.energyService.getTradeById(id, req.user.id);
  }

  @Get('trades')
  @ApiOperation({ summary: "Get user's trades" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User trades retrieved successfully',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, example: 'createdAt' })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  async getTradesByUser(
    @Query() pagination: PaginationOptions,
    @Request() req,
  ) {
    return this.energyService.getTradesByUser(req.user.id, pagination);
  }

  @Put('trades/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update trade status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trade status updated successfully',
    type: Trade,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Trade not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to update this trade',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid status transition',
  })
  @ApiParam({ name: 'id', description: 'Trade ID' })
  async updateTradeStatus(
    @Param('id') id: string,
    @Body() body: { status: string; reason?: string },
    @Request() req,
  ): Promise<Trade> {
    return this.energyService.updateTradeStatus(
      id,
      body.status as any,
      req.user.id,
      body.reason,
    );
  }

  @Get('orderbook')
  @ApiOperation({ summary: 'Get order book functionality' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order book retrieved successfully',
  })
  @ApiQuery({ name: 'energyType', required: false })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'minQuantity', required: false, type: Number })
  @ApiQuery({ name: 'maxQuantity', required: false, type: Number })
  @ApiQuery({ name: 'createdBy', required: false })
  @ApiQuery({ name: 'isFeatured', required: false, type: Boolean })
  @ApiQuery({ name: 'isVerified', required: false, type: Boolean })
  async getOrderBook(@Query() filter: ListingFilter) {
    return this.energyService.getOrderBook(filter);
  }

  @Get('listings/:id/analytics')
  @ApiOperation({ summary: 'Get listing analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analytics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Listing not found',
  })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  async getListingAnalytics(@Param('id') id: string): Promise<any> {
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

  @Get('dashboard')
  @ApiOperation({ summary: 'Get user dashboard data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard data retrieved successfully',
  })
  async getDashboard(@Request() req): Promise<any> {
    const userId = req.user.id;

    const [userListings, userBids, userTrades] = await Promise.all([
      this.energyService.getListings(
        { createdBy: userId },
        { page: 1, limit: 100 },
      ),
      this.energyService.getBidsByUser(userId, { page: 1, limit: 100 }),
      this.energyService.getTradesByUser(userId, { page: 1, limit: 100 }),
    ]);

    const activeListings = userListings.data.filter(
      (listing) => listing.status === 'active',
    );
    const pendingBids = userBids.data.filter((bid) => bid.status === 'pending');
    const activeTrades = userTrades.data.filter(
      (trade) =>
        trade.status === 'pending' ||
        trade.status === 'confirmed' ||
        trade.status === 'in_progress',
    );

    const totalValue = userListings.data.reduce(
      (sum, listing) => sum + listing.quantity * listing.price,
      0,
    );
    const avgListingPrice =
      userListings.data.length > 0
        ? userListings.data.reduce((sum, listing) => sum + listing.price, 0) /
          userListings.data.length
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
        listingViews: userListings.data.reduce(
          (sum, listing) => sum + listing.viewCount,
          0,
        ),
        bidSuccessRate:
          userBids.data.length > 0
            ? (userBids.data.filter((bid) => bid.status === 'accepted').length /
                userBids.data.length) *
              100
            : 0,
        tradeCompletionRate:
          userTrades.data.length > 0
            ? (userTrades.data.filter((trade) => trade.status === 'completed')
                .length /
                userTrades.data.length) *
              100
            : 0,
      },
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get platform statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics(): Promise<any> {
    const [allListings, orderBook] = await Promise.all([
      this.energyService.getListings({}, { page: 1, limit: 1000 }),
      this.energyService.getOrderBook({}),
    ]);

    const listingsByType = allListings.data.reduce(
      (acc, listing) => {
        acc[listing.type] = (acc[listing.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const listingsByEnergyType = allListings.data.reduce(
      (acc, listing) => {
        acc[listing.energyType] = (acc[listing.energyType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const avgPriceByEnergyType = allListings.data.reduce(
      (acc, listing) => {
        if (!acc[listing.energyType]) {
          acc[listing.energyType] = { total: 0, count: 0 };
        }
        acc[listing.energyType].total += listing.price;
        acc[listing.energyType].count += 1;
        return acc;
      },
      {} as Record<string, { total: number; count: number }>,
    );

    const avgPriceByType = Object.entries(avgPriceByEnergyType).reduce(
      (acc, [energyType, data]) => {
        acc[energyType] = data.total / data.count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      overview: {
        totalListings: allListings.total,
        activeListings: allListings.data.filter(
          (listing) => listing.status === 'active',
        ).length,
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
        marketDepth:
          orderBook.summary.totalBuyQuantity +
          orderBook.summary.totalSellQuantity,
      },
    };
  }

  private calculatePriceVolatility(listings: EnergyListing[]): number {
    if (listings.length < 2) return 0;

    const prices = listings.map((listing) => listing.price);
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance =
      prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) /
      prices.length;
    const standardDeviation = Math.sqrt(variance);

    return (standardDeviation / mean) * 100;
  }
}
