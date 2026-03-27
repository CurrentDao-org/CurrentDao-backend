export declare enum AuditAction {
    CREATE = "create",
    READ = "read",
    UPDATE = "update",
    DELETE = "delete",
    EXECUTE = "execute",
    APPROVE = "approve",
    REJECT = "reject",
    CANCEL = "cancel",
    LOGIN = "login",
    LOGOUT = "logout",
    ACCESS_DENIED = "access_denied",
    SYSTEM_ERROR = "system_error",
    DATA_EXPORT = "data_export",
    CONFIG_CHANGE = "config_change",
    SECURITY_EVENT = "security_event",
    COMPLIANCE_CHECK = "compliance_check"
}
export declare enum AuditResource {
    USER = "user",
    TRADE = "trade",
    LISTING = "listing",
    BID = "bid",
    MATCH = "match",
    TRANSACTION = "transaction",
    PAYMENT = "payment",
    SETTLEMENT = "settlement",
    CONTRACT = "contract",
    SYSTEM = "system",
    AUDIT = "audit",
    REPORT = "report",
    CONFIGURATION = "configuration"
}
export declare enum AuditSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare enum AuditStatus {
    ACTIVE = "active",
    ARCHIVED = "archived",
    DELETED = "deleted"
}
export declare class AuditLog {
    id: string;
    action: AuditAction;
    resource: AuditResource;
    severity: AuditSeverity;
    status: AuditStatus;
    resourceId?: string;
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    requestMethod?: string;
    requestUrl?: string;
    requestBody?: any;
    responseBody?: any;
    responseStatus?: number;
    executionTime?: number;
    memoryUsage?: number;
    description?: string;
    metadata: {
        previousState?: any;
        newState?: any;
        changes?: Array<{
            field: string;
            oldValue: any;
            newValue: any;
        }>;
        tags?: string[];
        category?: string;
        subcategory?: string;
        compliance?: {
            regulation?: string;
            requirement?: string;
            classification?: string;
        };
        risk?: {
            level: 'low' | 'medium' | 'high' | 'critical';
            factors?: string[];
            score?: number;
        };
        privacy?: {
            dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
            redactionLevel?: number;
            consentRequired?: boolean;
        };
    };
    checksum?: string;
    signature?: string;
    signedAt?: Date;
    signedBy?: string;
    retentionUntil?: Date;
    archivedAt?: Date;
    deletedAt?: Date;
    createdBy?: string;
    updatedBy?: string;
    chainOfCustody: Array<{
        timestamp: Date;
        userId: string;
        action: string;
        previousHash?: string;
        currentHash: string;
        signature?: string;
    }>;
    verification: {
        integrityVerified: boolean;
        lastVerifiedAt?: Date;
        verificationMethod?: string;
        verificationResult?: string;
        tamperDetected?: boolean;
        tamperDetails?: string;
    };
    compliance: {
        regulations: Array<{
            name: string;
            version: string;
            requirements: string[];
            compliant: boolean;
            lastChecked: Date;
            evidence?: string;
        }>;
        classifications: Array<{
            type: string;
            category: string;
            level: string;
            description: string;
        }>;
        reports: Array<{
            reportId: string;
            reportType: string;
            generatedAt: Date;
            status: string;
        }>;
    };
    privacy: {
        dataSubjectId?: string;
        consentRecords: Array<{
            consentType: string;
            givenAt: Date;
            expiresAt?: Date;
            purpose: string;
            legalBasis: string;
        }>;
        dataProcessing: {
            purpose: string;
            legalBasis: string;
            retentionPeriod: string;
            categories: string[];
        };
        redactionRules: Array<{
            field: string;
            condition: string;
            action: string;
            applied: boolean;
        }>;
    };
    correlationId?: string;
    parentId?: string;
    batchId?: string;
    performance: {
        cpuTime?: number;
        memoryPeak?: number;
        diskIO?: number;
        networkIO?: number;
        cacheHits?: number;
        cacheMisses?: number;
    };
    security: {
        authenticationMethod?: string;
        authorizationResult?: string;
        permissionsChecked: string[];
        rolesChecked: string[];
        violations: Array<{
            type: string;
            description: string;
            severity: string;
            timestamp: Date;
        }>;
        threats: Array<{
            type: string;
            level: string;
            description: string;
            detected: boolean;
            confidence: number;
        }>;
    };
    integration: {
        sourceSystem?: string;
        sourceEventId?: string;
        sourceEventType?: string;
        processingPipeline?: string[];
        transformations?: Array<{
            type: string;
            timestamp: Date;
            details: any;
        }>;
    };
    error: {
        code?: string;
        message?: string;
        stack?: string;
        type?: string;
        severity?: string;
        recoverable?: boolean;
        retryCount?: number;
    };
    isSensitive: boolean;
    isEncrypted: boolean;
    encryptionKeyId?: string;
    compressionAlgorithm?: string;
    storageLocation?: string;
    backupLocation?: string;
    restorePoint?: string;
    createdAt: Date;
    updatedAt: Date;
    : any;
}
