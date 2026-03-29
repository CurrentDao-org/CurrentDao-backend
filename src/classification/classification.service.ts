/**
 * Classification Service
 *
 * Service for managing energy classifications, quality ratings, and certifications.
 */

import {
  Injectable,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import {
  EnergyCategory,
  EnergyType,
  DEFAULT_ENERGY_CATEGORIES,
} from './entities/energy-category.entity';
import {
  EnergyQuality,
  QualityRating,
  DEFAULT_QUALITY_RATINGS,
} from './entities/energy-quality.entity';
import {
  Certification,
  CertificationType,
  CertificationStatus,
  DEFAULT_CERTIFICATIONS,
  isCertificationValid,
} from './entities/certification.entity';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryFilterDto,
  CategoryTreeDto,
  CalculatePriceDto,
  CalculatePriceResponseDto,
} from './dto/category.dto';
import {
  CreateQualityRatingDto,
  UpdateQualityRatingDto,
  QualityRatingFilterDto,
  CreateCertificationDto,
  UpdateCertificationDto,
  CertificationFilterDto,
  ClassificationResponseDto,
} from './dto/quality-rating.dto';

/**
 * Classification service
 */
@Injectable()
export class ClassificationService implements OnModuleInit {
  private readonly logger = new Logger(ClassificationService.name);

  constructor(
    @InjectRepository(EnergyCategory)
    private readonly categoryRepository: Repository<EnergyCategory>,
    @InjectRepository(EnergyQuality)
    private readonly qualityRepository: Repository<EnergyQuality>,
    @InjectRepository(Certification)
    private readonly certificationRepository: Repository<Certification>,
  ) {}

  /**
   * Initialize and seed default data
   */
  async onModuleInit(): Promise<void> {
    await this.seedDefaultCategories();
    await this.seedDefaultQualities();
    await this.seedDefaultCertifications();
  }

  /**
   * Seed default energy categories
   */
  private async seedDefaultCategories(): Promise<void> {
    const count = await this.categoryRepository.count();
    if (count > 0) {
      this.logger.log('Categories already seeded');
      return;
    }

    this.logger.log('Seeding default energy categories...');
    const categories = this.categoryRepository.create(
      DEFAULT_ENERGY_CATEGORIES,
    );
    await this.categoryRepository.save(categories);
    this.logger.log('Default energy categories seeded');
  }

  /**
   * Seed default quality ratings
   */
  private async seedDefaultQualities(): Promise<void> {
    const count = await this.qualityRepository.count();
    if (count > 0) {
      this.logger.log('Quality ratings already seeded');
      return;
    }

    this.logger.log('Seeding default quality ratings...');

    // Get all categories to link qualities
    const categories = await this.categoryRepository.find();

    for (const quality of DEFAULT_QUALITY_RATINGS) {
      for (const category of categories) {
        const qualityEntity = this.qualityRepository.create({
          ...quality,
          categoryId: category.id,
        });
        await this.qualityRepository.save(qualityEntity);
      }
    }

    this.logger.log('Default quality ratings seeded');
  }

  /**
   * Seed default certifications
   */
  private async seedDefaultCertifications(): Promise<void> {
    const count = await this.certificationRepository.count();
    if (count > 0) {
      this.logger.log('Certifications already seeded');
      return;
    }

    this.logger.log('Seeding default certifications...');
    const certifications = this.certificationRepository.create(
      DEFAULT_CERTIFICATIONS,
    );
    await this.certificationRepository.save(certifications);
    this.logger.log('Default certifications seeded');
  }

  // ==================== Category Methods ====================

  /**
   * Create a new category
   */
  async createCategory(dto: CreateCategoryDto): Promise<EnergyCategory> {
    const category = this.categoryRepository.create(dto);
    return this.categoryRepository.save(category);
  }

  /**
   * Update a category
   */
  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<EnergyCategory> {
    const category = await this.getCategoryById(id);
    Object.assign(category, dto);
    return this.categoryRepository.save(category);
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string): Promise<EnergyCategory> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['qualities', 'certifications'],
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  /**
   * Get category by energy type
   */
  async getCategoryByEnergyType(
    energyType: EnergyType,
  ): Promise<EnergyCategory> {
    const category = await this.categoryRepository.findOne({
      where: { energyType },
      relations: ['qualities', 'certifications'],
    });
    if (!category) {
      throw new NotFoundException(
        `Category with energy type ${energyType} not found`,
      );
    }
    return category;
  }

