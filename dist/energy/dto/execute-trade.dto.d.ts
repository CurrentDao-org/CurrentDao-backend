import { TradeType } from '../entities/trade.entity';
export declare class DeliveryDetailsDto {
    deliveryAddress: {
        latitude: number;
        longitude: number;
        address: string;
        city: string;
        region: string;
        country: string;
        postalCode: string;
    };
    deliveryDate: string;
    deliveryWindow: {
        start: string;
        end: string;
    };
    deliveryMethod?: string;
    trackingNumber?: string;
    carrier?: string;
    specialInstructions?: string;
}
export declare class PaymentDetailsDto {
    method: string;
    currency: string;
    paymentSchedule: Array<{
        dueDate: string;
        amount: number;
        status: 'pending' | 'processing' | 'completed' | 'failed';
        transactionId?: string;
    }>;
    escrowReleased?: boolean;
    refundAmount?: number;
    refundReason?: string;
}
export declare class ContractTermsDto {
    contractId?: string;
    contractUrl?: string;
    termsAccepted: boolean;
    termsAcceptedAt?: string;
    terminationClause?: string;
    warrantyPeriod?: number;
    supportLevel?: string;
    penaltyClauses?: string[];
}
export declare class QualityAssuranceDto {
    inspectionRequired?: boolean;
    inspectionCompleted?: boolean;
    inspectionDate?: string;
    inspectionResult?: 'pass' | 'fail' | 'conditional';
    qualityScore?: number;
    deficiencies?: string[];
    correctiveActions?: string[];
}
export declare class ComplianceDto {
    certifications?: string[];
    regulatoryApproved?: boolean;
    environmentalCompliance?: boolean;
    safetyCompliance?: boolean;
    complianceDocuments?: Array<{
        type: string;
        url: string;
        verified: boolean;
        verifiedAt?: string;
    }>;
}
export declare class MilestoneDto {
    id: string;
    name: string;
    description: string;
    dueDate: string;
    completedDate?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'failed';
    assignedTo?: string;
    dependencies?: string[];
}
export declare class ExecuteTradeDto {
    bidId: string;
    type?: TradeType;
    negotiatedDiscount?: number;
    serviceFee?: number;
    taxAmount?: number;
    deliveryCost?: number;
    deliveryDetails?: DeliveryDetailsDto;
    paymentDetails?: PaymentDetailsDto;
    contractTerms?: ContractTermsDto;
    qualityAssurance?: QualityAssuranceDto;
    compliance?: ComplianceDto;
    milestones?: MilestoneDto[];
    notes?: string;
    tags?: string;
    immediateExecution?: boolean;
}
