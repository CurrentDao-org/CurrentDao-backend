export interface Proposal {
  id: string;
  title: string;
  description: string;
  location: string;
  amount: number;
  proposerId: string;
  votesFor: number;
  votesAgainst: number;
  status: 'active' | 'passed' | 'rejected';
  endTime: Date;
  createdAt: Date;
  updatedAt: Date;
}
