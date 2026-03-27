"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassificationModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const classification_service_1 = require("./classification.service");
const energy_category_entity_1 = require("./entities/energy-category.entity");
const energy_quality_entity_1 = require("./entities/energy-quality.entity");
const certification_entity_1 = require("./entities/certification.entity");
let ClassificationModule = class ClassificationModule {
};
exports.ClassificationModule = ClassificationModule;
exports.ClassificationModule = ClassificationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                energy_category_entity_1.EnergyCategory,
                energy_quality_entity_1.EnergyQuality,
                certification_entity_1.Certification,
            ]),
        ],
        providers: [
            classification_service_1.ClassificationService,
        ],
        exports: [
            classification_service_1.ClassificationService,
            typeorm_1.TypeOrmModule,
        ],
    })
], ClassificationModule);
//# sourceMappingURL=classification.module.js.map