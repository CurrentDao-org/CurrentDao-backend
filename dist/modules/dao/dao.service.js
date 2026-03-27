"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DaoService = void 0;
const common_1 = require("@nestjs/common");
let DaoService = class DaoService {
    constructor() {
        this.proposals = [];
    }
    async findAll() {
        return this.proposals;
    }
    async findOne(id) {
        return this.proposals.find((proposal) => proposal.id === id) || null;
    }
    async create(createProposalDto) {
        const proposal = {
            id: Date.now().toString(),
            title: createProposalDto.title,
            description: createProposalDto.description,
            location: createProposalDto.location,
            amount: createProposalDto.amount,
            proposerId: createProposalDto.proposerId,
            votesFor: 0,
            votesAgainst: 0,
            status: 'active',
            endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.proposals.push(proposal);
        return proposal;
    }
    async vote(id, userId, support) {
        const proposal = this.proposals.find((p) => p.id === id);
        if (proposal && proposal.status === 'active') {
            if (support) {
                proposal.votesFor++;
            }
            else {
                proposal.votesAgainst++;
            }
            proposal.updatedAt = new Date();
        }
        return proposal || null;
    }
    async finalize(id) {
        const proposal = this.proposals.find((p) => p.id === id);
        if (proposal) {
            const totalVotes = proposal.votesFor + proposal.votesAgainst;
            proposal.status =
                proposal.votesFor > proposal.votesAgainst ? 'passed' : 'rejected';
            proposal.updatedAt = new Date();
        }
        return proposal || null;
    }
    async getActiveProposals() {
        return this.proposals.filter((proposal) => proposal.status === 'active');
    }
};
exports.DaoService = DaoService;
exports.DaoService = DaoService = __decorate([
    (0, common_1.Injectable)()
], DaoService);
//# sourceMappingURL=dao.service.js.map