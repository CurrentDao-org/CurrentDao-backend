import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmissionCalculatorService {
  private readonly logger = new Logger(EmissionCalculatorService.name);

  // ISO 14064 compliant emission factors (kg CO2e per unit)
  private readonly emissionFactors = {
    solar: 0.048,
    wind: 0.011,
    natural_gas: 0.49,
    coal: 0.82,
    grid_average: 0.233, // kg CO2e per kWh
    transportation: 0.171, // kg CO2e per km
  };

  calculateEmissions(
    activityData: number,
    sourceType: string,
    customFactor?: number,
  ): { emissions: number; unit: string; factor: number } {
    this.logger.log(`Calculating emissions for ${sourceType}`);

    const factor = customFactor || this.getEmissionFactor(sourceType);
    const emissions = activityData * factor;

    return {
      emissions,
      unit: 'kg CO2e',
      factor,
    };
  }

  calculateTransactionCarbonFootprint(transactionData: any): { emissions: number; intensity: number } {
    const { energyAmount, energySource, distance } = transactionData;

    // Calculate production emissions
    const productionEmissions = this.calculateEmissions(energyAmount, energySource).emissions;

    // Calculate transportation emissions if applicable
    const transportEmissions = distance ? this.calculateEmissions(distance, 'transportation').emissions : 0;

    const totalEmissions = productionEmissions + transportEmissions;
    const intensity = energyAmount > 0 ? totalEmissions / energyAmount : 0;

    return {
      emissions: totalEmissions,
      intensity,
    };
  }

  private getEmissionFactor(sourceType: string): number {
    return this.emissionFactors[sourceType] || this.emissionFactors.grid_average;
  }

  validateCalculation(activityData: number, factor: number): boolean {
    // ISO 14064 validation checks
    return activityData > 0 && factor > 0 && factor < 10;
  }
}
