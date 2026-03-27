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
exports.JobQueryDto = exports.EmergencyStopDto = exports.BulkScheduleDto = exports.UpdateScheduleDto = exports.ScheduleTradeDto = exports.SchedulingDto = exports.ResourceLimitsDto = exports.JobDependencyDto = exports.JobNotificationDto = exports.ExecutionContextDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
const scheduled_job_entity_1 = require("../entities/scheduled-job.entity");
class ExecutionContextDto {
}
exports.ExecutionContextDto = ExecutionContextDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'America/New_York' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExecutionContextDto.prototype, "timeZone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'en-US' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExecutionContextDto.prototype, "locale", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'production' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExecutionContextDto.prototype, "environment", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'v1.2.3' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExecutionContextDto.prototype, "version", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'node-01' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExecutionContextDto.prototype, "nodeId", void 0);
class JobNotificationDto {
}
exports.JobNotificationDto = JobNotificationDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], JobNotificationDto.prototype, "onSuccess", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], JobNotificationDto.prototype, "onFailure", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], JobNotificationDto.prototype, "onRetry", void 0);
class JobDependencyDto {
}
exports.JobDependencyDto = JobDependencyDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['job-uuid-1', 'job-uuid-2'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], JobDependencyDto.prototype, "jobIds", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], JobDependencyDto.prototype, "conditions", void 0);
class ResourceLimitsDto {
}
exports.ResourceLimitsDto = ResourceLimitsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1024 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(64),
    __metadata("design:type", Number)
], ResourceLimitsDto.prototype, "maxMemory", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 80 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], ResourceLimitsDto.prototype, "maxCpu", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 5 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ResourceLimitsDto.prototype, "maxConcurrentJobs", void 0);
class SchedulingDto {
}
exports.SchedulingDto = SchedulingDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SchedulingDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SchedulingDto.prototype, "isRecurring", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-12-31T23:59:59.000Z' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], SchedulingDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], SchedulingDto.prototype, "maxRuns", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SchedulingDto.prototype, "skipIfRunning", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['allow', 'forbid', 'replace'], example: 'forbid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['allow', 'forbid', 'replace']),
    __metadata("design:type", String)
], SchedulingDto.prototype, "concurrency", void 0);
class ScheduleTradeDto {
}
exports.ScheduleTradeDto = ScheduleTradeDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Execute Trade #12345' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScheduleTradeDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Scheduled execution for trade settlement' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScheduleTradeDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: scheduled_job_entity_1.JobType, example: scheduled_job_entity_1.JobType.TRADE_EXECUTION }),
    (0, class_validator_1.IsEnum)(scheduled_job_entity_1.JobType),
    __metadata("design:type", String)
], ScheduleTradeDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: scheduled_job_entity_1.JobPriority, example: scheduled_job_entity_1.JobPriority.HIGH }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(scheduled_job_entity_1.JobPriority),
    __metadata("design:type", Number)
], ScheduleTradeDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '0 15 14 * * 1-5' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScheduleTradeDto.prototype, "cronExpression", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-02-20T14:15:00.000Z' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ScheduleTradeDto.prototype, "scheduledAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], ScheduleTradeDto.prototype, "parameters", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: scheduled_job_entity_1.RetryStrategy, example: scheduled_job_entity_1.RetryStrategy.EXPONENTIAL_BACKOFF }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(scheduled_job_entity_1.RetryStrategy),
    __metadata("design:type", String)
], ScheduleTradeDto.prototype, "retryStrategy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 3 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(10),
    __metadata("design:type", Number)
], ScheduleTradeDto.prototype, "maxRetries", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 5.0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.1),
    __metadata("design:type", Number)
], ScheduleTradeDto.prototype, "retryDelay", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 300 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(30),
    (0, class_validator_1.Max)(3600),
    __metadata("design:type", Number)
], ScheduleTradeDto.prototype, "timeoutSeconds", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ExecutionContextDto),
    __metadata("design:type", ExecutionContextDto)
], ScheduleTradeDto.prototype, "executionContext", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => JobDependencyDto),
    __metadata("design:type", JobDependencyDto)
], ScheduleTradeDto.prototype, "dependencies", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => JobNotificationDto),
    __metadata("design:type", JobNotificationDto)
], ScheduleTradeDto.prototype, "notifications", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ResourceLimitsDto),
    __metadata("design:type", ResourceLimitsDto)
], ScheduleTradeDto.prototype, "resourceLimits", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => SchedulingDto),
    __metadata("design:type", SchedulingDto)
], ScheduleTradeDto.prototype, "scheduling", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['urgent', 'settlement', 'batch-1'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], ScheduleTradeDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ScheduleTradeDto.prototype, "marketHoursOnly", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'America/New_York' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScheduleTradeDto.prototype, "timeZone", void 0);
class UpdateScheduleDto {
}
exports.UpdateScheduleDto = UpdateScheduleDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Updated Trade Execution' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateScheduleDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Updated description' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateScheduleDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: scheduled_job_entity_1.JobPriority, example: scheduled_job_entity_1.JobPriority.CRITICAL }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(scheduled_job_entity_1.JobPriority),
    __metadata("design:type", Number)
], UpdateScheduleDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '0 30 15 * * 1-5' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateScheduleDto.prototype, "cronExpression", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-02-20T15:30:00.000Z' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateScheduleDto.prototype, "scheduledAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpdateScheduleDto.prototype, "parameters", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateScheduleDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 5 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(10),
    __metadata("design:type", Number)
], UpdateScheduleDto.prototype, "maxRetries", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 600 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(30),
    (0, class_validator_1.Max)(3600),
    __metadata("design:type", Number)
], UpdateScheduleDto.prototype, "timeoutSeconds", void 0);
class BulkScheduleDto {
}
exports.BulkScheduleDto = BulkScheduleDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: [ScheduleTradeDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ScheduleTradeDto),
    __metadata("design:type", Array)
], BulkScheduleDto.prototype, "jobs", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'batch-trade-execution' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkScheduleDto.prototype, "batchName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Bulk trade execution for settlement batch' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkScheduleDto.prototype, "batchDescription", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], BulkScheduleDto.prototype, "executeSequentially", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 30 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(300),
    __metadata("design:type", Number)
], BulkScheduleDto.prototype, "delayBetweenJobs", void 0);
class EmergencyStopDto {
}
exports.EmergencyStopDto = EmergencyStopDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Critical system maintenance' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmergencyStopDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['all', 'type', 'priority', 'specific'], example: 'all' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['all', 'type', 'priority', 'specific']),
    __metadata("design:type", String)
], EmergencyStopDto.prototype, "scope", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: [scheduled_job_entity_1.JobType.TRADE_EXECUTION, scheduled_job_entity_1.JobType.SETTLEMENT] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(scheduled_job_entity_1.JobType, { each: true }),
    __metadata("design:type", Array)
], EmergencyStopDto.prototype, "jobTypes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: [scheduled_job_entity_1.JobPriority.CRITICAL, scheduled_job_entity_1.JobPriority.EMERGENCY] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(scheduled_job_entity_1.JobPriority, { each: true }),
    __metadata("design:type", Array)
], EmergencyStopDto.prototype, "priorities", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['job-uuid-1', 'job-uuid-2'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], EmergencyStopDto.prototype, "jobIds", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], EmergencyStopDto.prototype, "allowRestart", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-02-20T18:00:00.000Z' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], EmergencyStopDto.prototype, "restartAt", void 0);
class JobQueryDto {
}
exports.JobQueryDto = JobQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: scheduled_job_entity_1.JobType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(scheduled_job_entity_1.JobType),
    __metadata("design:type", String)
], JobQueryDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'retrying'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['pending', 'running', 'completed', 'failed', 'cancelled', 'retrying']),
    __metadata("design:type", String)
], JobQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: scheduled_job_entity_1.JobPriority }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(scheduled_job_entity_1.JobPriority),
    __metadata("design:type", Number)
], JobQueryDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'trade-123' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], JobQueryDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'user-uuid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], JobQueryDto.prototype, "createdBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['urgent', 'batch-1'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], JobQueryDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-02-20T00:00:00.000Z' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], JobQueryDto.prototype, "scheduledAfter", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-02-20T23:59:59.000Z' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], JobQueryDto.prototype, "scheduledBefore", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], JobQueryDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], JobQueryDto.prototype, "isEmergencyStop", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], JobQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], JobQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['createdAt', 'scheduledAt', 'priority', 'status'], example: 'scheduledAt' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['createdAt', 'scheduledAt', 'priority', 'status']),
    __metadata("design:type", String)
], JobQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['ASC', 'DESC'], example: 'ASC' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['ASC', 'DESC']),
    __metadata("design:type", String)
], JobQueryDto.prototype, "sortOrder", void 0);
//# sourceMappingURL=schedule-trade.dto.js.map