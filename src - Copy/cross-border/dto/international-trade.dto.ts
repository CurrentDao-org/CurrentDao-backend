import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TransactionType,
  ComplianceStatus,
} from '../entities/cross-border-transaction.entity';

export class CurrencyConversionDto {
  @IsString()
  @IsOptional()
  sourceCurrency: string;

  @IsString()
  @IsOptional()
  targetCurrency: string;

  @IsNumber()
  @IsOptional()
  amount: number;

  @IsNumber()
  @IsOptional()
  exchangeRate: number;
}

export class RegulatoryComplianceDto {
  @IsString()
  @IsOptional()
  regulationCode: string;

  @IsString()
  @IsOptional()
  complianceLevel: string;

  @IsArray()
  @IsOptional()
  requiredDocuments: string[];

  @IsArray()
  @IsOptional()
  complianceChecks: string[];
}

export class CustomsTariffDto {
  @IsString()
  @IsOptional()
  hsCode: string;

  @IsString()
  @IsOptional()
  productCategory: string;

  @IsNumber()
  @IsOptional()
  tariffRate: number;

  @IsNumber()
  @IsOptional()
  customsValue: number;

  @IsArray()
  @IsOptional()
  applicableTaxes: string[];
}

export class CreateInternationalTradeDto {
  @IsString()
  transactionId: string;

  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @IsString()
  sourceCountry: string;

  @IsString()
  targetCountry: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CurrencyConversionDto)
  currencyConversion?: CurrencyConversionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => RegulatoryComplianceDto)
  regulatoryCompliance?: RegulatoryComplianceDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomsTariffDto)
  customsTariff?: CustomsTariffDto;

  @IsString()
  @IsOptional()
  energyType?: string;

  @IsNumber()
  @IsOptional()
  energyQuantity?: number;

  @IsString()
  @IsOptional()
  energyUnit?: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  buyerId?: string;

  @IsString()
  @IsOptional()
  contractId?: string;

  @IsDateString()
  @IsOptional()
  transactionDate?: string;

  @IsDateString()
  @IsOptional()
  deliveryDate?: string;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @IsString()
  @IsOptional()
  incoterms?: string;

  @IsArray()
  @IsOptional()
  documents?: string[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateInternationalTradeDto {
  @IsEnum(TransactionType)
  @IsOptional()
  transactionType?: TransactionType;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CurrencyConversionDto)
  currencyConversion?: CurrencyConversionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => RegulatoryComplianceDto)
  regulatoryCompliance?: RegulatoryComplianceDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomsTariffDto)
  customsTariff?: CustomsTariffDto;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class FilterInternationalTradeDto {
  @IsString()
  @IsOptional()
  sourceCountry?: string;

  @IsString()
  @IsOptional()
  targetCountry?: string;

  @IsEnum(TransactionType)
  @IsOptional()
  transactionType?: TransactionType;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsEnum(ComplianceStatus)
  @IsOptional()
  complianceStatus?: ComplianceStatus;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  minAmount?: number;

  @IsNumber()
  @IsOptional()
  maxAmount?: number;

  @IsString()
  @IsOptional()
  energyType?: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  buyerId?: string;
}
