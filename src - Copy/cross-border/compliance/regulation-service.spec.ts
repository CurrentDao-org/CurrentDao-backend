import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RegulationService } from './regulation-service';

describe('RegulationService', () => {
  let service: RegulationService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegulationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RegulationService>(RegulationService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkCompliance', () => {
    it('should return compliant result for valid transaction', async () => {
      const result = await service.checkCompliance(
        'US',
        'DE',
        'electricity',
        100000,
        'export',
      );

      expect(result).toBeDefined();
      expect(result.overallStatus).toBeDefined();
      expect(result.checks).toBeDefined();
      expect(result.requiredDocuments).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

    it('should handle different energy types', async () => {
      const energyTypes = ['solar', 'wind', 'natural_gas', 'oil'];

      for (const energyType of energyTypes) {
        const result = await service.checkCompliance(
          'US',
          'DE',
          energyType,
          50000,
          'export',
        );

        expect(result.overallStatus).toBeDefined();
        expect(result.checks.length).toBeGreaterThan(0);
      }
    });

    it('should apply EU-specific regulations for EU transactions', async () => {
      const result = await service.checkCompliance(
        'DE',
        'FR',
        'electricity',
        75000,
        'transit',
      );

      expect(result.checks.some((check) => check.ruleCode.includes('EU'))).toBe(
        true,
      );
    });

    it('should apply US-specific regulations for US transactions', async () => {
      const result = await service.checkCompliance(
        'US',
        'CA',
        'electricity',
        100000,
        'import',
      );

      expect(
        result.checks.some((check) => check.ruleCode.includes('US_FERC')),
      ).toBe(true);
    });

    it('should handle high-value transactions appropriately', async () => {
      const result = await service.checkCompliance(
        'US',
        'DE',
        'oil',
        10000000,
        'export',
      );

      expect(result.checks.length).toBeGreaterThan(0);
      expect(result.requiredDocuments.length).toBeGreaterThan(0);
    });

    it('should include renewable energy requirements for renewable sources', async () => {
      const result = await service.checkCompliance(
        'DE',
        'FR',
        'solar',
        25000,
        'export',
      );

      expect(
        result.checks.some((check) => check.ruleCode.includes('RENEWABLE')),
      ).toBe(true);
    });
  });

  describe('getRegulationByCode', () => {
    it('should return regulation for valid code', () => {
      const regulation = service.getRegulationByCode(
        'EU_RENEWABLE_ENERGY_DIRECTIVE',
      );

      expect(regulation).toBeDefined();
      expect(regulation?.code).toBe('EU_RENEWABLE_ENERGY_DIRECTIVE');
    });

    it('should return undefined for invalid code', () => {
      const regulation = service.getRegulationByCode('INVALID_CODE');

      expect(regulation).toBeUndefined();
    });
  });

  describe('getAllRegulations', () => {
    it('should return all regulations', () => {
      const regulations = service.getAllRegulations();

      expect(regulations).toBeDefined();
      expect(regulations.length).toBeGreaterThan(0);
      expect(
        regulations.every(
          (reg) =>
            reg.code &&
            reg.name &&
            reg.description &&
            reg.applicableCountries.length > 0,
        ),
      ).toBe(true);
    });
  });

  describe('getRegulationsByCountry', () => {
    it('should return regulations for EU countries', () => {
      const regulations = service.getRegulationsByCountry('DE');

      expect(regulations.length).toBeGreaterThan(0);
      expect(
        regulations.some(
          (reg) =>
            reg.applicableCountries.includes('DE') ||
            reg.applicableCountries.includes('*'),
        ),
      ).toBe(true);
    });

    it('should return regulations for US', () => {
      const regulations = service.getRegulationsByCountry('US');

      expect(regulations.length).toBeGreaterThan(0);
      expect(
        regulations.some(
          (reg) =>
            reg.code.includes('US_FERC') ||
            reg.applicableCountries.includes('*'),
        ),
      ).toBe(true);
    });

    it('should return international regulations for any country', () => {
      const regulations = service.getRegulationsByCountry('JP');

      expect(regulations.length).toBeGreaterThan(0);
      expect(
        regulations.some((reg) => reg.applicableCountries.includes('*')),
      ).toBe(true);
    });
  });

  describe('compliance check edge cases', () => {
    it('should handle very small transactions', async () => {
      const result = await service.checkCompliance(
        'US',
        'DE',
        'electricity',
        100,
        'export',
      );

      expect(result.overallStatus).toBeDefined();
      expect(
        result.checks.some((check) =>
          check.details.includes('below minimum threshold'),
        ),
      ).toBe(true);
    });

    it('should handle nuclear energy with special requirements', async () => {
      const result = await service.checkCompliance(
        'US',
        'FR',
        'nuclear',
        500000,
        'export',
      );

      expect(result.checks.length).toBeGreaterThan(0);
      expect(result.requiredDocuments.length).toBeGreaterThan(0);
    });

    it('should handle transactions between non-EU countries', async () => {
      const result = await service.checkCompliance(
        'US',
        'CN',
        'coal',
        200000,
        'import',
      );

      expect(result.overallStatus).toBeDefined();
      expect(
        result.checks.some((check) =>
          check.ruleCode.includes('INTERNATIONAL_SANCTIONS'),
        ),
      ).toBe(true);
    });
  });

  describe('frequency-based compliance', () => {
    it('should set appropriate deadlines for daily regulations', async () => {
      const result = await service.checkCompliance(
        'US',
        'DE',
        'electricity',
        100000,
        'export',
      );

      const dailyChecks = result.checks.filter(
        (check) =>
          check.ruleCode.includes('US_FERC') ||
          check.ruleCode.includes('CROSS_BORDER_EU'),
      );

      expect(dailyChecks.length).toBeGreaterThan(0);
      expect(dailyChecks.every((check) => check.deadline)).toBe(true);
    });

    it('should set appropriate deadlines for monthly regulations', async () => {
      const result = await service.checkCompliance(
        'US',
        'DE',
        'electricity',
        100000,
        'export',
      );

      const monthlyChecks = result.checks.filter((check) =>
        check.ruleCode.includes('IEA_REPORTING'),
      );

      expect(monthlyChecks.every((check) => check.deadline)).toBe(true);
    });
  });
});
