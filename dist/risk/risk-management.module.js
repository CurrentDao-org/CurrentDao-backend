"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskManagementModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const risk_data_entity_1 = require("./entities/risk-data.entity");
const risk_assessor_service_1 = require("./assessment/risk-assessor.service");
const real_time_monitor_service_1 = require("./monitoring/real-time-monitor.service");
const hedging_strategy_service_1 = require("./hedging/hedging-strategy.service");
const var_calculator_service_1 = require("./calculations/var-calculator.service");
const stress_test_service_1 = require("./testing/stress-test.service");
const risk_management_controller_1 = require("./controller/risk-management.controller");
let RiskManagementModule = class RiskManagementModule {
};
exports.RiskManagementModule = RiskManagementModule;
exports.RiskManagementModule = RiskManagementModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([risk_data_entity_1.RiskDataEntity])],
        controllers: [risk_management_controller_1.RiskManagementController],
        providers: [
            risk_assessor_service_1.RiskAssessorService,
            real_time_monitor_service_1.RealTimeMonitorService,
            hedging_strategy_service_1.HedgingStrategyService,
            var_calculator_service_1.VarCalculatorService,
            stress_test_service_1.StressTestService,
        ],
        exports: [
            risk_assessor_service_1.RiskAssessorService,
            real_time_monitor_service_1.RealTimeMonitorService,
            hedging_strategy_service_1.HedgingStrategyService,
            var_calculator_service_1.VarCalculatorService,
            stress_test_service_1.StressTestService,
        ],
    })
], RiskManagementModule);
//# sourceMappingURL=risk-management.module.js.map