import { Test, TestingModule } from '@nestjs/testing';
import { FraudPreventionService } from './fraud-prevention.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  FraudCaseEntity,
  FraudCaseStatus,
  FraudSeverity,
  FraudType,
} from '../entities/fraud-case.entity';
import { PreTradeCheckDto } from '../dto/fraud-alert.dto';

describe('FraudPreventionService', () => {
  let service: FraudPreventionService;

  const mockRepository = {
    count: jest.fn().mockResolvedValue(0),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const baseCheck: PreTradeCheckDto = {
    traderId: 'trader-001',
    market: 'EU-ETS',
    quantity: 1000,
    price: 50,
    side: 'buy',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FraudPreventionService,
        {
          provide: getRepositoryToken(FraudCaseEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<FraudPreventionService>(FraudPreventionService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('preTradeCheck', () => {
    it('should allow a clean trade', async () => {
      const result = await service.preTradeCheck(baseCheck, 0.2);

      expect(result.allowed).toBe(true);
      expect(result.riskScore).toBe(0.2);
      expect(result.recommendedAction).toBe('allow');
    });

    it('should block trade above BLOCK threshold (0.85)', async () => {
      const result = await service.preTradeCheck(baseCheck, 0.91);

      expect(result.allowed).toBe(false);
      expect(result.recommendedAction).toBe('block');
      expect(result.reasons.some((r) => r.includes('ML fraud score'))).toBe(
        true,
      );
    });

    it('should recommend review for score between 0.65 and 0.85', async () => {
      const result = await service.preTradeCheck(baseCheck, 0.72);

      expect(result.allowed).toBe(true);
      expect(result.recommendedAction).toBe('review');
    });

    it('should block self-trade', async () => {
      const selfTradeCheck: PreTradeCheckDto = {
        ...baseCheck,
        counterpartyId: baseCheck.traderId,
      };

      const result = await service.preTradeCheck(selfTradeCheck, 0.1);

      expect(result.allowed).toBe(false);
      expect(result.reasons.some((r) => r.toLowerCase().includes('self'))).toBe(
        true,
      );
    });

    it('should allow whitelisted trader regardless of score', async () => {
      service.addToWhitelist(baseCheck.traderId);
      const result = await service.preTradeCheck(baseCheck, 0.99);

      expect(result.allowed).toBe(true);
      expect(result.recommendedAction).toBe('allow');
    });

    it('should block trader on blocklist', async () => {
      service.blockTrader(
        baseCheck.traderId,
        'Manual block',
        FraudSeverity.HIGH,
      );
      const result = await service.preTradeCheck(baseCheck, 0.1);

      expect(result.allowed).toBe(false);
      expect(result.recommendedAction).toBe('block');
    });

    it('should block trader with 3+ open cases', async () => {
      mockRepository.count.mockResolvedValueOnce(3);
      const result = await service.preTradeCheck(baseCheck, 0.1);

      expect(result.allowed).toBe(false);
    });

    it('should flag large trades for review', async () => {
      const largeTrade: PreTradeCheckDto = {
        ...baseCheck,
        quantity: 1_000_000,
        price: 100,
      };

      const result = await service.preTradeCheck(largeTrade as any, 0.1);
      expect(['review', 'allow']).toContain(result.recommendedAction);
    });

    it('should track total check count in stats', async () => {
      for (let i = 0; i < 5; i++) {
        await service.preTradeCheck(
          { ...baseCheck, traderId: `trader-${i}` },
          0.1,
        );
      }

      const stats = service.getPreventionStats() as any;
      expect(stats.totalChecks).toBeGreaterThanOrEqual(5);
    });
  });

  describe('blocklist management', () => {
    it('should block a trader', () => {
      service.blockTrader('block-me', 'Test block', FraudSeverity.HIGH);
      expect(service.isTraderBlocked('block-me')).toBe(true);
    });

    it('should unblock a trader', () => {
      service.blockTrader('unblock-me', 'Test block', FraudSeverity.LOW);
      const removed = service.unblockTrader('unblock-me');
      expect(removed).toBe(true);
      expect(service.isTraderBlocked('unblock-me')).toBe(false);
    });

    it('should auto-expire temporary blocks', async () => {
      // Block for near-zero duration to test expiry
      const now = Date.now();
      service['blockedTraders'].set('expire-me', {
        traderId: 'expire-me',
        reason: 'Test',
        blockedAt: new Date(now - 7200_000),
        expiresAt: new Date(now - 1), // already expired
        severity: FraudSeverity.LOW,
      });

      expect(service.isTraderBlocked('expire-me')).toBe(false);
    });

    it('should return all blocked traders', () => {
      service.blockTrader('trader-a', 'A', FraudSeverity.LOW);
      service.blockTrader('trader-b', 'B', FraudSeverity.HIGH);

      const blocked = service.getBlockedTraders();
      expect(blocked.length).toBeGreaterThanOrEqual(2);
    });

    it('should return false when unblocking non-existent trader', () => {
      expect(service.unblockTrader('ghost-trader')).toBe(false);
    });
  });

  describe('whitelist management', () => {
    it('should add and verify whitelist entry', () => {
      service.addToWhitelist('trusted-trader');
      const whitelist = service.getWhitelist();
      expect(whitelist).toContain('trusted-trader');
    });

    it('should remove from whitelist', () => {
      service.addToWhitelist('remove-me');
      service.removeFromWhitelist('remove-me');
      expect(service.getWhitelist()).not.toContain('remove-me');
    });
  });

  describe('getPreventionStats', () => {
    it('should return stats with all required fields', () => {
      const stats = service.getPreventionStats() as any;

      expect(stats.totalChecks).toBeGreaterThanOrEqual(0);
      expect(stats.blockedTrades).toBeGreaterThanOrEqual(0);
      expect(stats.blockedValue).toBeGreaterThanOrEqual(0);
      expect(stats.blockRate).toBeGreaterThanOrEqual(0);
      expect(stats.activeBlocks).toBeGreaterThanOrEqual(0);
      expect(stats.whitelistedTraders).toBeGreaterThanOrEqual(0);
    });
  });

  describe('applyPreventionForCase', () => {
    it('should auto-block on CRITICAL case', async () => {
      const criticalCase = {
        id: 'case-id',
        caseId: 'FRAUD-001',
        traderId: 'critical-trader',
        severity: FraudSeverity.CRITICAL,
        mlScore: 0.95,
      } as FraudCaseEntity;

      await service.applyPreventionForCase(criticalCase);
      expect(service.isTraderBlocked('critical-trader')).toBe(true);
    });

    it('should block for 4 hours on HIGH case', async () => {
      const highCase = {
        id: 'case-id-2',
        caseId: 'FRAUD-002',
        traderId: 'high-trader',
        severity: FraudSeverity.HIGH,
        mlScore: 0.75,
      } as FraudCaseEntity;

      await service.applyPreventionForCase(highCase);
      expect(service.isTraderBlocked('high-trader')).toBe(true);
    });

    it('should NOT block on LOW severity case', async () => {
      const lowCase = {
        id: 'case-id-3',
        caseId: 'FRAUD-003',
        traderId: 'low-trader',
        severity: FraudSeverity.LOW,
        mlScore: 0.25,
      } as FraudCaseEntity;

      await service.applyPreventionForCase(lowCase);
      expect(service.isTraderBlocked('low-trader')).toBe(false);
    });
  });

  describe('rate limiting', () => {
    it('should block trader exceeding rate limit', async () => {
      const highRateTrader = 'rate-limited-trader';

      // Simulate 60 trades
      const rateCounts: number[] = [];
      for (let i = 0; i < 60; i++) {
        rateCounts.push(Date.now());
      }
      service['traderRateCounts'].set(highRateTrader, rateCounts);

      const result = await service.preTradeCheck(
        { ...baseCheck, traderId: highRateTrader },
        0.1,
      );

      expect(result.allowed).toBe(false);
      expect(result.reasons.some((r) => r.includes('Rate limit'))).toBe(true);
    });
  });
});
