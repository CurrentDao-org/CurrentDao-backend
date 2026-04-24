import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CarbonOffsetService {
  private readonly logger = new Logger(CarbonOffsetService.name);

  async purchaseOffset(
    amountTonnes: number,
    projectType: string,
  ): Promise<any> {
    this.logger.log(
      `Purchasing ${amountTonnes} tonnes of ${projectType} offsets`,
    );

    return {
      offsetId: `OFFSET-${Date.now()}`,
      amount: amountTonnes,
      projectType,
      cost: amountTonnes * 25, // $25 per tonne
      retirementDate: new Date(),
      certification: 'Gold Standard',
    };
  }

  async getAvailableProjects(): Promise<any[]> {
    return [
      {
        id: 1,
        name: 'Solar Farm India',
        type: 'renewable_energy',
        pricePerTonne: 22,
      },
      {
        id: 2,
        name: 'Reforestation Brazil',
        type: 'forestry',
        pricePerTonne: 18,
      },
      {
        id: 3,
        name: 'Wind Farm Scotland',
        type: 'renewable_energy',
        pricePerTonne: 24,
      },
    ];
  }

  async calculateOffsetRequirement(emissions: number): Promise<number> {
    return emissions / 1000; // Convert kg to tonnes
  }
}
