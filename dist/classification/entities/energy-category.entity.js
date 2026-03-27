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
exports.getPriceMultiplier = exports.isRenewableEnergy = exports.DEFAULT_ENERGY_CATEGORIES = exports.EnergyCategory = exports.EnergySubType = exports.EnergyType = void 0;
const typeorm_1 = require("typeorm");
const energy_quality_entity_1 = require("./energy-quality.entity");
const certification_entity_1 = require("./certification.entity");
var EnergyType;
(function (EnergyType) {
    EnergyType["SOLAR"] = "solar";
    EnergyType["WIND"] = "wind";
    EnergyType["HYDRO"] = "hydro";
    EnergyType["GEOTHERMAL"] = "geothermal";
    EnergyType["BIOMASS"] = "biomass";
    EnergyType["NATURAL_GAS"] = "natural_gas";
    EnergyType["COAL"] = "coal";
    EnergyType["NUCLEAR"] = "nuclear";
    EnergyType["OIL"] = "oil";
})(EnergyType || (exports.EnergyType = EnergyType = {}));
var EnergySubType;
(function (EnergySubType) {
    EnergySubType["PHOTOVOLTAIC"] = "photovoltaic";
    EnergySubType["CONCENTRATED_SOLAR"] = "concentrated_solar";
    EnergySubType["SOLAR_THERMAL"] = "solar_thermal";
    EnergySubType["ONSHORE_WIND"] = "onshore_wind";
    EnergySubType["OFFSHORE_WIND"] = "offshore_wind";
    EnergySubType["RUN_OF_RIVER"] = "run_of_river";
    EnergySubType["RESERVOIR"] = "reservoir";
    EnergySubType["PUMPED_STORAGE"] = "pumped_storage";
    EnergySubType["SOLID_BIOMASS"] = "solid_biomass";
    EnergySubType["LIQUID_BIOMASS"] = "liquid_biomass";
    EnergySubType["BIOGAS"] = "biogas";
})(EnergySubType || (exports.EnergySubType = EnergySubType = {}));
let EnergyCategory = class EnergyCategory {
};
exports.EnergyCategory = EnergyCategory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], EnergyCategory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: EnergyType,
        unique: true,
    }),
    __metadata("design:type", String)
], EnergyCategory.prototype, "energyType", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], EnergyCategory.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], EnergyCategory.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: EnergySubType,
        nullable: true,
    }),
    __metadata("design:type", String)
], EnergyCategory.prototype, "subType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'parent_id', nullable: true }),
    __metadata("design:type", String)
], EnergyCategory.prototype, "parentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => EnergyCategory, (category) => category.children, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'parent_id' }),
    __metadata("design:type", EnergyCategory)
], EnergyCategory.prototype, "parent", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => EnergyCategory, (category) => category.parent),
    __metadata("design:type", Array)
], EnergyCategory.prototype, "children", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 1.0 }),
    __metadata("design:type", Number)
], EnergyCategory.prototype, "priceMultiplier", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_renewable', default: false }),
    __metadata("design:type", Boolean)
], EnergyCategory.prototype, "isRenewable", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], EnergyCategory.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], EnergyCategory.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], EnergyCategory.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], EnergyCategory.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], EnergyCategory.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], EnergyCategory.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => energy_quality_entity_1.EnergyQuality, (quality) => quality.category),
    __metadata("design:type", Array)
], EnergyCategory.prototype, "qualities", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => certification_entity_1.Certification, (certification) => certification.category),
    __metadata("design:type", Array)
], EnergyCategory.prototype, "certifications", void 0);
exports.EnergyCategory = EnergyCategory = __decorate([
    (0, typeorm_1.Entity)('energy_categories')
], EnergyCategory);
exports.DEFAULT_ENERGY_CATEGORIES = [
    {
        energyType: EnergyType.SOLAR,
        name: 'Solar Energy',
        description: 'Energy derived from sunlight through photovoltaic or thermal means',
        subType: null,
        priceMultiplier: 1.25,
        isRenewable: true,
        sortOrder: 1,
        tags: ['renewable', 'solar', 'clean'],
    },
    {
        energyType: EnergyType.WIND,
        name: 'Wind Energy',
        description: 'Energy derived from wind using turbines',
        subType: null,
        priceMultiplier: 1.15,
        isRenewable: true,
        sortOrder: 2,
        tags: ['renewable', 'wind', 'clean'],
    },
    {
        energyType: EnergyType.HYDRO,
        name: 'Hydro Energy',
        description: 'Energy derived from water flow through hydroelectric plants',
        subType: null,
        priceMultiplier: 1.1,
        isRenewable: true,
        sortOrder: 3,
        tags: ['renewable', 'hydro', 'clean'],
    },
    {
        energyType: EnergyType.GEOTHERMAL,
        name: 'Geothermal Energy',
        description: 'Energy derived from heat stored beneath the Earth\'s surface',
        subType: null,
        priceMultiplier: 1.2,
        isRenewable: true,
        sortOrder: 4,
        tags: ['renewable', 'geothermal', 'clean'],
    },
    {
        energyType: EnergyType.BIOMASS,
        name: 'Biomass Energy',
        description: 'Energy derived from organic materials',
        subType: null,
        priceMultiplier: 1.0,
        isRenewable: true,
        sortOrder: 5,
        tags: ['renewable', 'biomass', 'organic'],
    },
    {
        energyType: EnergyType.NATURAL_GAS,
        name: 'Natural Gas',
        description: 'Fossil fuel derived from underground deposits',
        subType: null,
        priceMultiplier: 0.95,
        isRenewable: false,
        sortOrder: 6,
        tags: ['fossil', 'gas', 'non-renewable'],
    },
    {
        energyType: EnergyType.COAL,
        name: 'Coal',
        description: 'Fossil fuel derived from ancient plant material',
        subType: null,
        priceMultiplier: 0.85,
        isRenewable: false,
        sortOrder: 7,
        tags: ['fossil', 'coal', 'non-renewable'],
    },
    {
        energyType: EnergyType.NUCLEAR,
        name: 'Nuclear Energy',
        description: 'Energy derived from nuclear fission',
        subType: null,
        priceMultiplier: 0.9,
        isRenewable: false,
        sortOrder: 8,
        tags: ['nuclear', 'atomic', 'low-carbon'],
    },
];
const isRenewableEnergy = (energyType) => {
    return [
        EnergyType.SOLAR,
        EnergyType.WIND,
        EnergyType.HYDRO,
        EnergyType.GEOTHERMAL,
        EnergyType.BIOMASS,
    ].includes(energyType);
};
exports.isRenewableEnergy = isRenewableEnergy;
const getPriceMultiplier = (energyType) => {
    const multiplierMap = {
        [EnergyType.SOLAR]: 1.25,
        [EnergyType.WIND]: 1.15,
        [EnergyType.HYDRO]: 1.1,
        [EnergyType.GEOTHERMAL]: 1.2,
        [EnergyType.BIOMASS]: 1.0,
        [EnergyType.NATURAL_GAS]: 0.95,
        [EnergyType.COAL]: 0.85,
        [EnergyType.NUCLEAR]: 0.9,
        [EnergyType.OIL]: 0.8,
    };
    return multiplierMap[energyType] || 1.0;
};
exports.getPriceMultiplier = getPriceMultiplier;
//# sourceMappingURL=energy-category.entity.js.map