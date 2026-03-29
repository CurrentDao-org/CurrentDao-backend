import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationService } from './location.service';
import { Location } from './entities/location.entity';
import { GridZone } from './entities/grid-zone.entity';
import { LocationSearchDto } from './dto/location-search.dto';

describe('LocationService', () => {
  let service: LocationService;
  let locationRepository: Repository<Location>;
  let gridZoneRepository: Repository<GridZone>;

  const mockLocationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockGridZoneRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        {
          provide: getRepositoryToken(Location),
          useValue: mockLocationRepository,
        },
        {
          provide: getRepositoryToken(GridZone),
          useValue: mockGridZoneRepository,
        },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
    locationRepository = module.get<Repository<Location>>(
      getRepositoryToken(Location),
    );
    gridZoneRepository = module.get<Repository<GridZone>>(
      getRepositoryToken(GridZone),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLocation', () => {
    it('should create a location with valid data', async () => {
      const locationData = {
        latitude: 40.7128,
        longitude: -74.006,
        address: '123 Test St',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postalCode: '10001',
      };

      const expectedLocation = { id: 'test-id', ...locationData };
      mockLocationRepository.create.mockReturnValue(expectedLocation);
      mockLocationRepository.save.mockResolvedValue(expectedLocation);
      mockGridZoneRepository.find.mockResolvedValue([]);

      const result = await service.createLocation(locationData);

      expect(result).toEqual(expectedLocation);
      expect(mockLocationRepository.create).toHaveBeenCalledWith(locationData);
      expect(mockLocationRepository.save).toHaveBeenCalledWith(
        expectedLocation,
      );
    });

    it('should throw error for invalid latitude', async () => {
      const locationData = {
        latitude: 91, // Invalid latitude
        longitude: -74.006,
        address: '123 Test St',
      };

      await expect(service.createLocation(locationData)).rejects.toThrow(
        'Latitude must be between -90 and 90',
      );
    });

    it('should throw error for invalid longitude', async () => {
      const locationData = {
        latitude: 40.7128,
        longitude: 181, // Invalid longitude
        address: '123 Test St',
      };

      await expect(service.createLocation(locationData)).rejects.toThrow(
        'Longitude must be between -180 and 180',
      );
    });
  });

  describe('searchLocations', () => {
    it('should search locations with filters', async () => {
      const searchDto: LocationSearchDto = {
        city: 'New York',
        country: 'USA',
        page: 1,
        limit: 10,
      };

      const mockLocations = [
        { id: '1', city: 'New York', country: 'USA' },
        { id: '2', city: 'New York', country: 'USA' },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockLocations),
        getManyAndCount: jest.fn().mockResolvedValue([mockLocations, 2]),
      };

      mockLocationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.searchLocations(searchDto);

      expect(result.locations).toEqual(mockLocations);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two locations', async () => {
      const location1 = { id: '1', latitude: 40.7128, longitude: -74.006 };
      const location2 = { id: '2', latitude: 34.0522, longitude: -118.2437 };

      mockLocationRepository.findOne
        .mockResolvedValueOnce(location1)
        .mockResolvedValueOnce(location2);

      const result = await service.calculateDistance('1', '2');

      expect(result.distance).toBeCloseTo(3935.75, 1); // Approximate distance NYC to LA
      expect(result.unit).toBe('km');
    });
  });

  describe('getRegionalPriceMultiplier', () => {
    it('should return regional price multiplier for location', async () => {
      const location = {
        id: '1',
        latitude: 40.7128,
        longitude: -74.006,
        regionalPriceMultiplier: 1.25,
      };

      mockLocationRepository.findOne.mockResolvedValue(location);

      const result = await service.getRegionalPriceMultiplier('1');

      expect(result).toBe(1.25);
    });
  });
});
