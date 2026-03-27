export declare enum TransactionStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
    DISPUTED = "disputed",
    CANCELLED = "cancelled"
}
export declare enum TransactionType {
    IMPORT = "import",
    EXPORT = "export",
    TRANSIT = "transit"
}
export declare enum ComplianceStatus {
    COMPLIANT = "compliant",
    NON_COMPLIANT = "non_compliant",
    PENDING_REVIEW = "pending_review",
    REQUIREMENTS_MET = "requirements_met"
}
export declare class CrossBorderTransaction {
    id: string;
    transactionId: string;
    transactionType: TransactionType;
    sourceCountry: string;
    targetCountry: string;
    amount: number;
    currency: string;
    convertedAmount?: number;
    targetCurrency?: string;
    exchangeRate?: number;
    customsTariff?: number;
    regulatoryFees?: number;
    totalAmount?: number;
    status: TransactionStatus;
    complianceStatus: ComplianceStatus;
    regulatoryData: Record<string, any>;
    customsData: Record<string, any>;
    complianceChecks: Record<string, any>;
    regulatoryReportId?: string;
    customsDeclarationId?: string;
    disputeId?: string;
    notes?: string;
    failureReason?: string;
    createdAt: Date;
    updatedAt: Date;
    processedAt?: Date;
    completedAt?: Date;
}
