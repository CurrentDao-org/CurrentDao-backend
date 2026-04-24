/**
 * CORS Configuration
 * 
 * Configures Cross-Origin Resource Sharing for the application.
 * Supports environment-specific configurations for different deployment scenarios.
 */

import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * Get allowed origins from environment variables
 */
const getAllowedOrigins = (): string[] => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (nodeEnv === 'production') {
    // Production: Strict whitelist from environment variable
    const productionOrigins = process.env.CORS_ALLOWED_ORIGINS || '';
    return productionOrigins.split(',').map(origin => origin.trim()).filter(Boolean);
  }
  
  if (nodeEnv === 'staging') {
    // Staging: Specific staging domains
    return [
      'https://staging.currentdao.com',
      'https://staging-api.currentdao.com',
      ...(process.env.CORS_STAGING_ORIGINS ? process.env.CORS_STAGING_ORIGINS.split(',').map(o => o.trim()) : []),
    ];
  }
  
  // Development: Allow localhost and common development ports
  return [
    'http://localhost:3000',
    'http://localhost:4200',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4200',
    'http://127.0.0.1:8080',
    ...(process.env.CORS_DEV_ORIGINS ? process.env.CORS_DEV_ORIGINS.split(',').map(o => o.trim()) : []),
  ];
};

/**
 * CORS configuration options
 */
export const corsConfig: CorsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  
  /**
   * Allowed HTTP methods
   */
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  
  /**
   * Allowed headers
   */
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-CSRF-Token',
    'X-Request-ID',
    'X-API-Key',
  ],
  
  /**
   * Exposed headers (headers that browsers can access)
   */
  exposedHeaders: [
    'X-Request-ID',
    'X-Total-Count',
    'X-Page-Size',
    'X-Page-Number',
    'Content-Disposition',
  ],
  
  /**
   * Whether to allow credentials (cookies, authorization headers, etc.)
   */
  credentials: true,
  
  /**
   * Max age for preflight cache (in seconds)
   */
  maxAge: 3600, // 1 hour
  
  /**
   * Whether to enable preflight caching
   */
  preflightContinue: false,
  
  /**
   * Options success status code
   */
  optionsSuccessStatus: 204,
};

/**
 * Get CORS configuration for specific environment
 */
export const getCorsConfig = (environment?: string): CorsOptions => {
  const nodeEnv = environment || process.env.NODE_ENV || 'development';
  
  if (nodeEnv === 'production') {
    return {
      ...corsConfig,
      origin: getAllowedOrigins(),
      credentials: true,
    };
  }
  
  if (nodeEnv === 'staging') {
    return {
      ...corsConfig,
      origin: getAllowedOrigins(),
      credentials: true,
    };
  }
  
  // Development - more permissive
  return {
    ...corsConfig,
    origin: true, // Allow all origins in development
    credentials: true,
  };
};

/**
 * Validate CORS configuration
 */
export const validateCorsConfig = (): void => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS;
  
  if (nodeEnv === 'production' && !allowedOrigins) {
    console.warn('WARNING: CORS_ALLOWED_ORIGINS not set in production environment!');
    console.warn('This may cause CORS errors when accessing the API from frontend applications.');
  }
  
  console.log(`CORS configured for ${nodeEnv} environment`);
  console.log(`Allowed origins: ${getAllowedOrigins().join(', ')}`);
};
