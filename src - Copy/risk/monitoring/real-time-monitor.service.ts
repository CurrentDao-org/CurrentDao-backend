import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskDataEntity } from '../entities/risk-data.entity';
import { RiskMonitoringDto } from '../dto/risk-assessment.dto';
import { Cron, Interval } from '@nestjs/schedule';

@Injectable()
export class RealTimeMonitorService {
  private readonly logger = new Logger(RealTimeMonitorService.name);
  private readonly monitoringIntervals = new Map<string, NodeJS.Timeout>();
  private readonly riskThresholds = {
    low: 1.5,
    medium: 2.5,
    high: 3.5,
    critical: 4.0,
  };

  constructor(
    @InjectRepository(RiskDataEntity)
    private readonly riskDataRepository: Repository<RiskDataEntity>,
  ) {}

  async startMonitoring(monitoringDto: RiskMonitoringDto): Promise<void> {
    const {
      portfolioId,
      varConfidence = 0.95,
      timeHorizon = 10,
      enableRealTimeAlerts = true,
    } = monitoringDto;

    this.logger.log(
      `Starting real-time monitoring for portfolio: ${portfolioId}`,
    );

    // Clear existing monitoring for this portfolio
    this.stopMonitoring(portfolioId);

    // Set up monitoring interval (every 10 seconds as per requirements)
    const interval = setInterval(async () => {
      await this.performRiskCheck(
        portfolioId,
        varConfidence,
        timeHorizon,
        enableRealTimeAlerts,
      );
    }, 10000);

    this.monitoringIntervals.set(portfolioId, interval);

    // Perform initial check
    await this.performRiskCheck(
      portfolioId,
      varConfidence,
      timeHorizon,
      enableRealTimeAlerts,
    );
  }

  async stopMonitoring(portfolioId: string): Promise<void> {
    const interval = this.monitoringIntervals.get(portfolioId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(portfolioId);
      this.logger.log(`Stopped monitoring for portfolio: ${portfolioId}`);
    }
  }

