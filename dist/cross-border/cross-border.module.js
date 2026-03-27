"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossBorderModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const regulation_service_1 = require("./compliance/regulation-service");
const currency_service_1 = require("./currency/currency-service");
const transaction_processor_service_1 = require("./transactions/transaction-processor.service");
const regulatory_report_service_1 = require("./reporting/regulatory-report.service");
const customs_service_1 = require("./tariffs/customs-service");
const cross_border_transaction_entity_1 = require("./entities/cross-border-transaction.entity");
const cross_border_controller_1 = require("./controller/cross-border.controller");
let CrossBorderModule = class CrossBorderModule {
};
exports.CrossBorderModule = CrossBorderModule;
exports.CrossBorderModule = CrossBorderModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, typeorm_1.TypeOrmModule.forFeature([cross_border_transaction_entity_1.CrossBorderTransaction])],
        controllers: [cross_border_controller_1.CrossBorderController],
        providers: [
            regulation_service_1.RegulationService,
            currency_service_1.CurrencyService,
            transaction_processor_service_1.TransactionProcessorService,
            regulatory_report_service_1.RegulatoryReportService,
            customs_service_1.CustomsService,
        ],
        exports: [
            regulation_service_1.RegulationService,
            currency_service_1.CurrencyService,
            transaction_processor_service_1.TransactionProcessorService,
            regulatory_report_service_1.RegulatoryReportService,
            customs_service_1.CustomsService,
        ],
    })
], CrossBorderModule);
//# sourceMappingURL=cross-border.module.js.map