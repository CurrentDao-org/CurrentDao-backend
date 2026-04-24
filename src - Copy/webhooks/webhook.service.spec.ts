import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { WebhookService } from './webhook.service';
import { Webhook } from './entities/webhook.entity';
import {
  WebhookDelivery,
  DeliveryStatus,
} from './entities/webhook-delivery.entity';
import { HmacAuthService } from './auth/hmac.auth';
import { EventFilterService } from './filters/event.filter';
import { CreateWebhookDto, TriggerWebhookDto } from './dto/webhook.dto';

describe('WebhookService', () => {
  let service: WebhookService;
  let webhookRepository: Repository<Webhook>;
  let deliveryRepository: Repository<WebhookDelivery>;
  let hmacAuthService: HmacAuthService;
  let eventFilterService: EventFilterService;

  const mockWebhookRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    increment: jest.fn(),
  };

  const mockDeliveryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };

  const mockHmacAuthService = {
    generateSignature: jest.fn(),
    verifySignature: jest.fn(),
    signWebhook: jest.fn(),
    generateTimestamp: jest.fn(() => Date.now()),
    verifyTimestamp: jest.fn(() => true),
  };

  const mockEventFilterService = {
    matchesFilters: jest.fn(),
    matchesFilter: jest.fn(),
    matchesObjectFilter: jest.fn(),
    filterByEventType: jest.fn(),
    filterByTimeRange: jest.fn(),
    filterByAmount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule, ScheduleModule.forRoot()],
      providers: [
        WebhookService,
        HmacAuthService,
        EventFilterService,
        {
          provide: getRepositoryToken(Webhook),
          useValue: mockWebhookRepository,
        },
        {
          provide: getRepositoryToken(WebhookDelivery),
          useValue: mockDeliveryRepository,
        },
      ],
    })
      .overrideProvider(HmacAuthService)
      .useValue(mockHmacAuthService)
      .overrideProvider(EventFilterService)
      .useValue(mockEventFilterService)
      .compile();

    service = module.get<WebhookService>(WebhookService);
    webhookRepository = module.get<Repository<Webhook>>(
      getRepositoryToken(Webhook),
    );
    deliveryRepository = module.get<Repository<WebhookDelivery>>(
      getRepositoryToken(WebhookDelivery),
    );
    hmacAuthService = module.get<HmacAuthService>(HmacAuthService);
    eventFilterService = module.get<EventFilterService>(EventFilterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a webhook', async () => {
      const createWebhookDto: CreateWebhookDto = {
        url: 'https://example.com/webhook',
        secret: 'test-secret',
        events: ['transaction.created'],
        active: true,
        maxRetries: 3,
        timeoutMs: 5000,
        filters: {},
      };

      const expectedWebhook = { id: '1', ...createWebhookDto };
      mockWebhookRepository.create.mockReturnValue(expectedWebhook);
      mockWebhookRepository.save.mockResolvedValue(expectedWebhook);

      const result = await service.create(createWebhookDto);

      expect(mockWebhookRepository.create).toHaveBeenCalledWith(
        createWebhookDto,
      );
      expect(mockWebhookRepository.save).toHaveBeenCalledWith(expectedWebhook);
      expect(result).toEqual(expectedWebhook);
    });
  });

  describe('triggerWebhook', () => {
    it('should trigger webhooks for matching events', async () => {
      const triggerDto: TriggerWebhookDto = {
        eventType: 'transaction.created',
        data: { amount: 100, currency: 'USD' },
        transactionId: 'tx123',
      };

      const webhooks = [
        {
          id: '1',
          url: 'https://example.com/webhook1',
          events: ['transaction.created'],
          active: true,
          filters: {},
        },
        {
          id: '2',
          url: 'https://example.com/webhook2',
          events: ['payment.completed'],
          active: true,
          filters: {},
        },
      ];

      mockWebhookRepository.find.mockResolvedValue(webhooks);
      mockEventFilterService.matchesFilters.mockReturnValue(true);
      mockDeliveryRepository.create.mockReturnValue({ id: 'delivery1' });
      mockDeliveryRepository.save.mockResolvedValue({ id: 'delivery1' });

      await service.triggerWebhook(triggerDto);

      expect(mockWebhookRepository.find).toHaveBeenCalledWith({
        where: { active: true },
      });
      expect(mockEventFilterService.matchesFilters).toHaveBeenCalledTimes(1);
      expect(mockDeliveryRepository.create).toHaveBeenCalledTimes(1);
      expect(mockDeliveryRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('getDeliveryStats', () => {
    it('should return delivery statistics', async () => {
      const mockStats = {
        total: 100,
        success: 95,
        failed: 3,
        pending: 2,
        successRate: 95,
      };

      mockDeliveryRepository.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(95)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2);

      const result = await service.getDeliveryStats();

      expect(result).toEqual(mockStats);
      expect(mockDeliveryRepository.count).toHaveBeenCalledTimes(4);
    });
  });

  describe('calculateBackoffDelay', () => {
    it('should calculate exponential backoff with jitter', async () => {
      const service = new WebhookService(
        mockWebhookRepository as any,
        mockDeliveryRepository as any,
        mockHmacAuthService,
        mockEventFilterService as unknown as EventFilterService,
        null as any,
      );

      const delay1 = (service as any).calculateBackoffDelay(1);
      const delay2 = (service as any).calculateBackoffDelay(2);
      const delay3 = (service as any).calculateBackoffDelay(3);

      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThan(2000);
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThan(3000);
      expect(delay3).toBeGreaterThanOrEqual(4000);
      expect(delay3).toBeLessThan(5000);
    });
  });
});
