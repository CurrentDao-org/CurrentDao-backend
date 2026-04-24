/**
 * Security Headers Configuration
 * 
 * Configures security headers using Helmet and custom middleware.
 * Protects against common web vulnerabilities (XSS, clickjacking, etc.).
 */

import helmet from 'helmet';

/**
 * Content Security Policy configuration
 */
const contentSecurityPolicy = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    upgradeInsecureRequests: [],
    blockAllMixedContent: [],
  },
};

/**
 * Get security header configuration based on environment
 */
export const getSecurityConfig = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (nodeEnv === 'production') {
    return {
      // Strict CSP for production
      contentSecurityPolicy: {
        directives: {
          ...contentSecurityPolicy.directives,
          reportUri: '/api/csp-report',
        },
      },
      
      // HTTP Strict Transport Security
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      
      // Prevent MIME type sniffing
      noSniff: true,
      
      // XSS Protection
      xssFilter: true,
      
      // Prevent clickjacking
      frameguard: {
        action: 'deny',
      },
      
      // Hide X-Powered-By header
      hidePoweredBy: true,
      
      // Referrer Policy
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
      
      // Permissions Policy
      permissionsPolicy: {
        features: {
          geolocation: [],
          microphone: [],
          camera: [],
          payment: [],
        },
      },
    };
  }
  
  // Development - less restrictive for debugging
  return {
    contentSecurityPolicy: false, // Disable CSP in development for easier debugging
    hsts: {
      maxAge: 86400, // 1 day
      includeSubDomains: false,
      preload: false,
    },
    noSniff: true,
    xssFilter: true,
    frameguard: {
      action: 'deny',
    },
    hidePoweredBy: true,
    referrerPolicy: {
      policy: 'no-referrer-when-downgrade',
    },
  };
};

/**
 * Create helmet middleware instance
 */
export const helmetMiddleware = () => {
  const config = getSecurityConfig();
  return helmet(config);
};

/**
 * Additional security headers not covered by Helmet
 */
export const additionalSecurityHeaders = {
  /**
   * Cache control for sensitive data
   */
  cacheControl: {
    noStore: true,
    noCache: true,
    private: true,
  },
  
  /**
   * Cross-Origin policies
   */
  crossOrigin: {
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-site',
  },
  
  /**
   * Remove server identification headers
   */
  removeHeaders: ['x-powered-by', 'server', 'x-aspnet-version'],
};

/**
 * Validate security configuration
 */
export const validateSecurityConfig = (): void => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  console.log(`Security headers configured for ${nodeEnv} environment`);
  
  if (nodeEnv === 'production') {
    console.log('Production security settings enabled:');
    console.log('- HSTS with preload enabled');
    console.log('- Strict Content Security Policy');
    console.log('- Clickjacking protection (deny)');
    console.log('- XSS filter enabled');
    console.log('- No MIME type sniffing');
  } else {
    console.log('Development security settings enabled (relaxed for debugging)');
  }
};
