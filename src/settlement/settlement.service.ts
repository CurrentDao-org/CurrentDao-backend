import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SettlementRequestDto,
  SettlementResponseDto,
  NettingRequestDto,
  MarginCallDto,
  SettlementStatusDto,
  SettlementStatus,
  Transaction,
  Party,
} from './dto/settlement.dto';
import { NettingEngineService } from './netting/netting-engine.service';
import { MarginManagementService } from './margin/margin-management.service';
import { ClearingHouseService } from './clearing/clearing-house.service';
import { SettlementRiskService } from './risk/settlement-risk.service';
import { BankingIntegrationService } from './integration/banking-integration.service';

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);
  private readonly settlements = new Map<string, any>();

  constructor(
    private readonly nettingEngineService: NettingEngineService,
    private readonly marginManagementService: MarginManagementService,
    private readonly clearingHouseService: ClearingHouseService,
    private readonly settlementRiskService: SettlementRiskService,
    private readonly bankingIntegrationService: BankingIntegrationService,
  ) {}

  async initiateSettlement(
    settlementRequest: SettlementRequestDto,
  ): Promise<SettlementResponseDto> {
    const startTime = Date.now();
    this.logger.log(`Initiating settlement for ${settlementRequest.parties.length} parties`);

    try {
      // Validate settlement request
      await this.validateSettlementRequest(settlementRequest);

      // Generate settlement ID
      const settlementId = this.generateSettlementId();

      // Perform risk assessment
      const riskAssessment = await this.performRiskAssessment(settlementRequest.parties);

      // Check margin requirements
      await this.checkMarginRequirements(settlementRequest);

      // Perform netting
      const nettingRequest: NettingRequestDto = {
        transactions: settlementRequest.transactions,
        nettingAlgorithm: 'multilateral',
        efficiencyThreshold: settlementRequest.nettingThreshold || 60,
      };

      const nettingResult = await this.performNetting(nettingRequest);

      // Process settlement through clearing house
      const clearingResult = await this.clearingHouseService.processSettlement(
        settlementId,
        nettingResult.nettedTransactions,
        settlementRequest.parties,
      );

      // Execute banking transfers
      const transferResults = await this.executeBankingTransfers(
        nettingResult.nettedTransactions,
        settlementRequest.parties,
      );

      const processingTime = Date.now() - startTime;

      const settlementResponse: SettlementResponseDto = {
        settlementId,
        status: SettlementStatus.COMPLETED,
        nettedTransactions: nettingResult.nettedTransactions,
        totalAmount: this.calculateTotalAmount(nettingResult.nettedTransactions),
        nettingEfficiency: nettingResult.efficiency,
        processingTimeMs: processingTime,
      };

      // Store settlement record
      this.settlements.set(settlementId, {
        ...settlementResponse,
        originalRequest: settlementRequest,
        riskAssessment,
        clearingResult,
        transferResults,
        timestamp: new Date(),
      });

      this.logger.log(`Settlement ${settlementId} completed in ${processingTime}ms`);
      return settlementResponse;

    } catch (error) {
      this.logger.error(`Settlement initiation failed: ${error.message}`);
      throw error;
    }
  }

  async performNetting(
    nettingRequest: NettingRequestDto,
  ): Promise<SettlementResponseDto> {
    this.logger.log(`Performing netting for ${nettingRequest.transactions.length} transactions`);

    try {
      const nettingResult = await this.nettingEngineService.performNetting(nettingRequest);

      return {
        settlementId: this.generateSettlementId(),
        status: SettlementStatus.COMPLETED,
        nettedTransactions: nettingResult.nettedTransactions,
        totalAmount: this.calculateTotalAmount(nettingResult.nettedTransactions),
        nettingEfficiency: nettingResult.efficiency,
      };
    } catch (error) {
      this.logger.error(`Netting failed: ${error.message}`);
      throw error;
    }
  }

  async getSettlementStatus(settlementId: string): Promise<SettlementStatusDto> {
    const settlement = this.settlements.get(settlementId);
    if (!settlement) {
      throw new Error(`Settlement ${settlementId} not found`);
    }

    return {
      settlementId,
      status: settlement.status,
      progressPercentage: this.calculateProgress(settlement),
      currentStep: settlement.currentStep,
      estimatedCompletionTime: settlement.estimatedCompletionTime,
      errors: settlement.errors,
      lastUpdated: settlement.timestamp.toISOString(),
    };
  }

  async getMonitoringData(timeRange?: string): Promise<any> {
    this.logger.log(`Retrieving monitoring data for range: ${timeRange || '24h'}`);

    const settlements = Array.from(this.settlements.values());
    const filteredSettlements = this.filterByTimeRange(settlements, timeRange);

    return {
      totalSettlements: filteredSettlements.length,
      completedSettlements: filteredSettlements.filter(s => s.status === SettlementStatus.COMPLETED).length,
      failedSettlements: filteredSettlements.filter(s => s.status === SettlementStatus.FAILED).length,
      averageProcessingTime: this.calculateAverageProcessingTime(filteredSettlements),
      nettingEfficiency: this.calculateAverageNettingEfficiency(filteredSettlements),
      volumeMetrics: this.calculateVolumeMetrics(filteredSettlements),
      riskMetrics: await this.calculateRiskMetrics(filteredSettlements),
      timestamp: new Date().toISOString(),
    };
  }

  async issueMarginCall(marginCall: MarginCallDto): Promise<any> {
    this.logger.log(`Issuing margin call for party ${marginCall.partyId}`);

    return this.marginManagementService.issueMarginCall(marginCall);
  }

  async getRiskAssessment(partyId: string): Promise<any> {
    return this.settlementRiskService.getPartyRiskAssessment(partyId);
  }

  async getSettlements(page: number, limit: number, status?: string): Promise<any> {
    const settlements = Array.from(this.settlements.values());
    
    let filteredSettlements = settlements;
    if (status) {
      filteredSettlements = settlements.filter(s => s.status === status);
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSettlements = filteredSettlements.slice(startIndex, endIndex);

    return {
      settlements: paginatedSettlements,
      pagination: {
        page,
        limit,
        total: filteredSettlements.length,
        totalPages: Math.ceil(filteredSettlements.length / limit),
      },
    };
  }

  async optimizeSettlement(optimizationRequest: any): Promise<any> {
    this.logger.log('Optimizing settlement algorithms');

    // Optimize netting algorithms
    const nettingOptimization = await this.nettingEngineService.optimizeAlgorithms(optimizationRequest);

    // Optimize risk models
    const riskOptimization = await this.settlementRiskService.optimizeRiskModels(optimizationRequest);

    // Optimize clearing processes
    const clearingOptimization = await this.clearingHouseService.optimizeProcesses(optimizationRequest);

    return {
      nettingOptimization,
      riskOptimization,
      clearingOptimization,
      timestamp: new Date().toISOString(),
    };
  }

  private async validateSettlementRequest(request: SettlementRequestDto): Promise<void> {
    if (!request.parties || request.parties.length < 2) {
      throw new Error('At least 2 parties are required for settlement');
    }

    if (!request.transactions || request.transactions.length === 0) {
      throw new Error('At least 1 transaction is required for settlement');
    }

    // Validate party balances
    for (const party of request.parties) {
      if (party.collateralBalance < 0) {
        throw new Error(`Party ${party.id} has negative collateral balance`);
      }
    }
  }

  private async performRiskAssessment(parties: Party[]): Promise<any> {
    const riskAssessments = [];
    
    for (const party of parties) {
      const assessment = await this.settlementRiskService.getPartyRiskAssessment(party.id);
      riskAssessments.push(assessment);
    }

    return riskAssessments;
  }

  private async checkMarginRequirements(request: SettlementRequestDto): Promise<void> {
    for (const party of request.parties) {
      const marginCheck = await this.marginManagementService.checkMarginRequirements(party.id);
      if (!marginCheck.sufficient) {
        throw new Error(`Insufficient margin for party ${party.id}`);
      }
    }
  }

  private async executeBankingTransfers(transactions: Transaction[], parties: Party[]): Promise<any> {
    const transferResults = [];

    for (const transaction of transactions) {
      try {
        const result = await this.bankingIntegrationService.executeTransfer(transaction, parties);
        transferResults.push(result);
      } catch (error) {
        this.logger.error(`Banking transfer failed for transaction ${transaction.id}: ${error.message}`);
        transferResults.push({ transactionId: transaction.id, status: 'FAILED', error: error.message });
      }
    }

    return transferResults;
  }

  private generateSettlementId(): string {
    return `STL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateTotalAmount(transactions: Transaction[]): number {
    return transactions.reduce((sum, tx) => sum + tx.amount, 0);
  }

  private calculateProgress(settlement: any): number {
    // Simple progress calculation based on status
    switch (settlement.status) {
      case SettlementStatus.PENDING:
        return 0;
      case SettlementStatus.PROCESSING:
        return 50;
      case SettlementStatus.COMPLETED:
        return 100;
      case SettlementStatus.FAILED:
      case SettlementStatus.CANCELLED:
        return 0;
      default:
        return 0;
    }
  }

  private filterByTimeRange(settlements: any[], timeRange?: string): any[] {
    if (!timeRange) {
      // Default to last 24 hours
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return settlements.filter(s => s.timestamp >= cutoff);
    }

    const hours = parseInt(timeRange.replace('h', ''));
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return settlements.filter(s => s.timestamp >= cutoff);
  }

  private calculateAverageProcessingTime(settlements: any[]): number {
    const completedSettlements = settlements.filter(s => s.status === SettlementStatus.COMPLETED);
    if (completedSettlements.length === 0) return 0;

    const totalTime = completedSettlements.reduce((sum, s) => sum + (s.processingTimeMs || 0), 0);
    return totalTime / completedSettlements.length;
  }

  private calculateAverageNettingEfficiency(settlements: any[]): number {
    const completedSettlements = settlements.filter(s => s.status === SettlementStatus.COMPLETED);
    if (completedSettlements.length === 0) return 0;

    const totalEfficiency = completedSettlements.reduce((sum, s) => sum + (s.nettingEfficiency || 0), 0);
    return totalEfficiency / completedSettlements.length;
  }

  private calculateVolumeMetrics(settlements: any[]): any {
    const totalVolume = settlements.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const transactionCount = settlements.reduce((sum, s) => sum + (s.nettedTransactions?.length || 0), 0);

    return {
      totalVolume,
      transactionCount,
      averageTransactionSize: transactionCount > 0 ? totalVolume / transactionCount : 0,
    };
  }

  private async calculateRiskMetrics(settlements: any[]): Promise<any> {
    // This would integrate with the risk service to calculate comprehensive risk metrics
    return {
      highRiskSettlements: 0,
      mediumRiskSettlements: 0,
      lowRiskSettlements: settlements.length,
      averageRiskScore: 25,
    };
  }
}
