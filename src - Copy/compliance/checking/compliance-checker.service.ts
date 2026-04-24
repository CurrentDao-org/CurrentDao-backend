import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ComplianceCheckerService {
  private readonly supportedJurisdictions = ['US', 'EU', 'UK', 'CA', 'AU', 'JP', 'BR', 'IN'];

  async validateTransaction(transactionId: string, jurisdiction: string, data: Record<string, unknown>) {
    if (!this.supportedJurisdictions.includes(jurisdiction)) {
      throw new NotFoundException(`Jurisdiction ${jurisdiction} is not supported for compliance checks.`);
    }

    const issues = [] as string[];
    if (!data['amount'] || typeof data['amount'] !== 'number') {
      issues.push('Missing or invalid amount.');
    }
    if (!data['counterparty']) {
      issues.push('Counterparty information is required.');
    }

    return {
      transactionId,
      jurisdiction,
      compliant: issues.length === 0,
      issues,
      rulesChecked: ['sanctions', 'trade-controls', 'customer-identity'],
      timestamp: new Date().toISOString(),
    };
  }

  getSupportedJurisdictions(): string[] {
    return this.supportedJurisdictions;
  }
}
