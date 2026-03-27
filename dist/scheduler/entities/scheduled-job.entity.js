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
exports.ScheduledJob = exports.RetryStrategy = exports.JobPriority = exports.JobStatus = exports.JobType = void 0;
const typeorm_1 = require("typeorm");
var JobType;
(function (JobType) {
    JobType["TRADE_EXECUTION"] = "trade_execution";
    JobType["SETTLEMENT"] = "settlement";
    JobType["MAINTENANCE"] = "maintenance";
    JobType["MARKET_OPEN"] = "market_open";
    JobType["MARKET_CLOSE"] = "market_close";
    JobType["DATA_CLEANUP"] = "data_cleanup";
    JobType["REPORT_GENERATION"] = "report_generation";
    JobType["NOTIFICATION"] = "notification";
})(JobType || (exports.JobType = JobType = {}));
var JobStatus;
(function (JobStatus) {
    JobStatus["PENDING"] = "pending";
    JobStatus["RUNNING"] = "running";
    JobStatus["COMPLETED"] = "completed";
    JobStatus["FAILED"] = "failed";
    JobStatus["CANCELLED"] = "cancelled";
    JobStatus["RETRYING"] = "retrying";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
var JobPriority;
(function (JobPriority) {
    JobPriority[JobPriority["LOW"] = 1] = "LOW";
    JobPriority[JobPriority["MEDIUM"] = 2] = "MEDIUM";
    JobPriority[JobPriority["HIGH"] = 3] = "HIGH";
    JobPriority[JobPriority["CRITICAL"] = 4] = "CRITICAL";
    JobPriority[JobPriority["EMERGENCY"] = 5] = "EMERGENCY";
})(JobPriority || (exports.JobPriority = JobPriority = {}));
var RetryStrategy;
(function (RetryStrategy) {
    RetryStrategy["IMMEDIATE"] = "immediate";
    RetryStrategy["EXPONENTIAL_BACKOFF"] = "exponential_backoff";
    RetryStrategy["LINEAR_BACKOFF"] = "linear_backoff";
    RetryStrategy["FIXED_INTERVAL"] = "fixed_interval";
})(RetryStrategy || (exports.RetryStrategy = RetryStrategy = {}));
let ScheduledJob = class ScheduledJob {
};
exports.ScheduledJob = ScheduledJob;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ScheduledJob.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], ScheduledJob.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ScheduledJob.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: JobType,
    }),
    __metadata("design:type", String)
], ScheduledJob.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: JobStatus,
        default: JobStatus.PENDING,
    }),
    __metadata("design:type", String)
], ScheduledJob.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: JobPriority,
        default: JobPriority.MEDIUM,
    }),
    __metadata("design:type", Number)
], ScheduledJob.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], ScheduledJob.prototype, "cronExpression", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'scheduled_at', type: 'datetime' }),
    __metadata("design:type", Date)
], ScheduledJob.prototype, "scheduledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'started_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], ScheduledJob.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], ScheduledJob.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'next_run_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], ScheduledJob.prototype, "nextRunAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_run_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], ScheduledJob.prototype, "lastRunAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ScheduledJob.prototype, "parameters", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ScheduledJob.prototype, "result", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ScheduledJob.prototype, "error", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: RetryStrategy,
        default: RetryStrategy.EXPONENTIAL_BACKOFF,
    }),
    __metadata("design:type", String)
], ScheduledJob.prototype, "retryStrategy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_retries', default: 3 }),
    __metadata("design:type", Number)
], ScheduledJob.prototype, "maxRetries", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'retry_count', default: 0 }),
    __metadata("design:type", Number)
], ScheduledJob.prototype, "retryCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'retry_delay', type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], ScheduledJob.prototype, "retryDelay", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'timeout_seconds', default: 300 }),
    __metadata("design:type", Number)
], ScheduledJob.prototype, "timeoutSeconds", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ScheduledJob.prototype, "executionContext", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ScheduledJob.prototype, "dependencies", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ScheduledJob.prototype, "notifications", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ScheduledJob.prototype, "metrics", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ScheduledJob.prototype, "scheduling", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ScheduledJob.prototype, "resourceLimits", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', nullable: true }),
    __metadata("design:type", String)
], ScheduledJob.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by', nullable: true }),
    __metadata("design:type", String)
], ScheduledJob.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'executed_by', nullable: true }),
    __metadata("design:type", String)
], ScheduledJob.prototype, "executedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_emergency_stop', default: false }),
    __metadata("design:type", Boolean)
], ScheduledJob.prototype, "isEmergencyStop", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'emergency_stop_reason', nullable: true }),
    __metadata("design:type", String)
], ScheduledJob.prototype, "emergencyStopReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'emergency_stopped_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], ScheduledJob.prototype, "emergencyStoppedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], ScheduledJob.prototype, "auditTrail", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], ScheduledJob.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], ScheduledJob.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_system_job', default: false }),
    __metadata("design:type", Boolean)
], ScheduledJob.prototype, "isSystemJob", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'market_hours_only', default: false }),
    __metadata("design:type", Boolean)
], ScheduledJob.prototype, "marketHoursOnly", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'time_zone', default: 'UTC' }),
    __metadata("design:type", String)
], ScheduledJob.prototype, "timeZone", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ScheduledJob.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], ScheduledJob.prototype, "updatedAt", void 0);
exports.ScheduledJob = ScheduledJob = __decorate([
    (0, typeorm_1.Entity)('scheduled_jobs')
], ScheduledJob);
//# sourceMappingURL=scheduled-job.entity.js.map