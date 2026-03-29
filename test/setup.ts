// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_USERNAME = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_DATABASE = 'test_currentdao';
process.env.WEATHER_API_KEY = 'test_weather_key';
process.env.FRED_API_KEY = 'test_fred_key';
process.env.ALPHA_VANTAGE_API_KEY = 'test_alpha_vantage_key';
process.env.LOG_LEVEL = 'error';

// Mock external API calls
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
  })),
}));

// Mock winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    log: jest.fn(),
    level: 'info',
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(() => jest.fn()),
    errors: jest.fn(),
    splat: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    printf: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}));

// Global test setup
beforeAll(() => {
  // Set up any global test configuration
});

// Clean up after all tests
afterAll(() => {
  // Clean up any global test configuration
});

/**
 * Test module options for creating test modules
 */
export interface TestModuleOptions {
  /** Mock services */
  mocks?: any[];
  /** Override providers */
  overrides?: any[];
  /** Import modules */
  imports?: any[];
}

/**
 * Create a mock for a service
 */
export const createMock = <T extends object = any>(
  mockImplementation?: Partial<T>,
): jest.Mocked<T> => {
  return {
    ...mockImplementation,
  } as jest.Mocked<T>;
};

/**
 * Create a mock provider
 */
export const createMockProvider = <T>(
  token: any,
  mockImplementation?: Partial<T>,
) => {
  return {
    provide: token,
    useValue: createMock(mockImplementation),
  };
};

/**
 * Create a factory mock provider
 */
export const createFactoryMockProvider = <T>(
  token: any,
  factory: () => T,
) => {
  return {
    provide: token,
    useFactory: factory,
  };
};

/**
 * Create a class mock provider
 */
export const createClassMockProvider = <T>(
  token: any,
  mockClass: new (...args: any[]) => T,
) => {
  return {
    provide: token,
    useClass: mockClass,
  };
};

/**
 * Get service from testing module
 */
export const getService = <T>(module: any, token: any): T => {
  const service = module.get(token);
  return service as T;
};

/**
 * Check if provider exists
 */
export const hasProvider = (module: any, token: any): boolean => {
  try {
    module.get(token);
    return true;
  } catch {
    return false;
  }
};

/**
 * Clear all mocks
 */
export const clearAllMocks = () => {
  jest.clearAllMocks();
};

/**
 * Reset all mocks
 */
export const resetAllMocks = () => {
  jest.resetAllMocks();
};

/**
 * Restore all mocks
 */
export const restoreAllMocks = () => {
  jest.restoreAllMocks();
};

/**
 * Wait for async operations
 */
export const waitFor = (ms: number = 100) => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Flush promises
 */
export const flushPromises = () => 
  new Promise(resolve => setImmediate(resolve));
