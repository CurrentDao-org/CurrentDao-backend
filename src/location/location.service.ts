import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { Location } from './entities/location.entity';
import { GridZone } from './entities/grid-zone.entity';
import {
  LocationSearchDto,
  LocationHeatmapDto,
} from './dto/location-search.dto';
import {
  DistanceAlgorithm,
  Coordinates,
} from './algorithms/distance.algorithm';
import { ZoneMappingAlgorithm } from './algorithms/zone-mapping.algorithm';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    @InjectRepository(GridZone)
    private gridZoneRepository: Repository<GridZone>,
  ) {}

  /**
   * Create a new location
   */
  async createLocation(locationData: Partial<Location>): Promise<Location> {
    // Validate coordinates
    if (locationData.latitude && locationData.longitude) {
      this.validateCoordinates(locationData.latitude, locationData.longitude);
    }

    // Auto-assign grid zone if not provided
    if (
      !locationData.gridZoneId &&
      locationData.latitude &&
      locationData.longitude
    ) {
      const zoneMapping = await this.findZoneForCoordinate({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
      });

      if (zoneMapping.zone) {
        locationData.gridZoneId = zoneMapping.zone.id;
        locationData.regionalPriceMultiplier =
          zoneMapping.zone.basePriceMultiplier;
      }
    }

    const location = this.locationRepository.create(locationData);
    return this.locationRepository.save(location);
  }

  /**
   * Update an existing location
   */
  async updateLocation(
    id: string,
    updateData: Partial<Location>,
  ): Promise<Location> {
    const location = await this.locationRepository.findOne({ where: { id } });
    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    // Validate coordinates if provided
    if (updateData.latitude && updateData.longitude) {
      this.validateCoordinates(updateData.latitude, updateData.longitude);
    }

    // Re-calculate grid zone if coordinates changed
    if (
      (updateData.latitude || updateData.longitude) &&
      (updateData.latitude !== location.latitude ||
        updateData.longitude !== location.longitude)
    ) {
      const zoneMapping = await this.findZoneForCoordinate({
        latitude: updateData.latitude || location.latitude,
        longitude: updateData.longitude || location.longitude,
      });

      if (zoneMapping.zone) {
        updateData.gridZoneId = zoneMapping.zone.id;
        updateData.regionalPriceMultiplier =
          zoneMapping.zone.basePriceMultiplier;
      }
    }

    Object.assign(location, updateData);
    return this.locationRepository.save(location);
  }

  /**
   * Get location by ID
   */
  async getLocation(id: string): Promise<Location> {
    const location = await this.locationRepository.findOne({
      where: { id },
      relations: ['gridZone'],
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    return location;
  }

  /**
   * Search locations based on criteria
   */
  async searchLocations(searchDto: LocationSearchDto): Promise<{
    locations: Location[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryBuilder = this.locationRepository
      .createQueryBuilder('location')
      .leftJoinAndSelect('location.gridZone', 'gridZone');

    // Apply filters
    if (searchDto.gridZoneId) {
      queryBuilder.andWhere('location.gridZoneId = :gridZoneId', {
        gridZoneId: searchDto.gridZoneId,
      });
    }

    if (searchDto.country) {
      queryBuilder.andWhere('location.country = :country', {
        country: searchDto.country,
      });
    }

    if (searchDto.state) {
      queryBuilder.andWhere('location.state = :state', {
        state: searchDto.state,
      });
    }

    if (searchDto.city) {
      queryBuilder.andWhere('location.city = :city', {
        city: searchDto.city,
      });
    }

    if (searchDto.minPriceMultiplier !== undefined) {
      queryBuilder.andWhere(
        'location.regionalPriceMultiplier >= :minPriceMultiplier',
        {
          minPriceMultiplier: searchDto.minPriceMultiplier,
        },
      );
    }

    if (searchDto.maxPriceMultiplier !== undefined) {
      queryBuilder.andWhere(
        'location.regionalPriceMultiplier <= :maxPriceMultiplier',
        {
          maxPriceMultiplier: searchDto.maxPriceMultiplier,
        },
      );
    }

    if (searchDto.isPublic !== undefined) {
      queryBuilder.andWhere('location.isPublic = :isPublic', {
        isPublic: searchDto.isPublic,
      });
    }

    // Location-based search
    if (searchDto.latitude && searchDto.longitude && searchDto.radiusKm) {
      const boundingBox = DistanceAlgorithm.getBoundingBox(
        { latitude: searchDto.latitude, longitude: searchDto.longitude },
        searchDto.radiusKm,
      );

      queryBuilder
        .andWhere('location.latitude BETWEEN :minLat AND :maxLat', {
          minLat: boundingBox.minLat,
          maxLat: boundingBox.maxLat,
        })
        .andWhere('location.longitude BETWEEN :minLon AND :maxLon', {
          minLon: boundingBox.minLon,
          maxLon: boundingBox.maxLon,
        });
    }

    // Apply sorting
    const sortBy = searchDto.sortBy || 'distance';
    const sortOrder = searchDto.sortOrder || 'asc';

    if (sortBy === 'distance' && searchDto.latitude && searchDto.longitude) {
      // Custom sorting by distance (handled in application layer)
      const locations = await queryBuilder.getMany();
      const sortedLocations = this.sortByDistance(
        locations,
        { latitude: searchDto.latitude, longitude: searchDto.longitude },
        sortOrder,
      );

      return this.paginateResults(
        sortedLocations,
        searchDto.page,
        searchDto.limit,
      );
    } else {
      queryBuilder.orderBy(
        `location.${sortBy}`,
        sortOrder.toUpperCase() as 'ASC' | 'DESC',
      );
    }

    // Apply pagination
    const page = searchDto.page || 1;
    const limit = searchDto.limit || 20;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [locations, total] = await queryBuilder.getManyAndCount();

    return {
      locations,
      total,
      page,
      limit,
    };
  }

  /**
   * Generate heatmap data for a given area
   */
  async generateHeatmapData(heatmapDto: LocationHeatmapDto): Promise<{
    grid: number[][];
    bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number };
    resolution: number;
    totalLocations: number;
  }> {
    const resolution = heatmapDto.resolution || 50;

    // Get bounding box
    const bounds = {
      minLat: heatmapDto.minLat || -90,
      maxLat: heatmapDto.maxLat || 90,
      minLon: heatmapDto.minLon || -180,
      maxLon: heatmapDto.maxLon || 180,
    };

    // Get all locations within bounding box
    const locations = await this.locationRepository.find({
      where: {
        latitude: Between(bounds.minLat, bounds.maxLat),
        longitude: Between(bounds.minLon, bounds.maxLon),
        isPublic: true,
      },
    });

    // Initialize grid
    const grid = Array(resolution)
      .fill(0)
      .map(() => Array(resolution).fill(0));

    // Populate grid with location density
    locations.forEach((location) => {
      const gridX = Math.floor(
        ((location.longitude - bounds.minLon) /
          (bounds.maxLon - bounds.minLon)) *
          resolution,
      );
      const gridY = Math.floor(
        ((location.latitude - bounds.minLat) /
          (bounds.maxLat - bounds.minLat)) *
          resolution,
      );

      if (
        gridX >= 0 &&
        gridX < resolution &&
        gridY >= 0 &&
        gridY < resolution
      ) {
        grid[gridY][gridX]++;
      }
    });

    return {
      grid,
      bounds,
      resolution,
      totalLocations: locations.length,
    };
  }

  /**
   * Find grid zone for a coordinate
   */
  async findZoneForCoordinate(coordinate: Coordinates) {
    const gridZones = await this.gridZoneRepository.find({
      where: { isActive: true },
    });
    return ZoneMappingAlgorithm.findZoneForCoordinate(coordinate, gridZones);
  }

  /**
   * Calculate distance between two locations
   */
  async calculateDistance(
    locationId1: string,
    locationId2: string,
    unit: 'km' | 'miles' = 'km',
  ) {
    const [location1, location2] = await Promise.all([
      this.getLocation(locationId1),
      this.getLocation(locationId2),
    ]);

    return DistanceAlgorithm.calculateDistance(
      { latitude: location1.latitude, longitude: location1.longitude },
      { latitude: location2.latitude, longitude: location2.longitude },
      unit,
    );
  }

  /**
   * Get regional pricing multiplier for a location
   */
  async getRegionalPriceMultiplier(locationId: string): Promise<number> {
    const location = await this.getLocation(locationId);
    return location.regionalPriceMultiplier;
  }

  /**
   * Create a new grid zone
   */
  async createGridZone(zoneData: Partial<GridZone>): Promise<GridZone> {
    const zone = this.gridZoneRepository.create(zoneData);
    return this.gridZoneRepository.save(zone);
  }

  /**
   * Get all grid zones
   */
  async getGridZones(): Promise<GridZone[]> {
    return this.gridZoneRepository.find({ where: { isActive: true } });
  }

  /**
   * Update grid zone
   */
  async updateGridZone(
    id: string,
    updateData: Partial<GridZone>,
  ): Promise<GridZone> {
    const zone = await this.gridZoneRepository.findOne({ where: { id } });
    if (!zone) {
      throw new NotFoundException(`Grid zone with ID ${id} not found`);
    }

    Object.assign(zone, updateData);
    return this.gridZoneRepository.save(zone);
  }

  /**
   * Delete location (soft delete by setting isPublic to false)
   */
  async deleteLocation(id: string): Promise<void> {
    const location = await this.getLocation(id);
    location.isPublic = false;
    await this.locationRepository.save(location);
  }

  private validateCoordinates(latitude: number, longitude: number): void {
    if (latitude < -90 || latitude > 90) {
      throw new BadRequestException('Latitude must be between -90 and 90');
    }
    if (longitude < -180 || longitude > 180) {
      throw new BadRequestException('Longitude must be between -180 and 180');
    }
  }

  private sortByDistance(
    locations: Location[],
    centerPoint: Coordinates,
    sortOrder: 'asc' | 'desc',
  ): Location[] {
    return locations.sort((a, b) => {
      const distanceA = DistanceAlgorithm.calculateDistance(centerPoint, {
        latitude: a.latitude,
        longitude: a.longitude,
      }).distance;

      const distanceB = DistanceAlgorithm.calculateDistance(centerPoint, {
        latitude: b.latitude,
        longitude: b.longitude,
      }).distance;

      return sortOrder === 'asc'
        ? distanceA - distanceB
        : distanceB - distanceA;
    });
  }

  private paginateResults(
    locations: Location[],
    page: number = 1,
    limit: number = 20,
  ): {
    locations: Location[];
    total: number;
    page: number;
    limit: number;
  } {
    const total = locations.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLocations = locations.slice(startIndex, endIndex);

    return {
      locations: paginatedLocations,
      total,
      page,
      limit,
    };
  }
}
