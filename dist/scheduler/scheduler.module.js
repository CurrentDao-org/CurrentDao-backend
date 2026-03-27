"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const schedule_1 = require("@nestjs/schedule");
Object.defineProperty(exports, "SchedulerModule", { enumerable: true, get: function () { return schedule_1.SchedulerModule; } });
const scheduler_service_1 = require("./scheduler.service");
const scheduled_job_entity_1 = require("./entities/scheduled-job.entity");
const trade_execution_job_1 = require("./jobs/trade-execution.job");
const settlement_job_1 = require("./jobs/settlement.job");
const maintenance_job_1 = require("./jobs/maintenance.job");
const market_hours_service_1 = require("./services/market-hours.service");
const scheduler_controller_1 = require("./controllers/scheduler.controller");
let SchedulerModule = class SchedulerModule {
};
exports.SchedulerModule = SchedulerModule;
exports.SchedulerModule = schedule_1.SchedulerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([scheduled_job_entity_1.ScheduledJob]),
            schedule_1.SchedulerModule.forRoot(),
        ],
        controllers: [scheduler_controller_1.SchedulerController],
        providers: [
            scheduler_service_1.SchedulerService,
            trade_execution_job_1.TradeExecutionJob,
            settlement_job_1.SettlementJob,
            maintenance_job_1.MaintenanceJob,
            market_hours_service_1.MarketHoursService,
        ],
        exports: [scheduler_service_1.SchedulerService, market_hours_service_1.MarketHoursService],
    })
], schedule_1.SchedulerModule);
//# sourceMappingURL=scheduler.module.js.map