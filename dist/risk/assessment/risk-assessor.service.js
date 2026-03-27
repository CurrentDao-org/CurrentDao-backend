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
var RiskAssessorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskAssessorService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const risk_data_entity_1 = require("../entities/risk-data.entity");
const risk_assessment_dto_1 = require("../dto/risk-assessment.dto");
let RiskAssessorService = RiskAssessorService_1 = class RiskAssessorService {
    constructor(riskDataRepository) {
        this.riskDataRepository = riskDataRepository;
        this.logger = new common_1.Logger(RiskAssessorService_1.name);
    }
    async assessRisk(riskAssessmentDto) {
        this.logger.log(`Starting risk assessment for portfolio: ${riskAssessmentDto.portfolioId}`);
        const riskLevel = await this.calculateRiskLevel(riskAssessmentDto);
        const riskScore = await this.calculateRiskScore(riskAssessmentDto, riskLevel);
        const riskData = this.riskDataRepository.create({
            portfolioId: riskAssessmentDto.portfolioId,
            riskType: riskAssessmentDto.riskType,
            riskLevel: riskScore,
            varValue: 0,
            varConfidence: 0.95,
            stressTestResult: {},
            hedgingStrategy: {},
            mitigationActions: await this.generateMitigationActions(riskLevel, riskAssessmentDto.riskType),
            complianceStatus: 'pending',
            createdBy: 'risk-assessor',
        });
        const savedRiskData = await this.riskDataRepository.save(riskData);
        this.logger.log(`Risk assessment completed for portfolio: ${riskAssessmentDto.portfolioId}, Risk Level: ${riskLevel}`);
        return savedRiskData;
    }
    async calculateRiskLevel(riskAssessmentDto) {
        const { portfolioValue, riskType, marketData, historicalData } = riskAssessmentDto;
        let riskScore = 0;
        switch (riskType) {
            case risk_assessment_dto_1.RiskType.MARKET:
                riskScore = await this.calculateMarketRisk(portfolioValue, marketData);
                break;
            case risk_assessment_dto_1.RiskType.CREDIT:
                riskScore = await this.calculateCreditRisk(portfolioValue, historicalData);
                break;
            case risk_assessment_dto_1.RiskType.OPERATIONAL:
                riskScore = await this.calculateOperationalRisk(portfolioValue);
                break;
            case risk_assessment_dto_1.RiskType.LIQUIDITY:
                riskScore = await this.calculateLiquidityRisk(portfolioValue);
                break;
            case risk_assessment_dto_1.RiskType.REGULATORY:
                riskScore = await this.calculateRegulatoryRisk(portfolioValue);
                break;
            default:
                riskScore = 2;
        }
        if (riskScore <= 1.5)
            return risk_assessment_dto_1.RiskLevel.LOW;
        if (riskScore <= 2.5)
            return risk_assessment_dto_1.RiskLevel.MEDIUM;
        if (riskScore <= 3.5)
            return risk_assessment_dto_1.RiskLevel.HIGH;
        return risk_assessment_dto_1.RiskLevel.CRITICAL;
    }
    async calculateRiskScore(riskAssessmentDto, riskLevel) {
        return riskLevel;
    }
    async calculateMarketRisk(portfolioValue, marketData) {
        const volatility = marketData?.['volatility'] || 0.2;
        const beta = marketData?.['beta'] || 1.0;
        const riskScore = (volatility * beta * Math.log(portfolioValue / 1000000)) / 2;
        return Math.max(1, Math.min(4, riskScore));
    }
    async calculateCreditRisk(portfolioValue, historicalData) {
        const defaultRate = historicalData?.['defaultRate'] || 0.02;
        const recoveryRate = historicalData?.['recoveryRate'] || 0.4;
        const riskScore = (defaultRate * (1 - recoveryRate) * Math.log(portfolioValue / 1000000)) /
            1.5;
        return Math.max(1, Math.min(4, riskScore));
    }
    async calculateOperationalRisk(portfolioValue) {
        const complexityFactor = Math.log(portfolioValue / 1000000) / 10;
        const riskScore = 1.5 + complexityFactor;
        return Math.max(1, Math.min(4, riskScore));
    }
    async calculateLiquidityRisk(portfolioValue) {
        const sizeFactor = Math.log(portfolioValue / 1000000) / 8;
        const riskScore = 1.2 + sizeFactor;
        return Math.max(1, Math.min(4, riskScore));
    }
    async calculateRegulatoryRisk(portfolioValue) {
        const jurisdictionFactor = 1.5;
        const riskScore = jurisdictionFactor;
        return Math.max(1, Math.min(4, riskScore));
    }
    async generateMitigationActions(riskLevel, riskType) {
        const actions = [];
        switch (riskLevel) {
            case risk_assessment_dto_1.RiskLevel.LOW:
                actions.push('Regular monitoring');
                actions.push('Quarterly review');
                break;
            case risk_assessment_dto_1.RiskLevel.MEDIUM:
                actions.push('Increased monitoring frequency');
                actions.push('Implement basic hedging');
                actions.push('Monthly review');
                break;
            case risk_assessment_dto_1.RiskLevel.HIGH:
                actions.push('Daily monitoring');
                actions.push('Advanced hedging strategies');
                actions.push('Risk committee review');
                actions.push('Contingency planning');
                break;
            case risk_assessment_dto_1.RiskLevel.CRITICAL:
                actions.push('Real-time monitoring');
                actions.push('Immediate hedging');
                actions.push('Emergency response team');
                actions.push('Position reduction');
                actions.push('Senior management notification');
                break;
        }
        switch (riskType) {
            case risk_assessment_dto_1.RiskType.MARKET:
                actions.push('Diversification review');
                actions.push('Derivatives hedging');
                break;
            case risk_assessment_dto_1.RiskType.CREDIT:
                actions.push('Credit enhancement');
                actions.push('Collateral management');
                break;
            case risk_assessment_dto_1.RiskType.OPERATIONAL:
                actions.push('Process review');
                actions.push('System redundancy');
                break;
            case risk_assessment_dto_1.RiskType.LIQUIDITY:
                actions.push('Cash reserve optimization');
                actions.push('Credit line management');
                break;
            case risk_assessment_dto_1.RiskType.REGULATORY:
                actions.push('Compliance review');
                actions.push('Documentation update');
                break;
        }
        return {
            actions,
            priority: riskLevel,
            implementation: this.getImplementationTimeline(riskLevel),
        };
    }
    getImplementationTimeline(riskLevel) {
        switch (riskLevel) {
            case risk_assessment_dto_1.RiskLevel.LOW:
                return '30 days';
            case risk_assessment_dto_1.RiskLevel.MEDIUM:
                return '14 days';
            case risk_assessment_dto_1.RiskLevel.HIGH:
                return '7 days';
            case risk_assessment_dto_1.RiskLevel.CRITICAL:
                return '24 hours';
            default:
                return '30 days';
        }
    }
    async getRiskAssessment(portfolioId) {
        return this.riskDataRepository.find({
            where: { portfolioId },
            order: { createdAt: 'DESC' },
        });
    }
    async updateRiskAssessment(id, updates) {
        await this.riskDataRepository.update(id, updates);
        return this.riskDataRepository.findOne({ where: { id } });
    }
};
exports.RiskAssessorService = RiskAssessorService;
exports.RiskAssessorService = RiskAssessorService = RiskAssessorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(risk_data_entity_1.RiskDataEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], RiskAssessorService);
//# sourceMappingURL=risk-assessor.service.js.map