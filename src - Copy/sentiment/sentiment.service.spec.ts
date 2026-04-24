import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpModule } from '@nestjs/axios';
import { SentimentService } from './sentiment.service';
import { SentimentModule } from './sentiment.module';
import {
  SentimentDataEntity,
  NewsItemEntity,
  SocialMediaMentionEntity,
  TradingSignalEntity,
  SentimentMetricsEntity,
  SentimentHeatMapEntity,
  SentimentAlertEntity,
} from './entities/sentiment.entity';
import { CreateSentimentDto, EnergyType } from './dto/sentiment.dto';

describe('SentimentService', () => {
  let service: SentimentService;

  const repositoryMockFactory = () => ({
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockResolvedValue({}),
    find: jest.fn().mockResolvedValue([]),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    findOne: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    update: jest.fn().mockResolvedValue({}),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        SentimentService,
        {
          provide: getRepositoryToken(SentimentDataEntity),
          useFactory: repositoryMockFactory,
        },
        {
          provide: getRepositoryToken(NewsItemEntity),
          useFactory: repositoryMockFactory,
        },
        {
          provide: getRepositoryToken(SocialMediaMentionEntity),
          useFactory: repositoryMockFactory,
        },
        {
          provide: getRepositoryToken(TradingSignalEntity),
          useFactory: repositoryMockFactory,
        },
        {
          provide: getRepositoryToken(SentimentMetricsEntity),
          useFactory: repositoryMockFactory,
        },
        {
          provide: getRepositoryToken(SentimentHeatMapEntity),
          useFactory: repositoryMockFactory,
        },
        {
          provide: getRepositoryToken(SentimentAlertEntity),
          useFactory: repositoryMockFactory,
        },
      ],
    }).compile();

    service = module.get<SentimentService>(SentimentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create sentiment record and update metrics', async () => {
    const dto: CreateSentimentDto = {
      content: 'Energy sector is bullish on clean tech growth',
      score: -1,
      confidence: 0.8,
      source: 'reuters',
      energyType: EnergyType.SOLAR,
      region: 'Europe',
      keywords: ['solar', 'growth'],
    };

    const result = await service.createSentiment(dto);
    expect(result).toEqual(expect.objectContaining(dto));
  });

  it('should return sentiment data with pagination', async () => {
    const query = { energyType: EnergyType.WIND, page: 1, limit: 20 };
    const data = await service.getSentimentData(query as any);
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('limit');
    expect(data).toHaveProperty('totalPages');
  });

  it('should create and delete alert', async () => {
    const alert = await service.createAlert('user-1', {
      name: 'Test Alert',
      threshold: 10,
      condition: 'above',
      email: 'test@example.com',
      checkInterval: 15,
    });

    expect(alert).toBeDefined();
    await expect(service.deleteAlert('some-id')).resolves.toBeUndefined();
  });
});
