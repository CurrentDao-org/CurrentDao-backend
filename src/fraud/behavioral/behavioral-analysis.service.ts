import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BehavioralAnalysisService {
  private readonly logger = new Logger(BehavioralAnalysisService.name);
  private readonly profiles = new Map<string, Record<string, any>>();

  async score(userId: string, transaction: Record<string, any>): Promise<number> {
    const profile = this.profiles.get(userId) || { avgAmount: 0, transactionCount: 0 };

    const deviation =
      profile.avgAmount > 0
        ? Math.abs(transaction.amount - profile.avgAmount) / profile.avgAmount
        : 0;

    // Update rolling profile
    profile.transactionCount++;
    profile.avgAmount =
      (profile.avgAmount * (profile.transactionCount - 1) + transaction.amount) /
      profile.transactionCount;
    this.profiles.set(userId, profile);

    return Math.min(deviation, 1); // 0 = normal, 1 = highly anomalous
  }
}