import { Test, TestingModule } from '@nestjs/testing';
import { GatewayAuthService } from './gateway-auth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('GatewayAuthService', () => {
  let service: GatewayAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GatewayAuthService],
    }).compile();

    service = module.get<GatewayAuthService>(GatewayAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateRequest', () => {
    it('should return true for a valid token (placeholder implementation)', async () => {
      const result = await service.validateRequest('valid-token');
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException if token is missing', async () => {
      await expect(service.validateRequest('')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('generateApiKey', () => {
    it('should generate a new API key', async () => {
      const result = await service.generateApiKey('user123');
      expect(result).toBeDefined();
      expect(result.startsWith('key_')).toBe(true);
    });
  });
});
