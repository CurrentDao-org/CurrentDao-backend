import { Injectable, Logger } from '@nestjs/common';

export interface LocationData {
  latitude: number;
  longitude: number;
  gridDistance: number;
  populationDensity: number;
  infrastructureQuality: number;
  localDemand: number;
}

@Injectable()
export class LocationAdjustmentAlgorithm {
  private readonly logger = new Logger(LocationAdjustmentAlgorithm.name);

  private readonly locationDatabase: Map<string, LocationData> = new Map([
    {
      key: 'new-york',
      value: {
        latitude: 40.7128,
        longitude: -74.006,
        gridDistance: 50,
        populationDensity: 10000,
        infrastructureQuality: 0.9,
        localDemand: 1000,
      },
    },
    {
      key: 'london',
      value: {
        latitude: 51.5074,
        longitude: -0.1278,
        gridDistance: 30,
        populationDensity: 5700,
        infrastructureQuality: 0.85,
        localDemand: 800,
      },
    },
    {
      key: 'tokyo',
      value: {
        latitude: 35.6762,
        longitude: 139.6503,
        gridDistance: 20,
        populationDensity: 15000,
        infrastructureQuality: 0.95,
        localDemand: 1200,
      },
    },
    {
      key: 'berlin',
      value: {
        latitude: 52.52,
        longitude: 13.405,
        gridDistance: 40,
        populationDensity: 4000,
        infrastructureQuality: 0.8,
        localDemand: 600,
      },
    },
    {
      key: 'paris',
      value: {
        latitude: 48.8566,
        longitude: 2.3522,
        gridDistance: 35,
        populationDensity: 21000,
        infrastructureQuality: 0.88,
        localDemand: 900,
      },
    },
  ]);

  calculateLocationMultiplier(location: string): number {
    const locationData = this.getLocationData(location);

    if (!locationData) {
      this.logger.warn(
        `Location data not found for ${location}, using default multiplier`,
      );
      return 1.0;
    }

    const gridDistanceMultiplier = this.calculateGridDistanceMultiplier(
      locationData.gridDistance,
    );
    const populationDensityMultiplier =
      this.calculatePopulationDensityMultiplier(locationData.populationDensity);
    const infrastructureMultiplier = this.calculateInfrastructureMultiplier(
      locationData.infrastructureQuality,
    );
    const demandMultiplier = this.calculateLocalDemandMultiplier(
      locationData.localDemand,
    );

    const finalMultiplier =
      gridDistanceMultiplier *
      populationDensityMultiplier *
      infrastructureMultiplier *
      demandMultiplier;

    return Math.round(finalMultiplier * 100) / 100;
  }

  private getLocationData(location: string): LocationData | undefined {
    const normalizedLocation = location.toLowerCase().replace(/[\s_-]/g, '-');
    return this.locationDatabase.get(normalizedLocation);
  }

  private calculateGridDistanceMultiplier(distance: number): number {
    if (distance <= 20) return 0.9;
    if (distance <= 40) return 1.0;
    if (distance <= 60) return 1.1;
    if (distance <= 80) return 1.2;
    return 1.3;
  }

  private calculatePopulationDensityMultiplier(density: number): number {
    if (density >= 15000) return 1.3;
    if (density >= 10000) return 1.2;
    if (density >= 5000) return 1.1;
    if (density >= 2000) return 1.0;
    return 0.9;
  }

  private calculateInfrastructureMultiplier(quality: number): number {
    return 2.0 - quality;
  }

  private calculateLocalDemandMultiplier(demand: number): number {
    if (demand >= 1000) return 1.15;
    if (demand >= 800) return 1.1;
    if (demand >= 600) return 1.05;
    if (demand >= 400) return 1.0;
    return 0.95;
  }

  calculateDistanceBasedMultiplier(
    location1: string,
    location2: string,
  ): number {
    const data1 = this.getLocationData(location1);
    const data2 = this.getLocationData(location2);

    if (!data1 || !data2) {
      return 1.0;
    }

    const distance = this.calculateDistance(data1, data2);

    if (distance <= 100) return 1.0;
    if (distance <= 500) return 1.05;
    if (distance <= 1000) return 1.1;
    if (distance <= 2000) return 1.2;
    return 1.3;
  }

  private calculateDistance(loc1: LocationData, loc2: LocationData): number {
    const R = 6371;
    const dLat = this.toRadians(loc2.latitude - loc1.latitude);
    const dLon = this.toRadians(loc2.longitude - loc1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(loc1.latitude)) *
        Math.cos(this.toRadians(loc2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  addLocationData(location: string, data: LocationData): void {
    const normalizedLocation = location.toLowerCase().replace(/[\s_-]/g, '-');
    this.locationDatabase.set(normalizedLocation, data);
  }
}
