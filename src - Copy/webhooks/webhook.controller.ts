import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
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
import { WebhookService } from './webhook.service';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhookQueryDto,
  WebhookDeliveryQueryDto,
  TriggerWebhookDto,
} from './dto/webhook.dto';
import { Webhook } from './entities/webhook.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new webhook' })
  @ApiResponse({
    status: 201,
    description: 'Webhook created successfully',
    type: Webhook,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createWebhookDto: CreateWebhookDto): Promise<Webhook> {
    return this.webhookService.create(createWebhookDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all webhooks' })
  @ApiResponse({ status: 200, description: 'Webhooks retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(@Query() query: WebhookQueryDto) {
    return this.webhookService.findAll(query.page, query.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get webhook by ID' })
  @ApiResponse({
    status: 200,
    description: 'Webhook retrieved successfully',
    type: Webhook,
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  async findOne(@Param('id') id: string): Promise<Webhook> {
    return this.webhookService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update webhook' })
  @ApiResponse({
    status: 200,
    description: 'Webhook updated successfully',
    type: Webhook,
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  async update(
    @Param('id') id: string,
    @Body() updateWebhookDto: UpdateWebhookDto,
  ): Promise<Webhook> {
    return this.webhookService.update(id, updateWebhookDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete webhook' })
  @ApiResponse({ status: 204, description: 'Webhook deleted successfully' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.webhookService.remove(id);
  }

  @Post('trigger')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger webhook event' })
  @ApiResponse({
    status: 202,
    description: 'Webhook event triggered successfully',
  })
  async trigger(@Body() triggerDto: TriggerWebhookDto): Promise<void> {
    return this.webhookService.triggerWebhook(triggerDto);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Get webhook delivery history' })
  @ApiResponse({
    status: 200,
    description: 'Delivery history retrieved successfully',
  })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getDeliveries(
    @Param('id') id: string,
    @Query() query: WebhookDeliveryQueryDto,
  ) {
    return this.webhookService.getDeliveries(query.page, query.limit, id);
  }

  @Get('stats/delivery')
  @ApiOperation({ summary: 'Get delivery statistics' })
  @ApiResponse({
    status: 200,
    description: 'Delivery statistics retrieved successfully',
  })
  @ApiQuery({
    name: 'webhookId',
    required: false,
    description: 'Optional webhook ID to filter stats',
  })
  async getDeliveryStats(@Query('webhookId') webhookId?: string) {
    return this.webhookService.getDeliveryStats(webhookId);
  }

  @Get('deliveries/all')
  @ApiOperation({ summary: 'Get all webhook deliveries' })
  @ApiResponse({
    status: 200,
    description: 'All deliveries retrieved successfully',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'webhookId',
    required: false,
    description: 'Filter by webhook ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  async getAllDeliveries(@Query() query: WebhookDeliveryQueryDto) {
    return this.webhookService.getDeliveries(
      query.page,
      query.limit,
      query.webhookId,
    );
  }
}
