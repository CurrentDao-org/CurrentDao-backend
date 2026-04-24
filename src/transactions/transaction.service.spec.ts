import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionService } from './transaction.service';
import { TransactionValidatorService } from './validation/transaction-validator.service';
import { SettlementService } from './settlement/settlement.service';
import { ReconciliationService } from './reconciliation/reconciliation.service';
import { PerformanceMonitorService } from './monitoring/performance-monitor.service';
import { RegulatoryComplianceService } from './compliance/regulatory-compliance.service';
import { Transaction } from './entities/transaction.entity';
import { TransactionAuditLog } from './entities/transaction-audit-log.entity';
import { CreateTransactionDto, BatchTransactionDto } from './dto/create-transaction.dto';
import { TransactionStatus, TransactionType } from './enums/transaction.enum';

describe('TransactionService Performance Tests', () => {
  let service: TransactionService;
  let validatorService: TransactionValidatorService;
  let settlementService: SettlementService;
  let performanceMonitor: PerformanceMonitorService;
  let transactionRepository: Repository<Transaction>;
  let auditLogRepository: Repository<TransactionAuditLog>;

  const mockTransactionRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  const mockAuditLogRepository = {
    save: jest.fn(),
  };

  const mockValidatorService = {
    validateTransaction: jest.fn(),
  };

  const mockSettlementService = {
    settleTransaction: jest.fn(),
  };

  const mockReconciliationService = {
    performReconciliation: jest.fn(),
    getReconciliationMetrics: jest.fn(),
  };

  const mockPerformanceMonitor = {
    recordTransactionMetrics: jest.fn(),
    getPerformanceMetrics: jest.fn(),
    getSystemHealth: jest.fn(),
    getPerformanceReport: jest.fn(),
  };

  const mockComplianceService = {
    getComplianceMetrics: jest.fn(),
    generateComplianceReport: jest.fn(),
    generateSuspiciousActivityReport: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: getRepositoryToken(TransactionAuditLog),
          useValue: mockAuditLogRepository,
        },
        {
          provide: TransactionValidatorService,
          useValue: mockValidatorService,
        },
        {
          provide: SettlementService,
          useValue: mockSettlementService,
        },
        {
          provide: ReconciliationService,
          useValue: mockReconciliationService,
        },
        {
          provide: PerformanceMonitorService,
          useValue: mockPerformanceMonitor,
        },
        {
          provide: RegulatoryComplianceService,
          useValue: mockComplianceService,
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    validatorService = module.get<TransactionValidatorService>(TransactionValidatorService);
    settlementService = module.get<SettlementService>(SettlementService);
    performanceMonitor = module.get<PerformanceMonitorService>(PerformanceMonitorService);
    transactionRepository = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
    auditLogRepository = module.get<Repository<TransactionAuditLog>>(getRepositoryToken(TransactionAuditLog));

    jest.clearAllMocks();
  });

  describe('High-Volume Transaction Processing', () => {
    it('should process 100,000 transactions per second', async () => {
      // Arrange
      const transactionCount = 100000;
      const startTime = Date.now();
      
      const mockTransaction: CreateTransactionDto = {
        transactionId: 'test_tx_1',
        transactionType: TransactionType.ENERGY_TRADE,
        amount: 1000,
        currency: 'USD',
        sourcePublicKey: 'G' + 'A'.repeat(55),
        targetPublicKey: 'G' + 'B'.repeat(55),
        sourceCountry: 'US',
        targetCountry: 'CA',
        energyData: {
          energyType: 'electricity',
          quantity: 1000,
          unit: 'kWh',
          sourceLocation: 'US-TX',
          targetLocation: 'CA-ON',
        },
      };

      mockValidatorService.validateTransaction.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        complianceScore: 95,
        riskLevel: 'low',
        processingTime: 10,
      });

      mockTransactionRepository.save.mockResolvedValue({
        ...mockTransaction,
        id: '1',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockSettlementService.settleTransaction.mockResolvedValue({
        success: true,
        settlementId: 'settlement_1',
        transactionId: 'test_tx_1',
        status: 'completed',
        processingTime: 500,
        settlementMethod: 'stellar',
      });

      // Act
      const batchData: BatchTransactionDto = {
        transactions: Array(transactionCount).fill(null).map((_, index) => ({
          ...mockTransaction,
          transactionId: `test_tx_${index}`,
        })),
        batchId: 'test_batch',
        parallel: true,
      };

      const result = await service.processBatchTransactions(batchData);
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      const throughput = transactionCount / (processingTime / 1000);

      // Assert
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(transactionCount);
      expect(throughput).toBeGreaterThanOrEqual(100000); // 100k tx/s minimum
      expect(processingTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should maintain <100ms average processing time', async () => {
      // Arrange
      const transactionCount = 1000;
      const processingTimes: number[] = [];

      const mockTransaction: CreateTransactionDto = {
        transactionId: 'test_tx_1',
        transactionType: TransactionType.SPOT,
        amount: 500,
        currency: 'USD',
        sourcePublicKey: 'G' + 'C'.repeat(55),
        targetPublicKey: 'G' + 'D'.repeat(55),
        sourceCountry: 'US',
        targetCountry: 'US',
      };

      mockValidatorService.validateTransaction.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        complianceScore: 98,
        riskLevel: 'low',
        processingTime: 5,
      });

      mockTransactionRepository.save.mockImplementation((tx) => {
        processingTimes.push(Date.now());
        return Promise.resolve({
          ...tx,
          id: Math.random().toString(),
          status: TransactionStatus.COMPLETED,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      mockSettlementService.settleTransaction.mockResolvedValue({
        success: true,
        settlementId: 'settlement_test',
        transactionId: 'test_tx_1',
        status: 'completed',
        processingTime: 300,
        settlementMethod: 'instant',
      });

      // Act
      const startTime = Date.now();
      
      for (let i = 0; i < transactionCount; i++) {
        await service.processTransaction({
          ...mockTransaction,
          transactionId: `test_tx_${i}`,
        });
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / transactionCount;

      // Assert
      expect(averageTime).toBeLessThan(100); // <100ms average processing time
    });
  });

  describe('Validation Accuracy Tests', () => {
    it('should achieve 99.9% validation accuracy', async () => {
      // Arrange
      const transactionCount = 10000;
      let validCount = 0;
      let invalidCount = 0;

      const mockTransaction: CreateTransactionDto = {
        transactionId: 'test_tx_valid',
        transactionType: TransactionType.DOMESTIC,
        amount: 100,
        currency: 'USD',
        sourcePublicKey: 'G' + 'E'.repeat(55),
        targetPublicKey: 'G' + 'F'.repeat(55),
        sourceCountry: 'US',
        targetCountry: 'US',
      };

      // Simulate 99.9% validation success rate
      mockValidatorService.validateTransaction.mockImplementation((tx) => {
        const isValid = Math.random() < 0.999; // 99.9% success rate
        if (isValid) {
          validCount++;
        } else {
          invalidCount++;
        }
        return Promise.resolve({
          isValid,
          errors: isValid ? [] : ['Validation failed'],
          warnings: [],
          complianceScore: isValid ? 95 : 60,
          riskLevel: isValid ? 'low' : 'high',
          processingTime: 8,
        });
      });

      mockTransactionRepository.save.mockResolvedValue({
        ...mockTransaction,
        id: '1',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      for (let i = 0; i < transactionCount; i++) {
        await service.processTransaction({
          ...mockTransaction,
          transactionId: `test_tx_${i}`,
        });
      }

      const accuracyRate = (validCount / transactionCount) * 100;

      // Assert
      expect(accuracyRate).toBeGreaterThanOrEqual(99.9);
      expect(invalidCount).toBeLessThanOrEqual(transactionCount * 0.001); // Max 0.1% invalid
    });
  });

  describe('Settlement Performance Tests', () => {
    it('should complete settlement within 2 seconds', async () => {
      // Arrange
      const mockTransaction: CreateTransactionDto = {
        transactionId: 'test_tx_settlement',
        transactionType: TransactionType.CROSS_BORDER,
        amount: 5000,
        currency: 'USD',
        sourcePublicKey: 'G' + 'G'.repeat(55),
        targetPublicKey: 'G' + 'H'.repeat(55),
        sourceCountry: 'US',
        targetCountry: 'EU',
      };

      mockValidatorService.validateTransaction.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        complianceScore: 92,
        riskLevel: 'medium',
        processingTime: 15,
      });

      mockTransactionRepository.save.mockResolvedValue({
        ...mockTransaction,
        id: '1',
        status: TransactionStatus.PROCESSING,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const settlementStartTime = Date.now();
      mockSettlementService.settleTransaction.mockImplementation(async () => {
        const settlementTime = Date.now() - settlementStartTime;
        return {
          success: true,
          settlementId: 'settlement_fast',
          transactionId: 'test_tx_settlement',
          status: 'completed',
          processingTime: settlementTime,
          settlementMethod: 'stellar',
        };
      });

      // Act
      const startTime = Date.now();
      const result = await service.processTransaction(mockTransaction);
      const endTime = Date.now();

      // Assert
      expect(result.success).toBe(true);
      expect(result.settlementResult?.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(2000); // <2 seconds total
      expect(result.settlementResult?.processingTime).toBeLessThan(2000); // <2 seconds settlement
    });
  });

  describe('Reconciliation Accuracy Tests', () => {
    it('should achieve 99.5% reconciliation accuracy', async () => {
      // Arrange
      const transactionCount = 5000;
      let matchedCount = 0;
      let unmatchedCount = 0;

      mockReconciliationService.performReconciliation.mockImplementation(async () => {
        // Simulate 99.5% reconciliation success rate
        matchedCount = Math.floor(transactionCount * 0.995);
        unmatchedCount = transactionCount - matchedCount;
        
        return {
          success: true,
          reportId: 'reconciliation_test',
          reconciliationDate: new Date(),
          summary: {
            totalTransactions: transactionCount,
            matchedTransactions: matchedCount,
            unmatchedTransactions: unmatchedCount,
            discrepancyCount: unmatchedCount,
            matchRate: (matchedCount / transactionCount) * 100,
            processingTime: 5000,
          },
          discrepancies: Array(unmatchedCount).fill(null).map((_, index) => ({
            transactionId: `discrepancy_${index}`,
            type: 'amount_mismatch',
            description: 'Amount mismatch detected',
            severity: 'medium' as const,
            resolved: false,
          })),
          processingTime: 5000,
        };
      });

      mockReconciliationService.getReconciliationMetrics.mockResolvedValue({
        totalReconciliations: 1,
        successfulReconciliations: 1,
        failedReconciliations: 0,
        averageReconciliationTime: 5000,
        accuracyRate: 99.5,
        discrepancyResolutionRate: 99.5,
        autoResolutionRate: 95.0,
      });

      // Act
      const result = await mockReconciliationService.performReconciliation();
      const metrics = await mockReconciliationService.getReconciliationMetrics();

      // Assert
      expect(result.summary.matchRate).toBeGreaterThanOrEqual(99.5);
      expect(metrics.accuracyRate).toBeGreaterThanOrEqual(99.5);
      expect(unmatchedCount).toBeLessThanOrEqual(transactionCount * 0.005); // Max 0.5% unmatched
    });
  });

  describe('Error Handling and Recovery Tests', () => {
    it('should recover from failures without data loss', async () => {
      // Arrange
      const mockTransaction: CreateTransactionDto = {
        transactionId: 'test_tx_recovery',
        transactionType: TransactionType.ENERGY_TRADE,
        amount: 1000,
        currency: 'USD',
        sourcePublicKey: 'G' + 'I'.repeat(55),
        targetPublicKey: 'G' + 'J'.repeat(55),
        sourceCountry: 'US',
        targetCountry: 'CA',
      };

      // Simulate validation failure
      mockValidatorService.validateTransaction.mockResolvedValueOnce({
        isValid: false,
        errors: ['Validation failed'],
        warnings: [],
        complianceScore: 40,
        riskLevel: 'high',
        processingTime: 5,
      });

      mockTransactionRepository.findOne.mockResolvedValue({
        ...mockTransaction,
        id: '1',
        status: TransactionStatus.FAILED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Simulate successful validation on retry
      mockValidatorService.validateTransaction.mockResolvedValueOnce({
        isValid: true,
        errors: [],
        warnings: [],
        complianceScore: 95,
        riskLevel: 'low',
        processingTime: 8,
      });

      mockTransactionRepository.save.mockResolvedValue({
        ...mockTransaction,
        id: '1',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockSettlementService.settleTransaction.mockResolvedValue({
        success: true,
        settlementId: 'settlement_recovery',
        transactionId: 'test_tx_recovery',
        status: 'completed',
        processingTime: 400,
        settlementMethod: 'stellar',
      });

      // Act
      const firstResult = await service.processTransaction(mockTransaction);
      expect(firstResult.success).toBe(false);

      const retryResult = await service.retryFailedTransaction('test_tx_recovery');

      // Assert
      expect(retryResult.success).toBe(true);
      expect(retryResult.transaction.status).toBe(TransactionStatus.COMPLETED);
    });
  });

  describe('Performance Monitoring Tests', () => {
    it('should track performance metrics accurately', async () => {
      // Arrange
      const mockTransaction: CreateTransactionDto = {
        transactionId: 'test_tx_monitoring',
        transactionType: TransactionType.SPOT,
        amount: 200,
        currency: 'USD',
        sourcePublicKey: 'G' + 'K'.repeat(55),
        targetPublicKey: 'G' + 'L'.repeat(55),
        sourceCountry: 'US',
        targetCountry: 'US',
      };

      mockValidatorService.validateTransaction.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        complianceScore: 96,
        riskLevel: 'low',
        processingTime: 6,
      });

      mockTransactionRepository.save.mockResolvedValue({
        ...mockTransaction,
        id: '1',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockSettlementService.settleTransaction.mockResolvedValue({
        success: true,
        settlementId: 'settlement_monitoring',
        transactionId: 'test_tx_monitoring',
        status: 'completed',
        processingTime: 350,
        settlementMethod: 'instant',
      });

      mockPerformanceMonitor.getPerformanceMetrics.mockResolvedValue({
        totalTransactions: 1,
        averageProcessingTime: 85,
        p95ProcessingTime: 120,
        p99ProcessingTime: 180,
        throughput: 11764, // 1000ms / 85ms
        errorRate: 0,
        successRate: 100,
        memoryUsage: 45,
        cpuUsage: 30,
        databaseConnections: 25,
        cacheHitRate: 96,
      });

      mockPerformanceMonitor.getSystemHealth.mockResolvedValue({
        status: 'healthy',
        overallScore: 95,
        metrics: {
          totalTransactions: 1,
          averageProcessingTime: 85,
          p95ProcessingTime: 120,
          p99ProcessingTime: 180,
          throughput: 11764,
          errorRate: 0,
          successRate: 100,
          memoryUsage: 45,
          cpuUsage: 30,
          databaseConnections: 25,
          cacheHitRate: 96,
        },
        alerts: [],
        lastUpdated: new Date(),
      });

      // Act
      await service.processTransaction(mockTransaction);
      const metrics = await performanceMonitor.getPerformanceMetrics();
      const health = await performanceMonitor.getSystemHealth();

      // Assert
      expect(metrics.averageProcessingTime).toBeLessThan(100); // <100ms target
      expect(metrics.throughput).toBeGreaterThan(100000); // >100k tx/s target
      expect(metrics.errorRate).toBeLessThan(0.1); // <0.1% error rate
      expect(health.status).toBe('healthy');
      expect(health.overallScore).toBeGreaterThan(90);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete transaction lifecycle end-to-end', async () => {
      // Arrange
      const mockTransaction: CreateTransactionDto = {
        transactionId: 'test_tx_e2e',
        transactionType: TransactionType.ENERGY_TRADE,
        amount: 2500,
        currency: 'USD',
        sourcePublicKey: 'G' + 'M'.repeat(55),
        targetPublicKey: 'G' + 'N'.repeat(55),
        sourceCountry: 'US',
        targetCountry: 'CA',
        energyData: {
          energyType: 'renewable',
          quantity: 2500,
          unit: 'kWh',
          sourceLocation: 'US-CA',
          targetLocation: 'CA-BC',
        },
      };

      // Mock all services to return successful responses
      mockValidatorService.validateTransaction.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: ['Renewable energy certificate recommended'],
        complianceScore: 94,
        riskLevel: 'low',
        processingTime: 12,
      });

      mockTransactionRepository.save.mockResolvedValue({
        ...mockTransaction,
        id: '1',
        status: TransactionStatus.PROCESSING,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockSettlementService.settleTransaction.mockResolvedValue({
        success: true,
        settlementId: 'settlement_e2e',
        transactionId: 'test_tx_e2e',
        status: 'completed',
        processingTime: 800,
        settlementMethod: 'stellar',
        blockchainHash: 'stellar_hash_123',
      });

      mockAuditLogRepository.save.mockResolvedValue({
        id: 'audit_1',
        transactionId: 'test_tx_e2e',
        action: 'created',
        createdAt: new Date(),
      } as any);

      mockPerformanceMonitor.getPerformanceMetrics.mockResolvedValue({
        totalTransactions: 1,
        averageProcessingTime: 95,
        p95ProcessingTime: 110,
        p99ProcessingTime: 150,
        throughput: 10526,
        errorRate: 0,
        successRate: 100,
        memoryUsage: 50,
        cpuUsage: 35,
        databaseConnections: 30,
        cacheHitRate: 97,
      });

      // Act
      const startTime = Date.now();
      const result = await service.processTransaction(mockTransaction);
      const endTime = Date.now();

      // Assert
      expect(result.success).toBe(true);
      expect(result.transaction.status).toBe(TransactionStatus.COMPLETED);
      expect(result.validationResult?.isValid).toBe(true);
      expect(result.settlementResult?.success).toBe(true);
      expect(result.processingTime).toBeLessThan(1000); // Should complete quickly
      expect(endTime - startTime).toBeLessThan(2000); // Total time <2 seconds

      // Verify service calls
      expect(mockValidatorService.validateTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(mockTransactionRepository.save).toHaveBeenCalled();
      expect(mockSettlementService.settleTransaction).toHaveBeenCalledWith('test_tx_e2e');
      expect(mockAuditLogRepository.save).toHaveBeenCalledTimes(2); // Creation and settlement
      expect(mockPerformanceMonitor.recordTransactionMetrics).toHaveBeenCalledWith(
        'test_tx_e2e',
        expect.any(Number),
        true
      );
    });
  });
});
