// Default localhost origins for development
const defaultLocalOrigins = [
  'http://localhost:3000',
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

// Function to check if an origin is allowed (handles wildcard subdomains)
const isAllowedOrigin = (origin: string | undefined, env: string): boolean => {
  if (!origin) return false;

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

  return false;
};

export const getCorsOrigins = (env: string): string[] => {
  return getOriginsFromEnv(env);
};

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
    callback(null, isAllowedOrigin(origin, env));
  };
};
