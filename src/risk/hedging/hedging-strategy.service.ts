import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskDataEntity } from '../entities/risk-data.entity';
import { HedgingStrategyDto } from '../dto/risk-assessment.dto';

@Injectable()
export class HedgingStrategyService {
  private readonly logger = new Logger(HedgingStrategyService.name);

  constructor(
    @InjectRepository(RiskDataEntity)
    private readonly riskDataRepository: Repository<RiskDataEntity>,
  ) {}

  async createHedgingStrategy(hedgingDto: HedgingStrategyDto): Promise<object> {
    this.logger.log(`Creating hedging strategy for portfolio: ${hedgingDto.portfolioId}`);

    const strategy = await this.generateOptimalHedgingStrategy(hedgingDto);
    const effectiveness = await this.calculateHedgingEffectiveness(hedgingDto, strategy);
    const cost = await this.calculateHedgingCost(strategy);

    const hedgingStrategy = {
      portfolioId: hedgingDto.portfolioId,
      strategy,
      effectiveness,
      cost,
      riskReduction: effectiveness * 0.3, // Target 30% risk reduction as per requirements
      implementation: await this.generateImplementationPlan(strategy),
      monitoring: await this.generateMonitoringPlan(strategy),
    };

    // Update risk data with hedging strategy
    await this.updateRiskDataWithHedgingStrategy(hedgingDto.portfolioId, hedgingStrategy);

    this.logger.log(`Hedging strategy created for portfolio: ${hedgingDto.portfolioId}, Expected risk reduction: ${hedgingStrategy.riskReduction * 100}%`);

    return hedgingStrategy;
  }

  private async generateOptimalHedgingStrategy(hedgingDto: HedgingStrategyDto): Promise<object> {
    const { portfolioId, hedgeRatio, instrument, maturity, customParameters } = hedgingDto;

    // Determine optimal hedging instruments based on portfolio characteristics
    const portfolioProfile = await this.getPortfolioProfile(portfolioId);
    
    const strategy = {
      primaryInstrument: instrument || this.selectOptimalInstrument(portfolioProfile),
      hedgeRatio: hedgeRatio || this.calculateOptimalHedgeRatio(portfolioProfile),
      maturity: maturity || this.selectOptimalMaturity(portfolioProfile),
      secondaryInstruments: await this.selectSecondaryInstruments(portfolioProfile),
      dynamicAdjustment: true,
      rebalancingFrequency: this.calculateRebalancingFrequency(portfolioProfile),
      customParameters: customParameters || {},
    };

    return strategy;
  }

  private async getPortfolioProfile(portfolioId: string): Promise<object> {
    // Get portfolio characteristics for optimal hedging
    return {
      size: 1000000, // $1M default
      duration: 5, // years
      convexity: 0.1,
      volatility: 0.2,
      liquidity: 'high',
      currencyExposure: ['USD', 'EUR'],
      commodityExposure: ['oil', 'gas'],
    };
  }

  private selectOptimalInstrument(portfolioProfile: object): string {
    // Select optimal hedging instrument based on portfolio profile
    const volatility = portfolioProfile['volatility'];
    const liquidity = portfolioProfile['liquidity'];
    
    if (volatility > 0.25) {
      return 'options'; // High volatility - use options for downside protection
    } else if (liquidity === 'high') {
      return 'futures'; // High liquidity - use futures for cost efficiency
    } else {
      return 'forwards'; // Lower liquidity - use forwards for customization
    }
  }

  private calculateOptimalHedgeRatio(portfolioProfile: object): number {
    // Calculate optimal hedge ratio (0-1)
    const volatility = portfolioProfile['volatility'];
    const size = portfolioProfile['size'];
    
    // Higher volatility and larger size warrant higher hedge ratios
    const baseRatio = 0.5;
    const volatilityAdjustment = Math.min(volatility * 2, 0.3);
    const sizeAdjustment = Math.min(Math.log(size / 1000000) / 10, 0.2);
    
    return Math.min(0.95, baseRatio + volatilityAdjustment + sizeAdjustment);
  }

  private selectOptimalMaturity(portfolioProfile: object): number {
    // Select optimal maturity in days
    const duration = portfolioProfile['duration'];
    
    // Match hedge maturity to portfolio duration
    return Math.max(30, Math.min(365, duration * 30));
  }

