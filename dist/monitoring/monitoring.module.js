"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const schedule_1 = require("@nestjs/schedule");
const transaction_status_entity_1 = require("./entities/transaction-status.entity");
const transaction_monitor_service_1 = require("./transaction-monitor.service");
const retry_service_1 = require("./retry/retry.service");
const alert_service_1 = require("./alerts/alert.service");
const transaction_workflow_1 = require("./workflows/transaction.workflow");
const monitoring_controller_1 = require("./monitoring.controller");
let MonitoringModule = class MonitoringModule {
};
exports.MonitoringModule = MonitoringModule;
exports.MonitoringModule = MonitoringModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([transaction_status_entity_1.TransactionStatusEntity]),
            schedule_1.ScheduleModule,
        ],
        controllers: [monitoring_controller_1.MonitoringController],
        providers: [
            transaction_monitor_service_1.TransactionMonitorService,
            retry_service_1.RetryService,
            alert_service_1.AlertService,
            transaction_workflow_1.TransactionWorkflowService,
        ],
        exports: [
            transaction_monitor_service_1.TransactionMonitorService,
            retry_service_1.RetryService,
            alert_service_1.AlertService,
            transaction_workflow_1.TransactionWorkflowService,
        ],
    })
], MonitoringModule);
//# sourceMappingURL=monitoring.module.js.map