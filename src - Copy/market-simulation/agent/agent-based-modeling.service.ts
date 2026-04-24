import { Injectable } from '@nestjs/common';

@Injectable()
export class AgentBasedModelingService {
  async simulateAgents(participants: number, behavior: string) {
    return {
      participants,
      behavior,
      activeAgents: Math.min(participants, 10000),
      networkEffects: behavior === 'competitive' ? 'increased volatility' : 'stabilizing liquidity',
      completedAt: new Date().toISOString(),
    };
  }
}
