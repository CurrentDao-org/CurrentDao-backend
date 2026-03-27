"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ClassificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassificationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const energy_category_entity_1 = require("./entities/energy-category.entity");
const energy_quality_entity_1 = require("./entities/energy-quality.entity");
const certification_entity_1 = require("./entities/certification.entity");
let ClassificationService = ClassificationService_1 = class ClassificationService {
    constructor(categoryRepository, qualityRepository, certificationRepository) {
        this.categoryRepository = categoryRepository;
        this.qualityRepository = qualityRepository;
        this.certificationRepository = certificationRepository;
        this.logger = new common_1.Logger(ClassificationService_1.name);
    }
    async onModuleInit() {
        await this.seedDefaultCategories();
        await this.seedDefaultQualities();
        await this.seedDefaultCertifications();
    }
    async seedDefaultCategories() {
        const count = await this.categoryRepository.count();
        if (count > 0) {
            this.logger.log('Categories already seeded');
            return;
        }
        this.logger.log('Seeding default energy categories...');
        const categories = this.categoryRepository.create(energy_category_entity_1.DEFAULT_ENERGY_CATEGORIES);
        await this.categoryRepository.save(categories);
        this.logger.log('Default energy categories seeded');
    }
    async seedDefaultQualities() {
        const count = await this.qualityRepository.count();
        if (count > 0) {
            this.logger.log('Quality ratings already seeded');
            return;
        }
        this.logger.log('Seeding default quality ratings...');
        const categories = await this.categoryRepository.find();
        for (const quality of energy_quality_entity_1.DEFAULT_QUALITY_RATINGS) {
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
    async seedDefaultCertifications() {
        const count = await this.certificationRepository.count();
        if (count > 0) {
            this.logger.log('Certifications already seeded');
            return;
        }
        this.logger.log('Seeding default certifications...');
        const certifications = this.certificationRepository.create(certification_entity_1.DEFAULT_CERTIFICATIONS);
        await this.certificationRepository.save(certifications);
        this.logger.log('Default certifications seeded');
    }
    async createCategory(dto) {
        const category = this.categoryRepository.create(dto);
        return this.categoryRepository.save(category);
    }
    async updateCategory(id, dto) {
        const category = await this.getCategoryById(id);
        Object.assign(category, dto);
        return this.categoryRepository.save(category);
    }
    async getCategoryById(id) {
        const category = await this.categoryRepository.findOne({
            where: { id },
            relations: ['qualities', 'certifications'],
        });
        if (!category) {
            throw new common_1.NotFoundException(`Category with ID ${id} not found`);
        }
        return category;
    }
    async getCategoryByEnergyType(energyType) {
        const category = await this.categoryRepository.findOne({
            where: { energyType },
            relations: ['qualities', 'certifications'],
        });
        if (!category) {
            throw new common_1.NotFoundException(`Category with energy type ${energyType} not found`);
        }
        return category;
    }
    async listCategories(filter) {
        const { page = 1, limit = 10, search, isRenewable, isActive, energyType, tags } = filter;
        const skip = (page - 1) * limit;
        const queryBuilder = this.categoryRepository.createQueryBuilder('category');
        if (energyType) {
            queryBuilder.andWhere('category.energyType = :energyType', { energyType });
        }
        if (isRenewable !== undefined) {
            queryBuilder.andWhere('category.isRenewable = :isRenewable', { isRenewable });
        }
        if (isActive !== undefined) {
            queryBuilder.andWhere('category.isActive = :isActive', { isActive });
        }
        if (search) {
            queryBuilder.andWhere('(category.name ILIKE :search OR category.description ILIKE :search)', { search: `%${search}%` });
        }
        if (tags && tags.length > 0) {
            queryBuilder.andWhere('category.tags && :tags', { tags });
        }
        queryBuilder
            .orderBy('category.sortOrder', 'ASC')
            .skip(skip)
            .take(limit);
        const [categories, total] = await queryBuilder.getManyAndCount();
        return {
            categories,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getCategoryTree() {
        const rootCategories = await this.categoryRepository.find({
            where: { parentId: null },
            order: { sortOrder: 'ASC' },
        });
        return this.buildCategoryTree(rootCategories);
    }
    async buildCategoryTree(categories) {
        const result = [];
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
                children: children.length > 0
                    ? await this.buildCategoryTree(children)
                    : [],
            });
        }
        return result;
    }
    async deleteCategory(id) {
        const result = await this.categoryRepository.delete(id);
        if (result.affected === 0) {
            throw new common_1.NotFoundException(`Category with ID ${id} not found`);
        }
    }
    async createQualityRating(dto) {
        const quality = this.qualityRepository.create(dto);
        return this.qualityRepository.save(quality);
    }
    async updateQualityRating(id, dto) {
        const quality = await this.getQualityById(id);
        Object.assign(quality, dto);
        return this.qualityRepository.save(quality);
    }
    async getQualityById(id) {
        const quality = await this.qualityRepository.findOne({
            where: { id },
            relations: ['category'],
        });
        if (!quality) {
            throw new common_1.NotFoundException(`Quality rating with ID ${id} not found`);
        }
        return quality;
    }
    async getQualityByRating(rating, categoryId) {
        const quality = await this.qualityRepository.findOne({
            where: { rating, categoryId },
        });
        if (!quality) {
            throw new common_1.NotFoundException(`Quality rating ${rating} not found for category ${categoryId}`);
        }
        return quality;
    }
    async listQualityRatings(filter) {
        const { page = 1, limit = 10, search, rating, tier, categoryId, isVerified, isActive } = filter;
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
            queryBuilder.andWhere('(quality.name ILIKE :search OR quality.description ILIKE :search)', { search: `%${search}%` });
        }
        queryBuilder
            .orderBy('quality.sortOrder', 'ASC')
            .skip(skip)
            .take(limit);
        const [qualities, total] = await queryBuilder.getManyAndCount();
        return {
            qualities,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async deleteQualityRating(id) {
        const result = await this.qualityRepository.delete(id);
        if (result.affected === 0) {
            throw new common_1.NotFoundException(`Quality rating with ID ${id} not found`);
        }
    }
    async createCertification(dto) {
        const certification = this.certificationRepository.create(dto);
        return this.certificationRepository.save(certification);
    }
    async updateCertification(id, dto) {
        const certification = await this.getCertificationById(id);
        Object.assign(certification, dto);
        return this.certificationRepository.save(certification);
    }
    async getCertificationById(id) {
        const certification = await this.certificationRepository.findOne({
            where: { id },
            relations: ['category'],
        });
        if (!certification) {
            throw new common_1.NotFoundException(`Certification with ID ${id} not found`);
        }
        return certification;
    }
    async getCertificationByType(type) {
        const certification = await this.certificationRepository.findOne({
            where: { type },
        });
        if (!certification) {
            throw new common_1.NotFoundException(`Certification type ${type} not found`);
        }
        return certification;
    }
    async listCertifications(filter) {
        const { page = 1, limit = 10, search, type, status, categoryId, isVerified, validOnly, } = filter;
        const skip = (page - 1) * limit;
        const queryBuilder = this.certificationRepository.createQueryBuilder('cert');
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
            queryBuilder.andWhere('cert.status = :active', { active: certification_entity_1.CertificationStatus.ACTIVE });
            queryBuilder.andWhere('cert.validFrom <= :now', { now: new Date() });
            queryBuilder.andWhere('(cert.validUntil IS NULL OR cert.validUntil >= :now)', { now: new Date() });
        }
        if (search) {
            queryBuilder.andWhere('(cert.name ILIKE :search OR cert.description ILIKE :search)', { search: `%${search}%` });
        }
        queryBuilder
            .orderBy('cert.name', 'ASC')
            .skip(skip)
            .take(limit);
        const [certifications, total] = await queryBuilder.getManyAndCount();
        return {
            certifications,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async deleteCertification(id) {
        const result = await this.certificationRepository.delete(id);
        if (result.affected === 0) {
            throw new common_1.NotFoundException(`Certification with ID ${id} not found`);
        }
    }
    async getClassification(energyType, qualityRating) {
        const category = await this.getCategoryByEnergyType(energyType);
        const quality = await this.getQualityByRating(qualityRating, category.id);
        const certifications = await this.certificationRepository.find({
            where: { status: certification_entity_1.CertificationStatus.ACTIVE },
        });
        const validCertifications = certifications.filter(certification_entity_1.isCertificationValid);
        const categoryMultiplier = Number(category.priceMultiplier);
        const qualityMultiplier = Number(quality.priceMultiplier);
        const certMultiplier = validCertifications.reduce((acc, cert) => acc * Number(cert.priceAdjustment), 1);
        return {
            category: category,
            quality: quality,
            certifications: validCertifications,
            totalMultiplier: categoryMultiplier * qualityMultiplier * certMultiplier,
        };
    }
    async calculatePrice(dto) {
        const { basePrice, energyType, qualityMultiplier = 1.0, certificationMultiplier = 1.0 } = dto;
        const category = await this.getCategoryByEnergyType(energyType);
        const categoryMultiplier = Number(category.priceMultiplier);
        const totalMultiplier = categoryMultiplier * qualityMultiplier * certificationMultiplier;
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
    async searchClassifications(query, isRenewable, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const queryBuilder = this.categoryRepository.createQueryBuilder('category');
        queryBuilder.andWhere('(category.name ILIKE :query OR category.description ILIKE :query)', { query: `%${query}%` });
        if (isRenewable !== undefined) {
            queryBuilder.andWhere('category.isRenewable = :isRenewable', { isRenewable });
        }
        queryBuilder
            .orderBy('category.name', 'ASC')
            .skip(skip)
            .take(limit);
        const [categories, total] = await queryBuilder.getManyAndCount();
        return { categories, total };
    }
};
exports.ClassificationService = ClassificationService;
exports.ClassificationService = ClassificationService = ClassificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(energy_category_entity_1.EnergyCategory)),
    __param(1, (0, typeorm_1.InjectRepository)(energy_quality_entity_1.EnergyQuality)),
    __param(2, (0, typeorm_1.InjectRepository)(certification_entity_1.Certification)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ClassificationService);
//# sourceMappingURL=classification.service.js.map