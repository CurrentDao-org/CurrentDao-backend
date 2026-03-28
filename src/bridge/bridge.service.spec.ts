import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BridgeService } from './bridge.service';
import { BridgeTransaction } from './entities/bridge-transaction.entity';
import { BridgeValidator } from './validators/bridge.validator';
import { LiquidityManager } from './liquidity/liquidity.manager';
import { TransactionRouter } from './routers/transaction.router';
import { CreateBridgeTransactionDto } from './dto/bridge.dto';

describe('BridgeService', () => {
  let service: BridgeService;
  let repo: Repository<BridgeTransaction>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BridgeService,
        BridgeValidator,
        TransactionRouter,
        LiquidityManager,
        {
          provide: getRepositoryToken(BridgeTransaction),
          useValue: {
            create: jest.fn().mockImplementation((dto) => ({ ...dto })),
            save: jest.fn().mockImplementation(async (entity) => ({ ...entity, id: 'uuid' })),
            findOne: jest.fn().mockResolvedValue(null),
            find: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<BridgeService>(BridgeService);
    repo = module.get<Repository<BridgeTransaction>>(getRepositoryToken(BridgeTransaction));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a cross-chain transaction successfully', async () => {
    const dto: CreateBridgeTransactionDto = {
      sourceChain: 'stellar',
      targetChain: 'ethereum',
      sourceAsset: 'XLM',
      targetAsset: 'ETH',
      amount: 100,
      fromAddress: 'GABCDE12345',
      toAddress: '0xabcdef12345',
      memo: 'Test bridge',
    };

    const result = await service.createTransaction(dto);

    expect(result).toBeDefined();
    expect(result.status).toBe('confirmed');
    expect(result.estimatedFee).toBeGreaterThan(0);
    expect(repo.save).toHaveBeenCalled();
  });

  it('should reject unsupported chain', async () => {
    const dto: any = {
      sourceChain: 'unknown',
      targetChain: 'ethereum',
      sourceAsset: 'XLM',
      targetAsset: 'ETH',
      amount: 100,
      fromAddress: 'GABCDE12345',
      toAddress: '0xabcdef12345',
    };

    await expect(service.createTransaction(dto)).rejects.toThrow();
  });

  it('should return transaction list', async () => {
    const list = await service.listTransactions();
    expect(list).toEqual([]);
  });
});
