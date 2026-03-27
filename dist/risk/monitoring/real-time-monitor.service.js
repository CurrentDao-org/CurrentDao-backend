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
var RealTimeMonitorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealTimeMonitorService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const risk_data_entity_1 = require("../entities/risk-data.entity");
const schedule_1 = require("@nestjs/schedule");
let RealTimeMonitorService = RealTimeMonitorService_1 = class RealTimeMonitorService {
    constructor(riskDataRepository) {
        this.riskDataRepository = riskDataRepository;
        this.logger = new common_1.Logger(RealTimeMonitorService_1.name);
        this.monitoringIntervals = new Map();
        this.riskThresholds = {
            low: 1.5,
            medium: 2.5,
            high: 3.5,
            critical: 4.0,
        };
    }
    async startMonitoring(monitoringDto) {
        const { portfolioId, varConfidence = 0.95, timeHorizon = 10, enableRealTimeAlerts = true, } = monitoringDto;
        this.logger.log(`Starting real-time monitoring for portfolio: ${portfolioId}`);
        this.stopMonitoring(portfolioId);
        const interval = setInterval(async () => {
            await this.performRiskCheck(portfolioId, varConfidence, timeHorizon, enableRealTimeAlerts);
        }, 10000);
        this.monitoringIntervals.set(portfolioId, interval);
        await this.performRiskCheck(portfolioId, varConfidence, timeHorizon, enableRealTimeAlerts);
    }
    async stopMonitoring(portfolioId) {
        const interval = this.monitoringIntervals.get(portfolioId);
        if (interval) {
            clearInterval(interval);
            this.monitoringIntervals.delete(portfolioId);
            this.logger.log(`Stopped monitoring for portfolio: ${portfolioId}`);
        }
    }
    async performRiskCheck(portfolioId, varConfidence, timeHorizon, enableRealTimeAlerts) {
        try {
            const startTime = Date.now();
            const latestRiskData = await this.getLatestRiskData(portfolioId);
            if (!latestRiskData) {
                this.logger.warn(`No risk data found for portfolio: ${portfolioId}`);
                return;
            }
            const currentRiskLevel = await this.calculateCurrentRiskLevel(portfolioId);
            const varValue = await this.calculateRealTimeVaR(portfolioId, varConfidence, timeHorizon);
            const riskBreach = await this.checkRiskThresholds(currentRiskLevel, latestRiskData.riskLevel);
            if (riskBreach.hasBreach && enableRealTimeAlerts) {
                await this.triggerRiskAlert(portfolioId, riskBreach);
            }
            await this.updateRiskMetrics(portfolioId, {
                riskLevel: currentRiskLevel,
                varValue,
                varConfidence,
                lastChecked: new Date(),
            });
            const processingTime = Date.now() - startTime;
            this.logger.debug(`Risk check completed for ${portfolioId} in ${processingTime}ms`);
            if (processingTime > 200) {
                this.logger.warn(`Risk check exceeded 200ms threshold: ${processingTime}ms`);
            }
        }
        catch (error) {
            this.logger.error(`Error during risk check for portfolio ${portfolioId}:`, error);
        }
    }
    async getLatestRiskData(portfolioId) {
        return this.riskDataRepository.findOne({
            where: { portfolioId },
            order: { createdAt: 'DESC' },
        });
    }
    async calculateCurrentRiskLevel(portfolioId) {
        const baseRisk = 2.0;
        const volatility = Math.random() * 0.5 - 0.25;
        const marketStress = this.getMarketStressFactor();
        return Math.max(1, Math.min(4, baseRisk + volatility + marketStress));
    }
    async calculateRealTimeVaR(portfolioId, confidence, timeHorizon) {
        const portfolioValue = await this.getPortfolioValue(portfolioId);
        const volatility = 0.2;
        const timeAdjustment = Math.sqrt(timeHorizon / 252);
        const confidenceFactor = this.getConfidenceFactor(confidence);
        return portfolioValue * volatility * timeAdjustment * confidenceFactor;
    }
    async getPortfolioValue(portfolioId) {
        return 1000000;
    }
    getConfidenceFactor(confidence) {
        const factors = {
            0.95: 1.645,
            0.96: 1.751,
            0.97: 1.881,
            0.98: 2.054,
            0.99: 2.326,
        };
        return factors[confidence] || 1.645;
    }
    getMarketStressFactor() {
        const vix = Math.random() * 50 + 10;
        return Math.max(-0.5, (vix - 20) / 40);
    }
    async checkRiskThresholds(currentRisk, previousRisk) {
        const riskIncrease = currentRisk - previousRisk;
        const thresholdIncrease = 0.5;
        if (currentRisk >= this.riskThresholds.critical) {
            return {
                hasBreach: true,
                breachType: 'CRITICAL_THRESHOLD',
                severity: 'CRITICAL',
            };
        }
        if (currentRisk >= this.riskThresholds.high) {
            return {
                hasBreach: true,
                breachType: 'HIGH_THRESHOLD',
                severity: 'HIGH',
            };
        }
        if (riskIncrease >= thresholdIncrease) {
            return {
                hasBreach: true,
                breachType: 'RAPID_INCREASE',
                severity: currentRisk >= 3 ? 'HIGH' : 'MEDIUM',
            };
        }
        return {
            hasBreach: false,
            breachType: 'NONE',
            severity: 'LOW',
        };
    }
    async triggerRiskAlert(portfolioId, riskBreach) {
        this.logger.warn(`RISK ALERT - Portfolio: ${portfolioId}, Type: ${riskBreach.breachType}, Severity: ${riskBreach.severity}`);
        const alertData = {
            portfolioId,
            alertType: riskBreach.breachType,
            severity: riskBreach.severity,
            timestamp: new Date(),
            requiresImmediateAction: riskBreach.severity === 'CRITICAL',
        };
        await this.storeRiskAlert(alertData);
    }
    async storeRiskAlert(alertData) {
        this.logger.log(`Risk alert stored: ${JSON.stringify(alertData)}`);
    }
    async updateRiskMetrics(portfolioId, metrics) {
        const latestRiskData = await this.riskDataRepository.findOne({
            where: { portfolioId },
            order: { createdAt: 'DESC' },
        });
        if (!latestRiskData) {
            return;
        }
        await this.riskDataRepository.update(latestRiskData.id, metrics);
    }
    async generateDailyRiskSummary() {
        this.logger.log('Generating daily risk summary');
        const activePortfolios = await this.getActivePortfolios();
        for (const portfolioId of activePortfolios) {
            await this.generatePortfolioRiskSummary(portfolioId);
        }
    }
    async getActivePortfolios() {
        return Array.from(this.monitoringIntervals.keys());
    }
    async generatePortfolioRiskSummary(portfolioId) {
        const summary = {
            portfolioId,
            date: new Date().toISOString().split('T')[0],
            maxRiskLevel: await this.getMaxRiskLevel(portfolioId),
            averageRiskLevel: await this.getAverageRiskLevel(portfolioId),
            varBreachCount: await this.getVarBreachCount(portfolioId),
            alertsTriggered: await this.getAlertCount(portfolioId),
        };
        this.logger.log(`Daily risk summary for ${portfolioId}: ${JSON.stringify(summary)}`);
    }
    async getMaxRiskLevel(portfolioId) {
        return 2.5;
    }
    async getAverageRiskLevel(portfolioId) {
        return 2.0;
    }
    async getVarBreachCount(portfolioId) {
        return 0;
    }
    async getAlertCount(portfolioId) {
        return 1;
    }
    onModuleDestroy() {
        for (const [portfolioId, interval] of this.monitoringIntervals) {
            clearInterval(interval);
        }
        this.monitoringIntervals.clear();
    }
};
exports.RealTimeMonitorService = RealTimeMonitorService;
__decorate([
    (0, schedule_1.Cron)('0 0 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RealTimeMonitorService.prototype, "generateDailyRiskSummary", null);
exports.RealTimeMonitorService = RealTimeMonitorService = RealTimeMonitorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(risk_data_entity_1.RiskDataEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], RealTimeMonitorService);
//# sourceMappingURL=real-time-monitor.service.js.map