  /**
   * List categories with filters
   */
  async listCategories(filter: CategoryFilterDto): Promise<{
    categories: EnergyCategory[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      isRenewable,
      isActive,
      energyType,
      tags,
    } = filter;
    const skip = (page - 1) * limit;

    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    if (energyType) {
      queryBuilder.andWhere('category.energyType = :energyType', {
        energyType,
      });
    }

    if (isRenewable !== undefined) {
      queryBuilder.andWhere('category.isRenewable = :isRenewable', {
        isRenewable,
      });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('category.isActive = :isActive', { isActive });
    }

    if (search) {
      queryBuilder.andWhere(
        '(category.name ILIKE :search OR category.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('category.tags && :tags', { tags });
    }

    queryBuilder.orderBy('category.sortOrder', 'ASC').skip(skip).take(limit);

    const [categories, total] = await queryBuilder.getManyAndCount();

    return {
      categories,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get category tree
   */
  async getCategoryTree(): Promise<CategoryTreeDto[]> {
    const rootCategories = await this.categoryRepository.find({
      where: { parentId: null as any },
      order: { sortOrder: 'ASC' },
    });

    return this.buildCategoryTree(rootCategories);
  }

  /**
   * Build category tree recursively
   */
  private async buildCategoryTree(
    categories: EnergyCategory[],
  ): Promise<CategoryTreeDto[]> {
    const result: CategoryTreeDto[] = [];

    for (const category of categories) {
      const children = await this.categoryRepository.find({
        where: { parentId: category.id },
        order: { sortOrder: 'ASC' },
      });

      result.push({
        id: category.id,
        energyType: category.energyType,
        name: category.name,
        priceMultiplier: Number(category.priceMultiplier),
        isRenewable: category.isRenewable,
        children:
          children.length > 0 ? await this.buildCategoryTree(children) : [],
      });
    }

    return result;
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string): Promise<void> {
    const result = await this.categoryRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
  }

  // ==================== Quality Methods ====================

  /**
   * Create a new quality rating
   */
  async createQualityRating(
    dto: CreateQualityRatingDto,
  ): Promise<EnergyQuality> {
    const quality = this.qualityRepository.create(dto);
    return this.qualityRepository.save(quality);
  }

  /**
   * Update a quality rating
   */
  async updateQualityRating(
    id: string,
    dto: UpdateQualityRatingDto,
  ): Promise<EnergyQuality> {
    const quality = await this.getQualityById(id);
    Object.assign(quality, dto);
    return this.qualityRepository.save(quality);
  }

  /**
   * Get quality by ID
   */
  async getQualityById(id: string): Promise<EnergyQuality> {
    const quality = await this.qualityRepository.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!quality) {
      throw new NotFoundException(`Quality rating with ID ${id} not found`);
    }
    return quality;
  }

  /**
   * Get quality by rating
   */
  async getQualityByRating(
    rating: QualityRating,
    categoryId: string,
  ): Promise<EnergyQuality> {
    const quality = await this.qualityRepository.findOne({
      where: { rating, categoryId },
    });
    if (!quality) {
      throw new NotFoundException(
        `Quality rating ${rating} not found for category ${categoryId}`,
      );
    }
    return quality;
  }

  /**
   * List quality ratings with filters
   */
  async listQualityRatings(filter: QualityRatingFilterDto): Promise<{
    qualities: EnergyQuality[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      rating,
      tier,
      categoryId,
      isVerified,
      isActive,
    } = filter;
    const skip = (page - 1) * limit;

    const queryBuilder = this.qualityRepository.createQueryBuilder('quality');

    if (rating) {
      queryBuilder.andWhere('quality.rating = :rating', { rating });
    }

    if (tier) {
      queryBuilder.andWhere('quality.tier = :tier', { tier });
    }

    if (categoryId) {
      queryBuilder.andWhere('quality.categoryId = :categoryId', { categoryId });
    }

    if (isVerified !== undefined) {
      queryBuilder.andWhere('quality.isVerified = :isVerified', { isVerified });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('quality.isActive = :isActive', { isActive });
    }

    if (search) {
      queryBuilder.andWhere(
        '(quality.name ILIKE :search OR quality.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('quality.sortOrder', 'ASC').skip(skip).take(limit);

    const [qualities, total] = await queryBuilder.getManyAndCount();

    return {
      qualities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Delete a quality rating
   */
  async deleteQualityRating(id: string): Promise<void> {
    const result = await this.qualityRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Quality rating with ID ${id} not found`);
    }
  }

  // ==================== Certification Methods ====================

  /**
   * Create a new certification
   */
  async createCertification(
    dto: CreateCertificationDto,
  ): Promise<Certification> {
    const certification = this.certificationRepository.create(dto);
    return this.certificationRepository.save(certification);
  }

  /**
   * Update a certification
   */
  async updateCertification(
    id: string,
    dto: UpdateCertificationDto,
  ): Promise<Certification> {
    const certification = await this.getCertificationById(id);
    Object.assign(certification, dto);
    return this.certificationRepository.save(certification);
  }

  /**
   * Get certification by ID
   */
  async getCertificationById(id: string): Promise<Certification> {
    const certification = await this.certificationRepository.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!certification) {
      throw new NotFoundException(`Certification with ID ${id} not found`);
    }
    return certification;
  }

  /**
   * Get certification by type
   */
  async getCertificationByType(
    type: CertificationType,
  ): Promise<Certification> {
    const certification = await this.certificationRepository.findOne({
      where: { type },
    });
    if (!certification) {
      throw new NotFoundException(`Certification type ${type} not found`);
    }
    return certification;
  }

  /**
   * List certifications with filters
   */
  async listCertifications(filter: CertificationFilterDto): Promise<{
    certifications: Certification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      status,
      categoryId,
      isVerified,
      validOnly,
    } = filter;
    const skip = (page - 1) * limit;

    const queryBuilder =
      this.certificationRepository.createQueryBuilder('cert');

    if (type) {
      queryBuilder.andWhere('cert.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('cert.status = :status', { status });
    }

    if (categoryId) {
      queryBuilder.andWhere('cert.categoryId = :categoryId', { categoryId });
    }

    if (isVerified !== undefined) {
      queryBuilder.andWhere('cert.isVerified = :isVerified', { isVerified });
    }

    if (validOnly) {
      queryBuilder.andWhere('cert.status = :active', {
        active: CertificationStatus.ACTIVE,
      });
      queryBuilder.andWhere('cert.validFrom <= :now', { now: new Date() });
      queryBuilder.andWhere(
        '(cert.validUntil IS NULL OR cert.validUntil >= :now)',
        { now: new Date() },
      );
    }

    if (search) {
      queryBuilder.andWhere(
        '(cert.name ILIKE :search OR cert.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('cert.name', 'ASC').skip(skip).take(limit);

    const [certifications, total] = await queryBuilder.getManyAndCount();

    return {
      certifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Delete a certification
   */
  async deleteCertification(id: string): Promise<void> {
    const result = await this.certificationRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Certification with ID ${id} not found`);
    }
  }

  // ==================== Combined Methods ====================

  /**
   * Get full classification for an energy type
   */
  async getClassification(
    energyType: EnergyType,
    qualityRating: QualityRating,
  ): Promise<ClassificationResponseDto> {
    const category = await this.getCategoryByEnergyType(energyType);
    const quality = await this.getQualityByRating(qualityRating, category.id);

    // Get valid certifications for this category
    const certifications = await this.certificationRepository.find({
      where: { status: CertificationStatus.ACTIVE },
    });

    const validCertifications = certifications.filter(isCertificationValid);

    // Calculate total multiplier
    const categoryMultiplier = Number(category.priceMultiplier);
    const qualityMultiplier = Number(quality.priceMultiplier);
    const certMultiplier = validCertifications.reduce(
      (acc, cert) => acc * Number(cert.priceAdjustment),
      1,
    );

    return {
      category: category as any,
      quality: quality as any,
      certifications: validCertifications as any,
      totalMultiplier: categoryMultiplier * qualityMultiplier * certMultiplier,
    };
  }

  /**
   * Calculate price with all adjustments
   */
  async calculatePrice(
    dto: CalculatePriceDto,
  ): Promise<CalculatePriceResponseDto> {
    const {
      basePrice,
      energyType,
      qualityMultiplier = 1.0,
      certificationMultiplier = 1.0,
    } = dto;

    // Get category for additional multiplier
    const category = await this.getCategoryByEnergyType(energyType);
    const categoryMultiplier = Number(category.priceMultiplier);

    const totalMultiplier =
      categoryMultiplier * qualityMultiplier * certificationMultiplier;
    const adjustedPrice = basePrice * totalMultiplier;

    return {
      basePrice,
      adjustedPrice,
      totalMultiplier,
      breakdown: {
        categoryMultiplier,
        qualityMultiplier,
        certificationMultiplier,
      },
    };
  }

  /**
   * Search and filter across all classifications
   */
  async searchClassifications(
    query: string,
    isRenewable?: boolean,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    categories: EnergyCategory[];
    total: number;
  }> {
    const skip = (page - 1) * limit;

    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    queryBuilder.andWhere(
      '(category.name ILIKE :query OR category.description ILIKE :query)',
      { query: `%${query}%` },
    );

    if (isRenewable !== undefined) {
      queryBuilder.andWhere('category.isRenewable = :isRenewable', {
        isRenewable,
      });
    }

    queryBuilder.orderBy('category.name', 'ASC').skip(skip).take(limit);

    const [categories, total] = await queryBuilder.getManyAndCount();

    return { categories, total };
  }
}
