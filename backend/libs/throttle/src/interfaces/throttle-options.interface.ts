export interface ThrottleOptions {
  /**
   * Maximum number of requests allowed
   */
  limit: number;

  /**
   * Time window in seconds
   */
  ttl: number;

  /**
   * Custom identifier generator (default: uses IP address or user ID)
   */
  getIdentifier?: (request: any) => string;

  /**
   * Skip rate limiting if condition is true
   */
  skipIf?: (request: any) => boolean;

  /**
   * Custom error message
   */
  errorMessage?: string;

  /**
   * Whether to throw error or return 429 response
   */
  throwError?: boolean;
}

export interface ThrottleResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;

  /**
   * Number of remaining requests
   */
  remaining: number;

  /**
   * Unix timestamp when the rate limit resets
   */
  resetAt: number;

  /**
   * Current request count
   */
  current: number;

  /**
   * Total limit
   */
  limit: number;
}

