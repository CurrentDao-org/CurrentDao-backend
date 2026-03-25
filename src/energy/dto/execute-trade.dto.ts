import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, IsArray, IsObject, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TradeType } from '../entities/trade.entity';

export class DeliveryDetailsDto {
  @ApiProperty()
  @IsObject()
  deliveryAddress: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    region: string;
    country: string;
    postalCode: string;
  };

  @ApiProperty({ example: '2024-02-20T00:00:00.000Z' })
  @IsDateString()
  deliveryDate: string;

  @ApiProperty()
  @IsObject()
  deliveryWindow: {
    start: string;
    end: string;
  };

  @ApiPropertyOptional({ example: 'truck' })
  @IsOptional()
  @IsString()
  deliveryMethod?: string;

  @ApiPropertyOptional({ example: 'TRK123456789' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({ example: 'FedEx' })
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiPropertyOptional({ example: 'Deliver to loading dock at rear entrance' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;
}

export class PaymentDetailsDto {
  @ApiProperty({ example: 'bank_transfer' })
  @IsString()
  method: string;

  @ApiProperty({ example: 'USD' })
  @IsString()
  currency: string;

  @ApiProperty()
  @IsArray()
  paymentSchedule: Array<{
    dueDate: string;
    amount: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    transactionId?: string;
  }>;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  escrowReleased?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  refundAmount?: number;

  @ApiPropertyOptional({ example: 'Quality issues' })
  @IsOptional()
  @IsString()
  refundReason?: string;
}

export class ContractTermsDto {
  @ApiPropertyOptional({ example: 'contract-uuid-here' })
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiPropertyOptional({ example: 'https://example.com/contract.pdf' })
  @IsOptional()
  @IsString()
  contractUrl?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  termsAccepted: boolean;

  @ApiPropertyOptional({ example: '2024-02-15T10:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  termsAcceptedAt?: string;

  @ApiPropertyOptional({ example: '30 days notice required' })
  @IsOptional()
  @IsString()
  terminationClause?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  warrantyPeriod?: number;

  @ApiPropertyOptional({ example: 'premium' })
  @IsOptional()
  @IsString()
  supportLevel?: string;

  @ApiPropertyOptional({ example: ['late_delivery_penalty', 'quality_penalty'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  penaltyClauses?: string[];
}

export class QualityAssuranceDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  inspectionRequired?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  inspectionCompleted?: boolean;

  @ApiPropertyOptional({ example: '2024-02-18T14:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  inspectionDate?: string;

  @ApiPropertyOptional({ enum: ['pass', 'fail', 'conditional'], example: 'pass' })
  @IsOptional()
  @IsEnum(['pass', 'fail', 'conditional'])
  inspectionResult?: 'pass' | 'fail' | 'conditional';

  @ApiPropertyOptional({ example: 95 })
  @IsOptional()
  @IsNumber()
  qualityScore?: number;

  @ApiPropertyOptional({ example: ['minor_scratches'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deficiencies?: string[];

  @ApiPropertyOptional({ example: ['touch_up_paint'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  correctiveActions?: string[];
}

export class ComplianceDto {
  @ApiPropertyOptional({ example: ['ISO 9001', 'CE', 'FCC'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  regulatoryApproved?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  environmentalCompliance?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  safetyCompliance?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  complianceDocuments?: Array<{
    type: string;
    url: string;
    verified: boolean;
    verifiedAt?: string;
  }>;
}

export class MilestoneDto {
  @ApiProperty({ example: 'delivery_confirmation' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'Delivery Confirmation' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Confirm receipt of energy delivery' })
  @IsString()
  description: string;

  @ApiProperty({ example: '2024-02-20T18:00:00.000Z' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({ example: '2024-02-20T17:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  completedDate?: string;

  @ApiPropertyOptional({ enum: ['pending', 'in_progress', 'completed', 'failed'], example: 'completed' })
  @IsOptional()
  @IsEnum(['pending', 'in_progress', 'completed', 'failed'])
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';

  @ApiPropertyOptional({ example: 'delivery_team' })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({ example: ['quality_check'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];
}

export class ExecuteTradeDto {
  @ApiProperty({ example: 'bid-uuid-here' })
  @IsString()
  bidId: string;

  @ApiPropertyOptional({ enum: TradeType, example: TradeType.STANDARD })
  @IsOptional()
  @IsEnum(TradeType)
  type?: TradeType;

  @ApiPropertyOptional({ example: 0.05 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  negotiatedDiscount?: number;

  @ApiPropertyOptional({ example: 0.02 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  serviceFee?: number;

  @ApiPropertyOptional({ example: 0.08 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryDetailsDto)
  deliveryDetails?: DeliveryDetailsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentDetailsDto)
  paymentDetails?: PaymentDetailsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ContractTermsDto)
  contractTerms?: ContractTermsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => QualityAssuranceDto)
  qualityAssurance?: QualityAssuranceDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ComplianceDto)
  compliance?: ComplianceDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones?: MilestoneDto[];

  @ApiPropertyOptional({ example: 'Urgent delivery required for critical infrastructure' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: ['urgent', 'priority'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  immediateExecution?: boolean;
}