  private async selectSecondaryInstruments(portfolioProfile: object): Promise<string[]> {
    // Select additional hedging instruments for diversification
    const instruments = [];
    
    if (portfolioProfile['currencyExposure'].length > 1) {
      instruments.push('currency forwards');
    }
    
    if (portfolioProfile['commodityExposure'].includes('oil')) {
      instruments.push('commodity swaps');
    }
    
    if (portfolioProfile['volatility'] > 0.3) {
      instruments.push('volatility swaps');
    }
    
    return instruments;
  }

  private calculateRebalancingFrequency(portfolioProfile: object): string {
    // Calculate how often to rebalance the hedge
    const volatility = portfolioProfile['volatility'];
    
    if (volatility > 0.3) return 'daily';
    if (volatility > 0.2) return 'weekly';
    return 'monthly';
  }

  private async calculateHedgingEffectiveness(hedgingDto: HedgingStrategyDto, strategy: object): Promise<number> {
    // Calculate expected hedging effectiveness (0-1)
    const baseEffectiveness = 0.7; // 70% base effectiveness
    const instrumentBonus = this.getInstrumentEffectivenessBonus(strategy['primaryInstrument']);
    const maturityBonus = this.getMaturityEffectivenessBonus(strategy['maturity']);
    const diversificationBonus = Math.min(strategy['secondaryInstruments'].length * 0.05, 0.15);
    
    const totalEffectiveness = baseEffectiveness + instrumentBonus + maturityBonus + diversificationBonus;
    
    return Math.min(0.95, totalEffectiveness); // Cap at 95%
  }

  private getInstrumentEffectivenessBonus(instrument: string): number {
    const bonuses = {
      'futures': 0.1,
      'options': 0.15,
      'forwards': 0.12,
      'swaps': 0.08,
    };
    return bonuses[instrument] || 0.05;
  }

  private getMaturityEffectivenessBonus(maturity: number): number {
    // Optimal maturity around 90-180 days gets bonus
    if (maturity >= 90 && maturity <= 180) return 0.05;
    if (maturity >= 30 && maturity <= 365) return 0.02;
    return 0;
  }

  private async calculateHedgingCost(strategy: object): Promise<object> {
    // Calculate hedging costs
    const transactionCosts = this.calculateTransactionCosts(strategy);
    const ongoingCosts = this.calculateOngoingCosts(strategy);
    const opportunityCost = this.calculateOpportunityCost(strategy);
    
    return {
      transactionCosts,
      ongoingCosts,
      opportunityCost,
      totalCost: transactionCosts + ongoingCosts + opportunityCost,
      costAsPercentage: (transactionCosts + ongoingCosts + opportunityCost) / 1000000 * 100, // Assuming $1M portfolio
    };
  }

  private calculateTransactionCosts(strategy: object): number {
    const instrument = strategy['primaryInstrument'];
    const hedgeRatio = strategy['hedgeRatio'];
    
    const baseCosts = {
      'futures': 0.001, // 0.1%
      'options': 0.02, // 2%
      'forwards': 0.002, // 0.2%
      'swaps': 0.005, // 0.5%
    };
    
    return (baseCosts[instrument] || 0.005) * hedgeRatio * 1000000; // Assuming $1M portfolio
  }

  private calculateOngoingCosts(strategy: object): number {
    const rebalancingFrequency = strategy['rebalancingFrequency'];
    const instrument = strategy['primaryInstrument'];
    
    const frequencyMultiplier = {
      'daily': 252,
      'weekly': 52,
      'monthly': 12,
    };
    
    const perRebalancingCost = {
      'futures': 10,
      'options': 50,
      'forwards': 25,
      'swaps': 100,
    };
    
    return frequencyMultiplier[rebalancingFrequency] * (perRebalancingCost[instrument] || 25);
  }

  private calculateOpportunityCost(strategy: object): number {
    // Opportunity cost of capital tied up in hedging
    const hedgeRatio = strategy['hedgeRatio'];
    const portfolioValue = 1000000; // Assuming $1M portfolio
    const riskFreeRate = 0.03; // 3% risk-free rate
    
    return portfolioValue * hedgeRatio * riskFreeRate;
  }

