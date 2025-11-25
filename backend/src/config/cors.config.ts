import { Logger } from '@nestjs/common';

// Default localhost origins for development
const defaultLocalOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3021',
  'http://localhost:4200',
];

// Default production origins (fallback if CORS_ORIGINS not set)
const defaultProductionOrigins = [
  'https://metaenix.com',
  'https://api.metaenix.com',
  'https://db.metaenix.com',
  'https://ingest.metaenix.com',
  'https://play.metaenix.com',
  'https://src.metaenix.com',
  'https://dev.metaenix.com',
  'https://twitch.tv',
  'https://kick.com',
  'https://x.com',
];

// Logger instance for CORS error logging
const corsLogger = new Logger('CORS');

/**
 * Get CORS origins from environment variable or use defaults
 * CORS_ORIGINS should be a comma-separated list of URLs
 * Reads directly from process.env to avoid circular dependency
 */
const getOriginsFromEnv = (env: string): string[] => {
  const corsOriginsEnv = process.env.CORS_ORIGINS;

  if (corsOriginsEnv) {
    return corsOriginsEnv.split(',').map((origin) => origin.trim()).filter(Boolean);
  }

  // Fallback to defaults if CORS_ORIGINS not set
  return env === 'production' ? defaultProductionOrigins : defaultLocalOrigins;
};

/**
 * Function to check if an origin is allowed (handles wildcard subdomains)
 * @param origin - The origin to check
 * @param env - The environment (development/production)
 * @param logRejection - Whether to log rejected origins (default: true)
 * @returns true if origin is allowed, false otherwise
 */
const isAllowedOrigin = (
  origin: string | undefined,
  env: string,
  logRejection: boolean = true,
): boolean => {
  if (!origin) {
    if (logRejection) {
      corsLogger.warn('CORS: Request with no origin header');
    }
    return false;
  }

  const allowedOrigins = getOriginsFromEnv(env);

  // Check exact match first (for known service subdomains)
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check if it's ANY metaenix.com subdomain (wildcard support)
  // Matches: https://*.metaenix.com (including dev, username, etc.)
  // Pattern matches: https://subdomain.metaenix.com or https://metaenix.com
  const metaenixDomainPattern = /^https?:\/\/([a-zA-Z0-9-]+\.)?metaenix\.com$/;
  if (metaenixDomainPattern.test(origin)) {
    // Allow any subdomain of metaenix.com (dev, username, etc.)
    return true;
  }

  // Log rejected origin for debugging and security monitoring
  if (logRejection) {
    corsLogger.warn(
      `CORS: Origin rejected - ${origin}`,
      `Allowed origins: ${allowedOrigins.length} configured (${env === 'production' ? 'production' : 'development'} mode)`,
    );
  }

  return false;
};

export const getCorsOrigins = (env: string): string[] => {
  return getOriginsFromEnv(env);
};

/**
 * Get CORS origin validation function with error handling and logging
 * @param env - The environment (development/production)
 * @returns CORS origin validation function
 */
export const getCorsOriginFunction = (
  env: string,
): ((
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) => void) => {
  return (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    try {
      const isAllowed = isAllowedOrigin(origin, env, true);
      callback(null, isAllowed);
    } catch (error) {
      // Log CORS configuration errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown CORS error';
      corsLogger.error(`CORS configuration error: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      // Reject on error to be safe
      callback(error instanceof Error ? error : new Error(errorMessage), false);
    }
  };
};
