import { Injectable } from '@nestjs/common';
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

@Injectable()
export class DaoService {
  private readonly proposals: Proposal[] = [];

  async findAll(): Promise<Proposal[]> {
    return this.proposals;
  }

  async findOne(id: string): Promise<Proposal | null> {
    return this.proposals.find((proposal) => proposal.id === id) || null;
  }

  async create(createProposalDto: CreateProposalDto): Promise<Proposal> {
    const proposal: Proposal = {
      id: Date.now().toString(),
      title: createProposalDto.title,
      description: createProposalDto.description,
      location: createProposalDto.location,
      amount: createProposalDto.amount,
      proposerId: createProposalDto.proposerId,
      votesFor: 0,
      votesAgainst: 0,
      status: 'active',
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.proposals.push(proposal);
    return proposal;
  }

  async vote(
    id: string,
    userId: string,
    support: boolean,
  ): Promise<Proposal | null> {
    const proposal = this.proposals.find((p) => p.id === id);
    if (proposal && proposal.status === 'active') {
      if (support) {
        proposal.votesFor++;
      } else {
        proposal.votesAgainst++;
      }
      proposal.updatedAt = new Date();
    }
    return proposal || null;
  }

  async finalize(id: string): Promise<Proposal | null> {
    const proposal = this.proposals.find((p) => p.id === id);
    if (proposal) {
      const totalVotes = proposal.votesFor + proposal.votesAgainst;
      proposal.status =
        proposal.votesFor > proposal.votesAgainst ? 'passed' : 'rejected';
      proposal.updatedAt = new Date();
    }
    return proposal || null;
  }

  async getActiveProposals(): Promise<Proposal[]> {
    return this.proposals.filter((proposal) => proposal.status === 'active');
  }
}