  private async generateImplementationPlan(strategy: object): Promise<object> {
    return {
      phases: [
        {
          phase: 'Setup',
          duration: '1-2 days',
          tasks: [
            'Open trading accounts',
            'Set up risk management systems',
            'Configure monitoring alerts',
          ],
        },
        {
          phase: 'Initial Hedge',
          duration: '1 day',
          tasks: [
            'Execute primary hedge transactions',
            'Set up secondary hedges',
            'Confirm hedge ratios',
          ],
        },
        {
          phase: 'Monitoring',
          duration: 'Ongoing',
          tasks: [
            'Daily hedge effectiveness monitoring',
            'Weekly performance review',
            'Monthly strategy adjustment',
          ],
        },
      ],
      resources: [
        'Risk management team',
        'Trading desk',
        'Compliance officer',
        'Technology support',
      ],
      risks: [
        'Counterparty risk',
        'Liquidity risk',
        'Model risk',
        'Operational risk',
      ],
    };
  }

  private async generateMonitoringPlan(strategy: object): Promise<object> {
    return {
      frequency: strategy['rebalancingFrequency'],
      metrics: [
        'Hedge effectiveness',
        'Cost tracking',
        'Risk reduction',
        'Counterparty exposure',
        'Liquidity metrics',
      ],
      alerts: [
        'Hedge effectiveness below 60%',
        'Cost increase over 20%',
        'Counterparty rating downgrade',
        'Liquidity deterioration',
      ],
      reporting: {
        daily: ['Hedge effectiveness', 'P&L impact'],
        weekly: ['Cost analysis', 'Risk metrics'],
        monthly: ['Strategy review', 'Performance attribution'],
      },
    };
  }

  private async updateRiskDataWithHedgingStrategy(portfolioId: string, hedgingStrategy: object): Promise<void> {
    await this.riskDataRepository.update(
      { 
        portfolioId, 
        createdAt: () => 'SELECT MAX(created_at) FROM risk_data WHERE portfolioId = :portfolioId' 
      },
      { hedgingStrategy }
    );
  }

  async evaluateHedgingPerformance(portfolioId: string): Promise<object> {
    this.logger.log(`Evaluating hedging performance for portfolio: ${portfolioId}`);

    const riskData = await this.riskDataRepository.findOne({
      where: { portfolioId },
      order: { createdAt: 'DESC' },
    });

    if (!riskData || !riskData.hedgingStrategy) {
      throw new Error('No hedging strategy found for portfolio');
    }

    const actualEffectiveness = await this.calculateActualEffectiveness(portfolioId);
    const expectedEffectiveness = riskData.hedgingStrategy['effectiveness'];
    const performanceRatio = actualEffectiveness / expectedEffectiveness;

    return {
      portfolioId,
      actualEffectiveness,
      expectedEffectiveness,
      performanceRatio,
      recommendation: this.getPerformanceRecommendation(performanceRatio),
      lastUpdated: new Date(),
    };
  }

  private async calculateActualEffectiveness(portfolioId: string): Promise<number> {
    // Calculate actual hedging effectiveness based on historical performance
    // In production, this would analyze actual P&L data
    return 0.75; // Placeholder: 75% actual effectiveness
  }

  private getPerformanceRecommendation(performanceRatio: number): string {
    if (performanceRatio >= 0.9) return 'Continue current strategy';
    if (performanceRatio >= 0.7) return 'Minor adjustments recommended';
    if (performanceRatio >= 0.5) return 'Strategy revision required';
    return 'Immediate strategy change needed';
  }

  async adjustHedgingStrategy(portfolioId: string, adjustments: object): Promise<object> {
    this.logger.log(`Adjusting hedging strategy for portfolio: ${portfolioId}`);

    const currentStrategy = await this.getCurrentHedgingStrategy(portfolioId);
    const adjustedStrategy = await this.applyAdjustments(currentStrategy, adjustments);
    
    await this.updateRiskDataWithHedgingStrategy(portfolioId, adjustedStrategy);

    return {
      portfolioId,
      previousStrategy: currentStrategy,
      adjustedStrategy,
      adjustments,
      timestamp: new Date(),
    };
  }

  private async getCurrentHedgingStrategy(portfolioId: string): Promise<object> {
    const riskData = await this.riskDataRepository.findOne({
      where: { portfolioId },
      order: { createdAt: 'DESC' },
    });

    return riskData?.hedgingStrategy || {};
  }

  private async applyAdjustments(currentStrategy: object, adjustments: object): Promise<object> {
    return {
      ...currentStrategy,
      ...adjustments,
      lastAdjusted: new Date(),
      adjustmentHistory: [
        ...(currentStrategy['adjustmentHistory'] || []),
        {
          timestamp: new Date(),
          adjustments,
        },
      ],
    };
  }
}
