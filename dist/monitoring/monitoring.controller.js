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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringController = void 0;
const common_1 = require("@nestjs/common");
const transaction_monitor_service_1 = require("./transaction-monitor.service");
const transaction_status_dto_1 = require("./dto/transaction-status.dto");
let MonitoringController = class MonitoringController {
    constructor(transactionMonitorService) {
        this.transactionMonitorService = transactionMonitorService;
    }
    async createTransaction(createDto) {
        return this.transactionMonitorService.createTransaction(createDto);
    }
    async getTransaction(hash) {
        return this.transactionMonitorService.getTransaction(hash);
    }
    async getTransactions(query) {
        return this.transactionMonitorService.getTransactions(query);
    }
    async getAnalytics(timeRange = 'day') {
        return this.transactionMonitorService.getTransactionAnalytics(timeRange);
    }
    async getMonitoringStats() {
        return this.transactionMonitorService.getMonitoringStats();
    }
};
exports.MonitoringController = MonitoringController;
__decorate([
    (0, common_1.Post)('transactions'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [transaction_status_dto_1.CreateTransactionStatusDto]),
    __metadata("design:returntype", Promise)
], MonitoringController.prototype, "createTransaction", null);
__decorate([
    (0, common_1.Get)('transactions/:hash'),
    __param(0, (0, common_1.Param)('hash')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MonitoringController.prototype, "getTransaction", null);
__decorate([
    (0, common_1.Get)('transactions'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [transaction_status_dto_1.TransactionStatusQueryDto]),
    __metadata("design:returntype", Promise)
], MonitoringController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Get)('analytics'),
    __param(0, (0, common_1.Query)('timeRange')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MonitoringController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MonitoringController.prototype, "getMonitoringStats", null);
exports.MonitoringController = MonitoringController = __decorate([
    (0, common_1.Controller)('monitoring'),
    __metadata("design:paramtypes", [transaction_monitor_service_1.TransactionMonitorService])
], MonitoringController);
//# sourceMappingURL=monitoring.controller.js.map