import { Repository } from 'typeorm';
import { RiskDataEntity } from '../entities/risk-data.entity';
import { RiskAssessmentDto, RiskLevel } from '../dto/risk-assessment.dto';
export declare class RiskAssessorService {
    private readonly riskDataRepository;
    private readonly logger;
    constructor(riskDataRepository: Repository<RiskDataEntity>);
    assessRisk(riskAssessmentDto: RiskAssessmentDto): Promise<RiskDataEntity>;
    calculateRiskLevel(riskAssessmentDto: RiskAssessmentDto): Promise<RiskLevel>;
    private calculateRiskScore;
    private calculateMarketRisk;
    private calculateCreditRisk;
    private calculateOperationalRisk;
    private calculateLiquidityRisk;
    private calculateRegulatoryRisk;
    private generateMitigationActions;
    private getImplementationTimeline;
    getRiskAssessment(portfolioId: string): Promise<RiskDataEntity[]>;
    updateRiskAssessment(id: string, updates: Partial<RiskDataEntity>): Promise<RiskDataEntity | null>;
}
