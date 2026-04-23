import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

interface FraudCase {
  id: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
  data: Record<string, any>;
  resolution?: Record<string, any>;
}

@Injectable()
export class CaseManagementService {
  private readonly logger = new Logger(CaseManagementService.name);
  private readonly cases = new Map<string, FraudCase>();

  async openCase(data: Record<string, any>): Promise<FraudCase> {
    const fraudCase: FraudCase = {
      id: uuidv4(),
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      data,
    };
    this.cases.set(fraudCase.id, fraudCase);
    this.logger.warn(`Fraud case opened: ${fraudCase.id}`);
    return fraudCase;
  }

  async getCases(status?: string): Promise<FraudCase[]> {
    const all = Array.from(this.cases.values());
    return status ? all.filter(c => c.status === status) : all;
  }

  async getCaseById(id: string): Promise<FraudCase | null> {
    return this.cases.get(id) || null;
  }

  async resolveCase(id: string, resolution: Record<string, any>): Promise<FraudCase> {
    const c = this.cases.get(id);
    if (!c) throw new Error(`Case ${id} not found`);
    c.status = 'resolved';
    c.resolution = resolution;
    c.updatedAt = new Date();
    return c;
  }

  async getStats() {
    const all = Array.from(this.cases.values());
    return {
      total: all.length,
      open: all.filter(c => c.status === 'open').length,
      resolved: all.filter(c => c.status === 'resolved').length,
    };
  }
}