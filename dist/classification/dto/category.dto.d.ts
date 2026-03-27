import { EnergyType, EnergySubType } from '../entities/energy-category.entity';
export declare class CreateCategoryDto {
    energyType: EnergyType;
    name: string;
    description?: string;
    subType?: EnergySubType;
    parentId?: string;
    priceMultiplier?: number;
    isRenewable?: boolean;
    sortOrder?: number;
    tags?: string[];
    metadata?: Record<string, any>;
}
declare const UpdateCategoryDto_base: Type<Partial<T>>;
export declare class UpdateCategoryDto extends UpdateCategoryDto_base {
    isActive?: boolean;
}
export declare class CategoryFilterDto {
    energyType?: EnergyType;
    subType?: EnergySubType;
    isRenewable?: boolean;
    isActive?: boolean;
    search?: string;
    tags?: string[];
    page?: number;
    limit?: number;
}
export declare class CategoryResponseDto {
    id: string;
    energyType: EnergyType;
    name: string;
    description: string;
    subType: EnergySubType;
    parentId: string;
    priceMultiplier: number;
    isRenewable: boolean;
    isActive: boolean;
    sortOrder: number;
    tags: string[];
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
export declare class CategoryListResponseDto {
    categories: CategoryResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export declare class CategoryTreeDto {
    id: string;
    energyType: EnergyType;
    name: string;
    priceMultiplier: number;
    isRenewable: boolean;
    children: CategoryTreeDto[];
}
export declare class CalculatePriceDto {
    basePrice: number;
    energyType: EnergyType;
    qualityMultiplier?: number;
    certificationMultiplier?: number;
}
export declare class CalculatePriceResponseDto {
    basePrice: number;
    adjustedPrice: number;
    totalMultiplier: number;
    breakdown: {
        categoryMultiplier: number;
        qualityMultiplier: number;
        certificationMultiplier: number;
    };
}
export {};
