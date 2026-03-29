import { Coordinates, DistanceAlgorithm } from './distance.algorithm';
import { GridZone } from '../entities/grid-zone.entity';

export interface ZoneMappingResult {
  zone: GridZone | null;
  isExactMatch: boolean;
  nearestZone?: GridZone;
  distanceToNearest?: number;
}

export class ZoneMappingAlgorithm {
  /**
   * Find the grid zone for a given coordinate
   */
  static findZoneForCoordinate(
    coordinate: Coordinates,
    gridZones: GridZone[],
  ): ZoneMappingResult {
    let exactZone: GridZone | null = null;
    let nearestZone: GridZone | null = null;
    let minDistance = Infinity;

    for (const zone of gridZones) {
      // Check if point is within zone boundaries
      if (this.isCoordinateInZone(coordinate, zone)) {
        exactZone = zone;
        break;
      }

      // Calculate distance to zone centroid for nearest zone
      const centroid = this.calculateZoneCentroid(zone);
      const distance = DistanceAlgorithm.calculateDistance(
        coordinate,
        centroid,
        'km',
      ).distance;

      if (distance < minDistance) {
        minDistance = distance;
        nearestZone = zone;
      }
    }

    return {
      zone: exactZone,
      isExactMatch: exactZone !== null,
      nearestZone: nearestZone || undefined,
      distanceToNearest: minDistance === Infinity ? undefined : minDistance,
    };
  }

  /**
   * Find all zones within a given radius from a coordinate
   */
  static findZonesWithinRadius(
    coordinate: Coordinates,
    gridZones: GridZone[],
    radiusKm: number,
  ): GridZone[] {
    const zonesWithinRadius: GridZone[] = [];

    for (const zone of gridZones) {
      const centroid = this.calculateZoneCentroid(zone);
      const distance = DistanceAlgorithm.calculateDistance(
        coordinate,
        centroid,
        'km',
      ).distance;

      if (distance <= radiusKm) {
        zonesWithinRadius.push(zone);
      }
    }

    return zonesWithinRadius;
  }

  /**
   * Calculate the centroid of a grid zone
   */
  static calculateZoneCentroid(zone: GridZone): Coordinates {
    const coordinates = zone.boundaries.coordinates;

    if (zone.boundaries.type === 'Polygon') {
      const polygonCoordinates = coordinates as number[][][];
      return this.calculatePolygonCentroid(polygonCoordinates[0]);
    } else if (zone.boundaries.type === 'MultiPolygon') {
      // For MultiPolygon, calculate the centroid of the first polygon
      // In a real implementation, you might want to calculate the centroid
      // of all polygons weighted by area
      const multipolygonCoordinates = coordinates as number[][][][];
      return this.calculatePolygonCentroid(multipolygonCoordinates[0][0]);
    }

    throw new Error('Unsupported boundary type');
  }

  /**
   * Calculate the area of a grid zone (in square kilometers)
   */
  static calculateZoneArea(zone: GridZone): number {
    const coordinates = zone.boundaries.coordinates;
    let totalArea = 0;

    if (zone.boundaries.type === 'Polygon') {
      const polygonCoordinates = coordinates as number[][][];
      totalArea = this.calculatePolygonArea(polygonCoordinates[0]);
    } else if (zone.boundaries.type === 'MultiPolygon') {
      const multipolygonCoordinates = coordinates as number[][][][];
      for (const polygon of multipolygonCoordinates) {
        totalArea += this.calculatePolygonArea(polygon[0]);
      }
    }

    return totalArea;
  }

  /**
   * Check if a coordinate is within a zone's boundaries
   */
  private static isCoordinateInZone(
    coordinate: Coordinates,
    zone: GridZone,
  ): boolean {
    const coordinates = zone.boundaries.coordinates;

    if (zone.boundaries.type === 'Polygon') {
      const polygonCoordinates = coordinates as number[][][];
      return DistanceAlgorithm.isPointInPolygon(
        coordinate,
        polygonCoordinates[0],
      );
    } else if (zone.boundaries.type === 'MultiPolygon') {
      const multipolygonCoordinates = coordinates as number[][][][];
      // Check if point is in any of the polygons
      for (const polygon of multipolygonCoordinates) {
        if (DistanceAlgorithm.isPointInPolygon(coordinate, polygon[0])) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculate the centroid of a polygon
   */
  private static calculatePolygonCentroid(polygon: number[][]): Coordinates {
    let sumLat = 0;
    let sumLon = 0;
    const numPoints = polygon.length - 1; // Last point is same as first

    for (let i = 0; i < numPoints; i++) {
      sumLon += polygon[i][0];
      sumLat += polygon[i][1];
    }

    return {
      latitude: sumLat / numPoints,
      longitude: sumLon / numPoints,
    };
  }

  /**
   * Calculate the area of a polygon using the Shoelace formula
   * Returns area in square degrees (approximate)
   */
  private static calculatePolygonArea(polygon: number[][]): number {
    let area = 0;
    const numPoints = polygon.length - 1; // Last point is same as first

    for (let i = 0; i < numPoints; i++) {
      const j = (i + 1) % numPoints;
      area += polygon[i][0] * polygon[j][1];
      area -= polygon[j][0] * polygon[i][1];
    }

    return Math.abs(area) / 2;
  }

  /**
   * Get adjacent zones (zones that share boundaries)
   */
  static getAdjacentZones(zone: GridZone, allZones: GridZone[]): GridZone[] {
    const adjacentZones: GridZone[] = [];
    const zoneCentroid = this.calculateZoneCentroid(zone);

    for (const otherZone of allZones) {
      if (otherZone.id === zone.id) continue;

      const otherCentroid = this.calculateZoneCentroid(otherZone);
      const distance = DistanceAlgorithm.calculateDistance(
        zoneCentroid,
        otherCentroid,
        'km',
      ).distance;

      // Adjacent zones are typically within 50km of each other
      if (distance <= 50) {
        // Additional check: verify if zones actually share boundaries
        if (this.doZonesShareBoundary(zone, otherZone)) {
          adjacentZones.push(otherZone);
        }
      }
    }

    return adjacentZones;
  }

  /**
   * Check if two zones share boundaries (simplified implementation)
   */
  private static doZonesShareBoundary(
    zone1: GridZone,
    zone2: GridZone,
  ): boolean {
    // This is a simplified check - in a real implementation,
    // you would perform geometric intersection tests
    const centroid1 = this.calculateZoneCentroid(zone1);
    const centroid2 = this.calculateZoneCentroid(zone2);
    const distance = DistanceAlgorithm.calculateDistance(
      centroid1,
      centroid2,
      'km',
    ).distance;

    // If centroids are very close, zones likely share boundaries
    return distance < 20; // 20km threshold
  }
}