  private async performRiskCheck(
    portfolioId: string,
    varConfidence: number,
    timeHorizon: number,
    enableRealTimeAlerts: boolean,
  ): Promise<void> {
    try {
      const startTime = Date.now();

      // Get latest risk data
      const latestRiskData = await this.getLatestRiskData(portfolioId);

      if (!latestRiskData) {
        this.logger.warn(`No risk data found for portfolio: ${portfolioId}`);
        return;
      }

      // Calculate current risk metrics
      const currentRiskLevel =
        await this.calculateCurrentRiskLevel(portfolioId);
      const varValue = await this.calculateRealTimeVaR(
        portfolioId,
        varConfidence,
        timeHorizon,
      );

      // Check for risk breaches
      const riskBreach = await this.checkRiskThresholds(
        currentRiskLevel,
        latestRiskData.riskLevel,
      );

      if (riskBreach.hasBreach && enableRealTimeAlerts) {
        await this.triggerRiskAlert(portfolioId, riskBreach);
      }

      // Update risk data with latest metrics
      await this.updateRiskMetrics(portfolioId, {
        riskLevel: currentRiskLevel,
        varValue,
        varConfidence,
        lastChecked: new Date(),
      });

      const processingTime = Date.now() - startTime;
      this.logger.debug(
        `Risk check completed for ${portfolioId} in ${processingTime}ms`,
      );

      // Ensure processing time is under 200ms as per requirements
      if (processingTime > 200) {
        this.logger.warn(
          `Risk check exceeded 200ms threshold: ${processingTime}ms`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error during risk check for portfolio ${portfolioId}:`,
        error,
      );
    }
  }

  private async getLatestRiskData(
    portfolioId: string,
  ): Promise<RiskDataEntity | null> {
    return this.riskDataRepository.findOne({
      where: { portfolioId },
      order: { createdAt: 'DESC' },
    });
  }

  private async calculateCurrentRiskLevel(
    portfolioId: string,
  ): Promise<number> {
    // Simulate real-time risk calculation
    // In production, this would pull live market data and calculate actual risk
    const baseRisk = 2.0; // Medium risk baseline
    const volatility = Math.random() * 0.5 - 0.25; // Random volatility ±25%
    const marketStress = this.getMarketStressFactor();

    return Math.max(1, Math.min(4, baseRisk + volatility + marketStress));
  }

  private async calculateRealTimeVaR(
    portfolioId: string,
    confidence: number,
    timeHorizon: number,
  ): Promise<number> {
    // Simplified real-time VaR calculation
    // In production, this would use actual portfolio positions and market data
    const portfolioValue = await this.getPortfolioValue(portfolioId);
    const volatility = 0.2; // 20% annual volatility
    const timeAdjustment = Math.sqrt(timeHorizon / 252); // Trading days adjustment
    const confidenceFactor = this.getConfidenceFactor(confidence);

    return portfolioValue * volatility * timeAdjustment * confidenceFactor;
  }

  private async getPortfolioValue(portfolioId: string): Promise<number> {
    // Simulate portfolio value retrieval
    // In production, this would query actual portfolio data
    return 1000000; // $1M default portfolio value
  }

  private getConfidenceFactor(confidence: number): number {
    // Simplified confidence factor calculation
    const factors: { [key: number]: number } = {
      0.95: 1.645,
      0.96: 1.751,
      0.97: 1.881,
      0.98: 2.054,
      0.99: 2.326,
    };
    return factors[confidence] || 1.645;
  }

  private getMarketStressFactor(): number {
    // Simulate market stress factor
    // In production, this would use actual market volatility indices
    const vix = Math.random() * 50 + 10; // Simulated VIX between 10-60
    return Math.max(-0.5, (vix - 20) / 40); // Normalize to -0.5 to 0.5
  }

  private async checkRiskThresholds(
    currentRisk: number,
    previousRisk: number,
  ): Promise<{
    hasBreach: boolean;
    breachType: string;
    severity: string;
  }> {
    const riskIncrease = currentRisk - previousRisk;
    const thresholdIncrease = 0.5; // Alert on 0.5 point increase

    if (currentRisk >= this.riskThresholds.critical) {
      return {
        hasBreach: true,
        breachType: 'CRITICAL_THRESHOLD',
        severity: 'CRITICAL',
      };
    }

    if (currentRisk >= this.riskThresholds.high) {
      return {
        hasBreach: true,
        breachType: 'HIGH_THRESHOLD',
        severity: 'HIGH',
      };
    }

    if (riskIncrease >= thresholdIncrease) {
      return {
        hasBreach: true,
        breachType: 'RAPID_INCREASE',
        severity: currentRisk >= 3 ? 'HIGH' : 'MEDIUM',
      };
    }

    return {
      hasBreach: false,
      breachType: 'NONE',
      severity: 'LOW',
    };
  }

  private async triggerRiskAlert(
    portfolioId: string,
    riskBreach: any,
  ): Promise<void> {
    this.logger.warn(
      `RISK ALERT - Portfolio: ${portfolioId}, Type: ${riskBreach.breachType}, Severity: ${riskBreach.severity}`,
    );

    // In production, this would send notifications via various channels
    // Email, SMS, Slack, dashboard alerts, etc.

    const alertData = {
      portfolioId,
      alertType: riskBreach.breachType,
      severity: riskBreach.severity,
      timestamp: new Date(),
      requiresImmediateAction: riskBreach.severity === 'CRITICAL',
    };

    // Store alert for audit trail
    await this.storeRiskAlert(alertData);
  }

  private async storeRiskAlert(alertData: object): Promise<void> {
    // In production, this would store alerts in a dedicated alerts table
    this.logger.log(`Risk alert stored: ${JSON.stringify(alertData)}`);
  }

  private async updateRiskMetrics(
    portfolioId: string,
    metrics: object,
  ): Promise<void> {
    const latestRiskData = await this.riskDataRepository.findOne({
      where: { portfolioId },
      order: { createdAt: 'DESC' },
    });

    if (!latestRiskData) {
      return;
    }

    await this.riskDataRepository.update(latestRiskData.id, metrics);
  }

  // Cron job for daily risk summaries
  @Cron('0 0 * * *') // At midnight every day
  async generateDailyRiskSummary(): Promise<void> {
    this.logger.log('Generating daily risk summary');

    const activePortfolios = await this.getActivePortfolios();

    for (const portfolioId of activePortfolios) {
      await this.generatePortfolioRiskSummary(portfolioId);
    }
  }

  private async getActivePortfolios(): Promise<string[]> {
    // Get all portfolios being monitored
    return Array.from(this.monitoringIntervals.keys());
  }

  private async generatePortfolioRiskSummary(
    portfolioId: string,
  ): Promise<void> {
    // Generate daily risk summary for each portfolio
    const summary = {
      portfolioId,
      date: new Date().toISOString().split('T')[0],
      maxRiskLevel: await this.getMaxRiskLevel(portfolioId),
      averageRiskLevel: await this.getAverageRiskLevel(portfolioId),
      varBreachCount: await this.getVarBreachCount(portfolioId),
      alertsTriggered: await this.getAlertCount(portfolioId),
    };

    this.logger.log(
      `Daily risk summary for ${portfolioId}: ${JSON.stringify(summary)}`,
    );
  }

  private async getMaxRiskLevel(portfolioId: string): Promise<number> {
    // Calculate max risk level for the day
    return 2.5; // Placeholder
  }

  private async getAverageRiskLevel(portfolioId: string): Promise<number> {
    // Calculate average risk level for the day
    return 2.0; // Placeholder
  }

  private async getVarBreachCount(portfolioId: string): Promise<number> {
    // Count VaR breaches for the day
    return 0; // Placeholder
  }

  private async getAlertCount(portfolioId: string): Promise<number> {
    // Count alerts triggered for the day
    return 1; // Placeholder
  }

  // Cleanup on service destruction
  onModuleDestroy() {
    for (const [portfolioId, interval] of this.monitoringIntervals) {
      clearInterval(interval);
    }
    this.monitoringIntervals.clear();
  }
}
