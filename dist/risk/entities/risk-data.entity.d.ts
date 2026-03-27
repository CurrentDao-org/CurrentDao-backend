export declare class RiskDataEntity {
    id: string;
    portfolioId: string;
    riskType: string;
    riskLevel: number;
    varValue: number;
    varConfidence: number;
    stressTestResult: object;
    hedgingStrategy: object;
    mitigationActions: object;
    complianceStatus: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
