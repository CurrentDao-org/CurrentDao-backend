import { Proposal } from './entities/proposal.entity';
export interface CreateProposalDto {
    title: string;
    description: string;
    location: string;
    amount: number;
    proposerId: string;
}
export interface VoteDto {
    userId: string;
    support: boolean;
}
export declare class DaoService {
    private readonly proposals;
    findAll(): Promise<Proposal[]>;
    findOne(id: string): Promise<Proposal | null>;
    create(createProposalDto: CreateProposalDto): Promise<Proposal>;
    vote(id: string, userId: string, support: boolean): Promise<Proposal | null>;
    finalize(id: string): Promise<Proposal | null>;
    getActiveProposals(): Promise<Proposal[]>;
}
