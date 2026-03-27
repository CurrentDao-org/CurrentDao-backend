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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalculatePriceResponseDto = exports.CalculatePriceDto = exports.CategoryTreeDto = exports.CategoryListResponseDto = exports.CategoryResponseDto = exports.CategoryFilterDto = exports.UpdateCategoryDto = exports.CreateCategoryDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const energy_category_entity_1 = require("../entities/energy-category.entity");
class CreateCategoryDto {
}
exports.CreateCategoryDto = CreateCategoryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: energy_category_entity_1.EnergyType, description: 'Energy type' }),
    (0, class_validator_1.IsEnum)(energy_category_entity_1.EnergyType),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCategoryDto.prototype, "energyType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Solar Energy', description: 'Category name' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Length)(1, 100),
    __metadata("design:type", String)
], CreateCategoryDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Category description' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCategoryDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: energy_category_entity_1.EnergySubType, description: 'Energy sub-type' }),
    (0, class_validator_1.IsEnum)(energy_category_entity_1.EnergySubType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCategoryDto.prototype, "subType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Parent category ID' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCategoryDto.prototype, "parentId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1.25, description: 'Price multiplier' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0.1),
    (0, class_validator_1.Max)(10),
    __metadata("design:type", Number)
], CreateCategoryDto.prototype, "priceMultiplier", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, description: 'Is renewable' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateCategoryDto.prototype, "isRenewable", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1, description: 'Sort order' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(999),
    __metadata("design:type", Number)
], CreateCategoryDto.prototype, "sortOrder", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['renewable', 'solar'], description: 'Tags' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateCategoryDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Additional metadata' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateCategoryDto.prototype, "metadata", void 0);
class UpdateCategoryDto extends (0, swagger_1.PartialType)(CreateCategoryDto) {
}
exports.UpdateCategoryDto = UpdateCategoryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, description: 'Is active' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateCategoryDto.prototype, "isActive", void 0);
class CategoryFilterDto {
    constructor() {
        this.page = 1;
        this.limit = 10;
    }
}
exports.CategoryFilterDto = CategoryFilterDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: energy_category_entity_1.EnergyType, description: 'Filter by energy type' }),
    (0, class_validator_1.IsEnum)(energy_category_entity_1.EnergyType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CategoryFilterDto.prototype, "energyType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: energy_category_entity_1.EnergySubType, description: 'Filter by sub-type' }),
    (0, class_validator_1.IsEnum)(energy_category_entity_1.EnergySubType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CategoryFilterDto.prototype, "subType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, description: 'Filter by renewable status' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CategoryFilterDto.prototype, "isRenewable", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, description: 'Filter by active status' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CategoryFilterDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'solar', description: 'Search by name or description' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CategoryFilterDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Tags to filter by' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CategoryFilterDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1, description: 'Page number' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CategoryFilterDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 10, description: 'Items per page' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CategoryFilterDto.prototype, "limit", void 0);
class CategoryResponseDto {
}
exports.CategoryResponseDto = CategoryResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Category ID' }),
    __metadata("design:type", String)
], CategoryResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: energy_category_entity_1.EnergyType, description: 'Energy type' }),
    __metadata("design:type", String)
], CategoryResponseDto.prototype, "energyType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Category name' }),
    __metadata("design:type", String)
], CategoryResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Category description' }),
    __metadata("design:type", String)
], CategoryResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: energy_category_entity_1.EnergySubType, description: 'Energy sub-type' }),
    __metadata("design:type", String)
], CategoryResponseDto.prototype, "subType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Parent category ID' }),
    __metadata("design:type", String)
], CategoryResponseDto.prototype, "parentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1.25, description: 'Price multiplier' }),
    __metadata("design:type", Number)
], CategoryResponseDto.prototype, "priceMultiplier", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Is renewable' }),
    __metadata("design:type", Boolean)
], CategoryResponseDto.prototype, "isRenewable", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Is active' }),
    __metadata("design:type", Boolean)
], CategoryResponseDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Sort order' }),
    __metadata("design:type", Number)
], CategoryResponseDto.prototype, "sortOrder", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: ['renewable', 'solar'], description: 'Tags' }),
    __metadata("design:type", Array)
], CategoryResponseDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Additional metadata' }),
    __metadata("design:type", Object)
], CategoryResponseDto.prototype, "metadata", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Created at timestamp' }),
    __metadata("design:type", Date)
], CategoryResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Updated at timestamp' }),
    __metadata("design:type", Date)
], CategoryResponseDto.prototype, "updatedAt", void 0);
class CategoryListResponseDto {
}
exports.CategoryListResponseDto = CategoryListResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'List of categories' }),
    __metadata("design:type", Array)
], CategoryListResponseDto.prototype, "categories", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total count' }),
    __metadata("design:type", Number)
], CategoryListResponseDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Current page' }),
    __metadata("design:type", Number)
], CategoryListResponseDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 10, description: 'Items per page' }),
    __metadata("design:type", Number)
], CategoryListResponseDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5, description: 'Total pages' }),
    __metadata("design:type", Number)
], CategoryListResponseDto.prototype, "totalPages", void 0);
class CategoryTreeDto {
}
exports.CategoryTreeDto = CategoryTreeDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Category ID' }),
    __metadata("design:type", String)
], CategoryTreeDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: energy_category_entity_1.EnergyType, description: 'Energy type' }),
    __metadata("design:type", String)
], CategoryTreeDto.prototype, "energyType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Category name' }),
    __metadata("design:type", String)
], CategoryTreeDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1.25, description: 'Price multiplier' }),
    __metadata("design:type", Number)
], CategoryTreeDto.prototype, "priceMultiplier", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Is renewable' }),
    __metadata("design:type", Boolean)
], CategoryTreeDto.prototype, "isRenewable", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Child categories' }),
    __metadata("design:type", Array)
], CategoryTreeDto.prototype, "children", void 0);
class CalculatePriceDto {
}
exports.CalculatePriceDto = CalculatePriceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100, description: 'Base price' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculatePriceDto.prototype, "basePrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: energy_category_entity_1.EnergyType, description: 'Energy type' }),
    (0, class_validator_1.IsEnum)(energy_category_entity_1.EnergyType),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CalculatePriceDto.prototype, "energyType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: energy_category_entity_1.EnergyType, description: 'Quality rating' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CalculatePriceDto.prototype, "qualityMultiplier", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Certification multiplier' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CalculatePriceDto.prototype, "certificationMultiplier", void 0);
class CalculatePriceResponseDto {
}
exports.CalculatePriceResponseDto = CalculatePriceResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100, description: 'Base price' }),
    __metadata("design:type", Number)
], CalculatePriceResponseDto.prototype, "basePrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 125, description: 'Adjusted price' }),
    __metadata("design:type", Number)
], CalculatePriceResponseDto.prototype, "adjustedPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1.25, description: 'Total multiplier' }),
    __metadata("design:type", Number)
], CalculatePriceResponseDto.prototype, "totalMultiplier", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Price breakdown' }),
    __metadata("design:type", Object)
], CalculatePriceResponseDto.prototype, "breakdown", void 0);
//# sourceMappingURL=category.dto.js.map