import { AuditLog } from './audit-log.entity';
export declare enum TransactionType {
    TRADE_EXECUTION = "trade_execution",
    PAYMENT_PROCESSING = "payment_processing",
    SETTLEMENT = "settlement",
    ESCROW_RELEASE = "escrow_release",
    REFUND = "refund",
    CANCELLATION = "cancellation",
    MODIFICATION = "modification",
    APPROVAL = "approval",
    REJECTION = "rejection",
    VERIFICATION = "verification",
    COMPLIANCE_CHECK = "compliance_check"
}
export declare enum TransactionStatus {
    INITIATED = "initiated",
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
    REVERSED = "reversed",
    HELD = "held",
    EXPIRED = "expired"
}
export declare enum TransactionCategory {
    ENERGY_TRADE = "energy_trade",
    FINANCIAL = "financial",
    COMPLIANCE = "compliance",
    SECURITY = "security",
    SYSTEM = "system",
    USER_MANAGEMENT = "user_management",
    DATA_MANAGEMENT = "data_management"
}
export declare enum PaymentMethod {
    BANK_TRANSFER = "bank_transfer",
    CREDIT_CARD = "credit_card",
    DEBIT_CARD = "debit_card",
    DIGITAL_WALLET = "digital_wallet",
    CRYPTOCURRENCY = "cryptocurrency",
    ESCROW = "escrow",
    WIRE_TRANSFER = "wire_transfer",
    CHECK = "check"
}
export declare enum ComplianceLevel {
    STANDARD = "standard",
    ENHANCED = "enhanced",
    STRICT = "strict",
    REGULATED = "regulated"
}
export declare class TransactionLog {
    id: string;
    type: TransactionType;
    status: TransactionStatus;
    category: TransactionCategory;
    transactionId: string;
    parentTransactionId?: string;
    rootTransactionId?: string;
    batchId?: string;
    correlationId?: string;
    sourceAccountId?: string;
    destinationAccountId?: string;
    intermediateAccounts?: string[];
    amount: number;
    originalAmount?: number;
    feeAmount?: number;
    taxAmount?: number;
    exchangeRate?: number;
    currency: string;
    originalCurrency?: string;
    paymentMethod?: PaymentMethod;
    paymentReference?: string;
    paymentGateway?: string;
    gatewayTransactionId?: string;
    gatewayResponse?: any;
    participants: {
        buyer?: {
            id: string;
            name: string;
            email?: string;
            phone?: string;
            address?: any;
            verificationStatus?: string;
        };
        seller?: {
            id: string;
            name: string;
            email?: string;
            phone?: string;
            address?: any;
            verificationStatus?: string;
        };
        intermediary?: {
            id: string;
            name: string;
            role: string;
            fees?: number;
        };
    };
    energyDetails: {
        energyType?: string;
        quantity?: number;
        unit?: string;
        deliveryLocation?: any;
        deliveryDate?: Date;
        quality?: {
            certification?: string[];
            specifications?: Record<string, any>;
        };
        carbonFootprint?: number;
        renewablePercentage?: number;
    };
    contractDetails: {
        contractId?: string;
        contractType?: string;
        terms?: string[];
        conditions?: Record<string, any>;
        expirationDate?: Date;
        autoRenewal?: boolean;
    };
    compliance: {
        level: ComplianceLevel;
        regulations: Array<{
            name: string;
            jurisdiction: string;
            requirements: string[];
            satisfied: boolean;
            evidence?: string;
        }>;
        amlCheck: {
            status: 'pending' | 'passed' | 'failed' | 'manual_review';
            score?: number;
            flags?: string[];
            reviewedBy?: string;
            reviewedAt?: Date;
        };
        kycCheck: {
            status: 'pending' | 'passed' | 'failed' | 'manual_review';
            verified?: boolean;
            documents?: Array<{
                type: string;
                status: string;
                uploadedAt: Date;
                verifiedAt?: Date;
            }>;
            reviewedBy?: string;
            reviewedAt?: Date;
        };
        sanctions: {
            screened: boolean;
            result: 'clear' | 'flagged' | 'blocked';
            matches?: Array<{
                list: string;
                confidence: number;
                details: string;
            }>;
            reviewedBy?: string;
            reviewedAt?: Date;
        };
    };
    risk: {
        score: number;
        level: 'low' | 'medium' | 'high' | 'critical';
        factors: Array<{
            type: string;
            weight: number;
            score: number;
            description: string;
        }>;
        mitigation: Array<{
            measure: string;
            implemented: boolean;
            effectiveness?: number;
        }>;
    };
    timeline: {
        initiated: Date;
        pending?: Date;
        processing?: Date;
        completed?: Date;
        failed?: Date;
        cancelled?: Date;
        reversed?: Date;
        milestones: Array<{
            name: string;
            status: string;
            timestamp: Date;
            details?: any;
        }>;
    };
    state: {
        current: string;
        previous?: string;
        transitions: Array<{
            from: string;
            to: string;
            timestamp: Date;
            reason?: string;
            userId?: string;
        }>;
        data: Record<string, any>;
    };
    metadata: {
        source?: string;
        channel?: string;
        campaign?: string;
        tags?: string[];
        attributes?: Record<string, any>;
        customFields?: Record<string, any>;
    };
    audit: {
        created: {
            by: string;
            at: Date;
            ip?: string;
            userAgent?: string;
        };
        modified?: {
            by: string;
            at: Date;
            ip?: string;
            userAgent?: string;
        };
        approvals?: Array<{
            by: string;
            at: Date;
            status: 'pending' | 'approved' | 'rejected';
            comments?: string;
        }>;
        reviews?: Array<{
            by: string;
            at: Date;
            type: string;
            result: string;
            comments?: string;
        }>;
        notifications?: Array<{
            type: string;
            recipient: string;
            sentAt: Date;
            status: string;
        }>;
    };
    security: {
        encryption: {
            algorithm?: string;
            keyId?: string;
            encryptedAt?: Date;
        };
        access: {
            read: Array<{
                userId: string;
                accessedAt: Date;
                ip?: string;
                purpose?: string;
            }>;
            write: Array<{
                userId: string;
                accessedAt: Date;
                ip?: string;
                purpose?: string;
            }>;
        };
        integrity: {
            checksum: string;
            algorithm: string;
            verified: boolean;
            verifiedAt?: Date;
        };
        tamperDetection: {
            detected: boolean;
            detectedAt?: Date;
            details?: string;
            actionTaken?: string;
        };
    };
    privacy: {
        dataSubjectId?: string;
        consent: {
            given: boolean;
            at: Date;
            purpose: string;
            legalBasis: string;
            expiresAt?: Date;
        };
        dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
        retention: {
            policy: string;
            expiresAt?: Date;
            autoDelete: boolean;
        };
        redaction: {
            fields: string[];
            applied: boolean;
            method: string;
        };
    };
    reconciliation: {
        sourceSystem?: string;
        sourceTransactionId?: string;
        matched: boolean;
        discrepancies?: Array<{
            field: string;
            expected: any;
            actual: any;
            variance: number;
        }>;
        lastReconciled?: Date;
    };
    reporting: {
        included: boolean;
        reports: Array<{
            type: string;
            period: string;
            generatedAt: Date;
            fileId?: string;
        }>;
        metrics: {
            processingTime?: number;
            cost?: number;
            revenue?: number;
            riskScore?: number;
        };
    };
    errorCode?: string;
    errorMessage?: string;
    errorDetails: {
        type: string;
        category: string;
        severity: string;
        recoverable: boolean;
        retryCount?: number;
        maxRetries?: number;
        nextRetryAt?: Date;
    };
    retryCount: number;
    maxRetries: number;
    nextRetryAt?: Date;
    createdBy: string;
    updatedBy?: string;
    approvedBy?: string;
    approvedAt?: Date;
    rejectedBy?: string;
    rejectedAt?: Date;
    completedBy?: string;
    completedAt?: Date;
    expiresAt?: Date;
    retentionUntil?: Date;
    archivedAt?: Date;
    deletedAt?: Date;
    isReversible: boolean;
    isReversibleUntil?: Date;
    reversedBy?: string;
    reversedAt?: Date;
    reversalReason?: string;
    externalReference?: string;
    internalReference?: string;
    blockchainTxHash?: string;
    blockchainBlockNumber?: number;
    blockchainConfirmations?: number;
    blockchain: {
        contractAddress?: string;
        functionCalled?: string;
        gasUsed?: number;
        gasPrice?: number;
        eventLogs?: Array<{
            event: string;
            address: string;
            topics: string[];
            data: string;
            blockNumber: number;
            transactionHash: string;
            logIndex: number;
        }>;
    };
    createdAt: Date;
    updatedAt: Date;
    auditLog?: AuditLog;
    : any;
}
