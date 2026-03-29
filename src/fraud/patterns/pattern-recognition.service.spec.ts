import { Test, TestingModule } from '@nestjs/testing';
import { PatternRecognitionService } from './pattern-recognition.service';
import { AnalyzeTradeDto } from '../dto/fraud-alert.dto';
import { FraudType } from '../entities/fraud-case.entity';

describe('PatternRecognitionService', () => {
  let service: PatternRecognitionService;

  const baseTrade: AnalyzeTradeDto = {
    tradeId: 'trade-001',
    traderId: 'trader-001',
    market: 'EU-ETS',
    assetType: 'carbon_credit',
    quantity: 1000,
    price: 50,
    tradeValue: 50_000,
    side: 'buy',
    orderType: 'limit',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PatternRecognitionService],
    }).compile();

    service = module.get<PatternRecognitionService>(PatternRecognitionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllPatternDefinitions', () => {
    it('should return 50+ pattern definitions', () => {
      const patterns = service.getAllPatternDefinitions() as any[];
      expect(patterns.length).toBeGreaterThanOrEqual(50);
    });

    it('should contain required fields for each pattern', () => {
      const patterns = service.getAllPatternDefinitions() as any[];
      for (const p of patterns) {
        expect(p.id).toBeDefined();
        expect(p.name).toBeDefined();
        expect(p.category).toBeDefined();
        expect(p.description).toBeDefined();
      }
    });

    it('should have patterns across all required categories', () => {
      const patterns = service.getAllPatternDefinitions() as any[];
      const categories = new Set(patterns.map((p: any) => p.category));
      expect(categories.has('wash_trading')).toBe(true);
      expect(categories.has('spoofing')).toBe(true);
      expect(categories.has('layering')).toBe(true);
      expect(categories.has('market_manipulation')).toBe(true);
    });
  });

  describe('analyzePatterns', () => {
    it('should return results for all patterns', () => {
      const results = service.analyzePatterns(baseTrade);
      expect(results.length).toBeGreaterThanOrEqual(50);
    });

    it('should sort results by confidence descending', () => {
      const results = service.analyzePatterns(baseTrade);
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].confidence).toBeGreaterThanOrEqual(results[i + 1].confidence);
      }
    });

    it('should detect self-trade (WT-001) correctly', () => {
      const selfTrade: AnalyzeTradeDto = {
        ...baseTrade,
        counterpartyId: baseTrade.traderId,
      };

      const results = service.analyzePatterns(selfTrade);
      const selfTradePattern = results.find((r) => r.patternId === 'WT-001');

      expect(selfTradePattern).toBeDefined();
      expect(selfTradePattern?.matched).toBe(true);
      expect(selfTradePattern?.confidence).toBeGreaterThan(0.9);
    });

    it('should NOT flag self-trade when counterparties differ', () => {
      const normalTrade: AnalyzeTradeDto = {
        ...baseTrade,
        counterpartyId: 'counterparty-999',
      };

      const results = service.analyzePatterns(normalTrade);
      const selfTradePattern = results.find((r) => r.patternId === 'WT-001');
      expect(selfTradePattern?.matched).toBe(false);
    });

    it('should detect spoofing on large IOC orders (SP-001)', () => {
      const spoofer: AnalyzeTradeDto = {
        ...baseTrade,
        quantity: 50_000,
        timeInForce: 'IOC',
      };

      const results = service.analyzePatterns(spoofer);
      const spoof = results.find((r) => r.patternId === 'SP-001');
      expect(spoof?.matched).toBe(true);
    });

    it('should detect carbon credit fraud pattern (EN-003)', () => {
      const carbonTrade: AnalyzeTradeDto = {
        ...baseTrade,
        assetType: 'carbon_credit',
        quantity: 50_000,
      };

      const results = service.analyzePatterns(carbonTrade);
      const carbonPattern = results.find((r) => r.patternId === 'EN-003');
      expect(carbonPattern).toBeDefined();
    });

    it('should detect threshold avoidance (RF-001)', () => {
      const structuredTrade: AnalyzeTradeDto = {
        ...baseTrade,
        tradeValue: 9500, // just below 10,000 reporting threshold
      };

      const results = service.analyzePatterns(structuredTrade);
      const structuring = results.find((r) => r.patternId === 'RF-001');
      expect(structuring?.matched).toBe(true);
    });

    it('should detect pinging pattern (AL-001)', () => {
      const pingTrade: AnalyzeTradeDto = {
        ...baseTrade,
        quantity: 5,
        timeInForce: 'IOC',
      };

      const results = service.analyzePatterns(pingTrade);
      const pinging = results.find((r) => r.patternId === 'AL-001');
      expect(pinging?.matched).toBe(true);
    });

    it('should use context for mirror order detection (WT-002)', () => {
      const oppositeTrade: AnalyzeTradeDto = {
        ...baseTrade,
        tradeId: 'opposite-001',
        traderId: baseTrade.traderId,
        side: 'sell',
      };

      const results = service.analyzePatterns(baseTrade, {
        recentTrades: [oppositeTrade],
      });

      const mirrorPattern = results.find((r) => r.patternId === 'WT-002');
      expect(mirrorPattern?.matched).toBe(true);
    });

    it('should handle empty context gracefully', () => {
      expect(() => service.analyzePatterns(baseTrade, {})).not.toThrow();
    });

    it('should handle undefined context gracefully', () => {
      expect(() => service.analyzePatterns(baseTrade)).not.toThrow();
    });
  });

  describe('getMatchedPatterns', () => {
    it('should return only matched patterns', () => {
      const selfTrade: AnalyzeTradeDto = {
        ...baseTrade,
        counterpartyId: baseTrade.traderId,
      };

      const matched = service.getMatchedPatterns(selfTrade);
      expect(matched.every((p) => p.matched)).toBe(true);
    });
  });

  describe('inferFraudTypes', () => {
    it('should infer WASH_TRADING from wash trading patterns', () => {
      const washPatterns = [
        { patternId: 'WT-001', patternName: 'Self-Trade', category: 'wash_trading', matched: true, confidence: 0.99, evidence: '' },
      ];

      const types = service.inferFraudTypes(washPatterns);
      expect(types).toContain(FraudType.WASH_TRADING);
    });

    it('should infer SPOOFING from spoofing patterns', () => {
      const spooferPatterns = [
        { patternId: 'SP-001', patternName: 'Classic Spoofing', category: 'spoofing', matched: true, confidence: 0.72, evidence: '' },
      ];

      const types = service.inferFraudTypes(spooferPatterns);
      expect(types).toContain(FraudType.SPOOFING);
    });

    it('should return empty array when no patterns matched', () => {
      const types = service.inferFraudTypes([]);
      expect(types).toHaveLength(0);
    });

    it('should deduplicate fraud types', () => {
      const patterns = [
        { patternId: 'WT-001', patternName: 'Self-Trade', category: 'wash_trading', matched: true, confidence: 0.99, evidence: '' },
        { patternId: 'WT-002', patternName: 'Mirror Order', category: 'wash_trading', matched: true, confidence: 0.85, evidence: '' },
      ];

      const types = service.inferFraudTypes(patterns);
      const uniqueWashTrading = types.filter((t) => t === FraudType.WASH_TRADING);
      expect(uniqueWashTrading).toHaveLength(1);
    });
  });

  describe('energy-specific patterns', () => {
    it('should detect capacity hoarding (EN-001)', () => {
      const capacityTrade: AnalyzeTradeDto = {
        ...baseTrade,
        assetType: 'transmission_capacity',
        quantity: 100_000,
      };

      const results = service.analyzePatterns(capacityTrade);
      const pattern = results.find((r) => r.patternId === 'EN-001');
      expect(pattern?.matched).toBe(true);
    });

    it('should detect fictitious energy injection (EN-002) on negative price', () => {
      const negativePriceTrade: AnalyzeTradeDto = {
        ...baseTrade,
        price: -5,
        quantity: 200_000,
        tradeValue: 0,
      };

      const results = service.analyzePatterns(negativePriceTrade);
      const pattern = results.find((r) => r.patternId === 'EN-002');
      expect(pattern?.matched).toBe(true);
      expect(pattern?.confidence).toBeGreaterThan(0.5);
    });
  });
});
