"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchingModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const matching_service_1 = require("./matching.service");
const match_entity_1 = require("./entities/match.entity");
const matching_rule_entity_1 = require("./entities/matching-rule.entity");
const priority_matching_algorithm_1 = require("./algorithms/priority-matching.algorithm");
const geographic_matching_algorithm_1 = require("./algorithms/geographic-matching.algorithm");
const partial_fulfillment_algorithm_1 = require("./algorithms/partial-fulfillment.algorithm");
const audit_service_1 = require("./audit/audit.service");
const matching_events_service_1 = require("./events/matching-events.service");
let MatchingModule = class MatchingModule {
};
exports.MatchingModule = MatchingModule;
exports.MatchingModule = MatchingModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([match_entity_1.Match, matching_rule_entity_1.MatchingRule])],
        providers: [
            matching_service_1.MatchingService,
            priority_matching_algorithm_1.PriorityMatchingAlgorithm,
            geographic_matching_algorithm_1.GeographicMatchingAlgorithm,
            partial_fulfillment_algorithm_1.PartialFulfillmentAlgorithm,
            audit_service_1.AuditService,
            matching_events_service_1.MatchingEventsService,
        ],
        exports: [matching_service_1.MatchingService, audit_service_1.AuditService, matching_events_service_1.MatchingEventsService],
    })
], MatchingModule);
//# sourceMappingURL=matching.module.js.map