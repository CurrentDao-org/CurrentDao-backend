import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { TransactionStatus, TransactionType } from '../enums/transaction.enum';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  complianceScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  processingTime: number;
}

export interface ValidationMetrics {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  averageValidationTime: number;
  accuracyRate: number;
  complianceRate: number;
}

@Injectable()
export class TransactionValidatorService {
  private readonly logger = new Logger(TransactionValidatorService.name);
  private readonly validationMetrics: ValidationMetrics = {
    totalValidations: 0,
    successfulValidations: 0,
    failedValidations: 0,
    averageValidationTime: 0,
    accuracyRate: 0,
    complianceRate: 0,
  };

  // Validation thresholds for 99.9% accuracy
  private readonly VALIDATION_THRESHOLDS = {
    MIN_AMOUNT: 0.01,
    MAX_AMOUNT: 1000000000,
    MAX_TRANSACTION_ID_LENGTH: 100,
    MAX_FEE_PERCENTAGE: 0.1, // 10% max fee
    MAX_DAILY_VOLUME: 10000000000, // 10B daily limit
    RISK_SCORE_THRESHOLD: 0.8,
  };

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async validateTransaction(transactionData: CreateTransactionDto): Promise<ValidationResult> {
    const startTime = Date.now();
    this.logger.log(`Validating transaction: ${transactionData.transactionId}`);

    const errors: string[] = [];
    const warnings: string[] = [];
    let complianceScore = 100;

    try {
      // Basic validation
      this.validateBasicFields(transactionData, errors, warnings);
      
      // Business logic validation
      await this.validateBusinessRules(transactionData, errors, warnings, complianceScore);
      
      // Regulatory compliance validation
      await this.validateRegulatoryCompliance(transactionData, errors, warnings, complianceScore);
      
      // Risk assessment
      const riskLevel = await this.assessRiskLevel(transactionData, errors, warnings);
      
      // Performance validation for high-volume processing
      await this.validatePerformanceConstraints(transactionData, errors, warnings);

      const isValid = errors.length === 0;
      const processingTime = Date.now() - startTime;

      this.updateMetrics(processingTime, isValid, complianceScore);

      this.logger.log(
        `Transaction ${transactionData.transactionId} validation completed in ${processingTime}ms. ` +
        `Valid: ${isValid}, Risk: ${riskLevel}, Score: ${complianceScore}`
      );

      return {
        isValid,
        errors,
        warnings,
        complianceScore,
        riskLevel,
        processingTime,
      };
    } catch (error) {
      this.logger.error(`Validation failed for transaction ${transactionData.transactionId}:`, error);
      return {
        isValid: false,
        errors: [`Validation system error: ${error.message}`],
        warnings: [],
        complianceScore: 0,
        riskLevel: 'critical',
        processingTime: Date.now() - startTime,
      };
    }
  }

  private validateBasicFields(data: CreateTransactionDto, errors: string[], warnings: string[]): void {
    if (!data.transactionId || data.transactionId.trim().length === 0) {
      errors.push('Transaction ID is required');
    }

    if (data.transactionId.length > this.VALIDATION_THRESHOLDS.MAX_TRANSACTION_ID_LENGTH) {
      errors.push('Transaction ID exceeds maximum length');
    }

    if (data.amount < this.VALIDATION_THRESHOLDS.MIN_AMOUNT) {
      errors.push('Transaction amount is below minimum threshold');
    }

    if (data.amount > this.VALIDATION_THRESHOLDS.MAX_AMOUNT) {
      errors.push('Transaction amount exceeds maximum threshold');
    }

    if (!data.currency || data.currency.length !== 3) {
      errors.push('Invalid currency code format');
    }

    if (!data.sourcePublicKey || data.sourcePublicKey.length !== 56) {
      errors.push('Invalid source public key format');
    }

    if (!data.targetPublicKey || data.targetPublicKey.length !== 56) {
      errors.push('Invalid target public key format');
    }

    if (data.sourcePublicKey === data.targetPublicKey) {
      errors.push('Source and target public keys cannot be the same');
    }

    if (data.fee && data.fee > (data.amount * this.VALIDATION_THRESHOLDS.MAX_FEE_PERCENTAGE)) {
      warnings.push('Transaction fee is unusually high');
    }
  }

  private async validateBusinessRules(
    data: CreateTransactionDto,
    errors: string[],
    warnings: string[],
    complianceScore: number
  ): Promise<void> {
    // Check for duplicate transaction ID
    const existingTransaction = await this.transactionRepository.findOne({
      where: { transactionId: data.transactionId }
    });

    if (existingTransaction) {
      errors.push('Transaction ID already exists');
    }

    // Validate energy trading specific rules
    if (data.energyData) {
      if (data.energyData.quantity <= 0) {
        errors.push('Energy quantity must be positive');
      }

      if (!data.energyData.energyType) {
        errors.push('Energy type is required for energy trading transactions');
      }

      // Check if source and target locations are different
      if (data.energyData.sourceLocation === data.energyData.targetLocation) {
        warnings.push('Source and target locations are the same');
      }
    }

    // Validate cross-border transaction rules
    if (data.sourceCountry !== data.targetCountry) {
      // Additional compliance checks for international transactions
      await this.validateCrossBorderRules(data, errors, warnings, complianceScore);
    }

    // Daily volume check
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dailyVolume = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.createdAt >= :today', { today })
      .andWhere('transaction.createdAt < :tomorrow', { tomorrow })
      .getRawOne();

    if (dailyVolume && parseFloat(dailyVolume.total) + data.amount > this.VALIDATION_THRESHOLDS.MAX_DAILY_VOLUME) {
      errors.push('Daily transaction volume limit exceeded');
    }
  }

