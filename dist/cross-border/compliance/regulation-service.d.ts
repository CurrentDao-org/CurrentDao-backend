import { ConfigService } from '@nestjs/config';
export interface RegulationRule {
    code: string;
    name: string;
    description: string;
    applicableCountries: string[];
    requiredDocuments: string[];
    complianceChecks: string[];
    energyTypes: string[];
    minAmount?: number;
    maxAmount?: number;
    frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
}
export interface ComplianceCheck {
    ruleCode: string;
    status: 'pass' | 'fail' | 'warning';
    details: string;
    requiredAction?: string;
    deadline?: Date;
}
export interface ComplianceResult {
    overallStatus: 'compliant' | 'non_compliant' | 'pending_review';
    checks: ComplianceCheck[];
    requiredDocuments: string[];
    warnings: string[];
    nextReviewDate?: Date;
}
export declare class RegulationService {
    private configService;
    private readonly logger;
    private readonly regulations;
    constructor(configService: ConfigService);
    private initializeRegulations;
    checkCompliance(sourceCountry: string, targetCountry: string, energyType: string, amount: number, transactionType: string): Promise<ComplianceResult>;
    private getApplicableRegulations;
    private performComplianceCheck;
    private determineOverallStatus;
    private calculateNextReviewDate;
    private calculateDeadline;
    getRegulationByCode(code: string): RegulationRule | undefined;
    getAllRegulations(): RegulationRule[];
    getRegulationsByCountry(country: string): RegulationRule[];
}
