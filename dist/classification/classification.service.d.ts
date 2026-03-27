import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EnergyCategory, EnergyType } from './entities/energy-category.entity';
import { EnergyQuality, QualityRating } from './entities/energy-quality.entity';
import { Certification, CertificationType } from './entities/certification.entity';
import { CreateCategoryDto, UpdateCategoryDto, CategoryFilterDto, CategoryTreeDto, CalculatePriceDto, CalculatePriceResponseDto } from './dto/category.dto';
import { CreateQualityRatingDto, UpdateQualityRatingDto, QualityRatingFilterDto, CreateCertificationDto, UpdateCertificationDto, CertificationFilterDto, ClassificationResponseDto } from './dto/quality-rating.dto';
export declare class ClassificationService implements OnModuleInit {
    private readonly categoryRepository;
    private readonly qualityRepository;
    private readonly certificationRepository;
    private readonly logger;
    constructor(categoryRepository: Repository<EnergyCategory>, qualityRepository: Repository<EnergyQuality>, certificationRepository: Repository<Certification>);
    onModuleInit(): Promise<void>;
    private seedDefaultCategories;
    private seedDefaultQualities;
    private seedDefaultCertifications;
    createCategory(dto: CreateCategoryDto): Promise<EnergyCategory>;
    updateCategory(id: string, dto: UpdateCategoryDto): Promise<EnergyCategory>;
    getCategoryById(id: string): Promise<EnergyCategory>;
    getCategoryByEnergyType(energyType: EnergyType): Promise<EnergyCategory>;
    listCategories(filter: CategoryFilterDto): Promise<{
        categories: EnergyCategory[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getCategoryTree(): Promise<CategoryTreeDto[]>;
    private buildCategoryTree;
    deleteCategory(id: string): Promise<void>;
    createQualityRating(dto: CreateQualityRatingDto): Promise<EnergyQuality>;
    updateQualityRating(id: string, dto: UpdateQualityRatingDto): Promise<EnergyQuality>;
    getQualityById(id: string): Promise<EnergyQuality>;
    getQualityByRating(rating: QualityRating, categoryId: string): Promise<EnergyQuality>;
    listQualityRatings(filter: QualityRatingFilterDto): Promise<{
        qualities: EnergyQuality[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    deleteQualityRating(id: string): Promise<void>;
    createCertification(dto: CreateCertificationDto): Promise<Certification>;
    updateCertification(id: string, dto: UpdateCertificationDto): Promise<Certification>;
    getCertificationById(id: string): Promise<Certification>;
    getCertificationByType(type: CertificationType): Promise<Certification>;
    listCertifications(filter: CertificationFilterDto): Promise<{
        certifications: Certification[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    deleteCertification(id: string): Promise<void>;
    getClassification(energyType: EnergyType, qualityRating: QualityRating): Promise<ClassificationResponseDto>;
    calculatePrice(dto: CalculatePriceDto): Promise<CalculatePriceResponseDto>;
    searchClassifications(query: string, isRenewable?: boolean, page?: number, limit?: number): Promise<{
        categories: EnergyCategory[];
        total: number;
    }>;
}