  private async validateRegulatoryCompliance(
    data: CreateTransactionDto,
    errors: string[],
    warnings: string[],
    complianceScore: number
  ): Promise<void> {
    // Sanctions screening (simplified)
    const sanctionedCountries = ['XX', 'YY', 'ZZ']; // Placeholder
    if (sanctionedCountries.includes(data.sourceCountry) || sanctionedCountries.includes(data.targetCountry)) {
      errors.push('Transaction involves sanctioned country');
      complianceScore -= 50;
    }

    // AML/KYC checks (simplified)
    const highRiskCountries = ['AA', 'BB']; // Placeholder
    if (highRiskCountries.includes(data.sourceCountry) || highRiskCountries.includes(data.targetCountry)) {
      warnings.push('Transaction involves high-risk country');
      complianceScore -= 20;
    }

    // Large transaction reporting
    if (data.amount > 10000) {
      warnings.push('Large transaction requires additional reporting');
      complianceScore -= 5;
    }

    // Energy trading compliance
    if (data.energyData) {
      // Check for renewable energy certificates if applicable
      if (data.energyData.energyType === 'renewable' && !data.notes?.includes('certificate')) {
        warnings.push('Renewable energy transaction should include certificate information');
        complianceScore -= 10;
      }
    }
  }

  private async assessRiskLevel(
    data: CreateTransactionDto,
    errors: string[],
    warnings: string[]
  ): Promise<'low' | 'medium' | 'high' | 'critical'> {
    let riskScore = 0;

    // Amount-based risk
    if (data.amount > 1000000) riskScore += 0.3;
    else if (data.amount > 100000) riskScore += 0.2;
    else if (data.amount > 10000) riskScore += 0.1;

    // Cross-border risk
    if (data.sourceCountry !== data.targetCountry) {
      riskScore += 0.2;
    }

    // New counterparty risk (simplified - would check transaction history)
    riskScore += 0.1;

    // Error-based risk
    riskScore += errors.length * 0.2;
    riskScore += warnings.length * 0.05;

    if (riskScore >= this.VALIDATION_THRESHOLDS.RISK_SCORE_THRESHOLD) {
      return 'critical';
    } else if (riskScore >= 0.6) {
      return 'high';
    } else if (riskScore >= 0.3) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private async validatePerformanceConstraints(
    data: CreateTransactionDto,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    // Ensure transaction can be processed within performance targets
    const complexityScore = this.calculateComplexityScore(data);
    
    if (complexityScore > 0.8) {
      warnings.push('High complexity transaction may affect processing time');
    }

    // Batch processing validation
    if (data.transactionType === TransactionType.SPOT && data.amount > 1000000) {
      warnings.push('Large spot transactions may require additional processing time');
    }
  }

  private calculateComplexityScore(data: CreateTransactionDto): number {
    let score = 0;

    // Base complexity by transaction type
    const typeComplexity = {
      [TransactionType.ENERGY_TRADE]: 0.3,
      [TransactionType.CROSS_BORDER]: 0.4,
      [TransactionType.DOMESTIC]: 0.1,
      [TransactionType.FUTURES]: 0.5,
      [TransactionType.SPOT]: 0.2,
      [TransactionType.OPTIONS]: 0.6,
    };

    score += typeComplexity[data.transactionType] || 0.2;

    // Cross-border adds complexity
    if (data.sourceCountry !== data.targetCountry) {
      score += 0.2;
    }

    // Energy trading adds complexity
    if (data.energyData) {
      score += 0.2;
    }

    // Large amounts add complexity
    if (data.amount > 100000) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  private updateMetrics(processingTime: number, isValid: boolean, complianceScore: number): void {
    this.validationMetrics.totalValidations++;

    if (isValid) {
      this.validationMetrics.successfulValidations++;
    } else {
      this.validationMetrics.failedValidations++;
    }

    // Update average processing time
    const totalTime = this.validationMetrics.averageValidationTime * (this.validationMetrics.totalValidations - 1) + processingTime;
    this.validationMetrics.averageValidationTime = totalTime / this.validationMetrics.totalValidations;

    // Update accuracy rate (target: 99.9%)
    this.validationMetrics.accuracyRate = (this.validationMetrics.successfulValidations / this.validationMetrics.totalValidations) * 100;

    // Update compliance rate
    if (complianceScore >= 80) {
      this.validationMetrics.complianceRate = ((this.validationMetrics.complianceRate * (this.validationMetrics.totalValidations - 1)) + 100) / this.validationMetrics.totalValidations;
    }
  }

  async getValidationMetrics(): Promise<ValidationMetrics> {
    return { ...this.validationMetrics };
  }

  async validateBatchTransactions(transactions: CreateTransactionDto[]): Promise<ValidationResult[]> {
    this.logger.log(`Validating batch of ${transactions.length} transactions`);
    
    const results = await Promise.allSettled(
      transactions.map(transaction => this.validateTransaction(transaction))
    );

    return results.map(result =>
      result.status === 'fulfilled'
        ? result.value
        : {
            isValid: false,
            errors: ['Batch validation error: ' + result.reason.message],
            warnings: [],
            complianceScore: 0,
            riskLevel: 'critical' as const,
            processingTime: 0,
          }
    );
  }
}
