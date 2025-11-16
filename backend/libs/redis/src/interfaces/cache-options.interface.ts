export interface CacheOptions {
  /**
   * Time to live in seconds
   */
  ttl?: number;

  /**
   * Cache key prefix
   */
  prefix?: string;

  /**
   * Whether to serialize/deserialize JSON automatically
   */
  serialize?: boolean;

  /**
   * Tags for cache invalidation
   */
  tags?: string[];

  /**
   * Custom key generator function
   */
  keyGenerator?: (...args: any[]) => string;
}

export interface DistributedLockOptions {
  /**
   * Lock timeout in milliseconds
   */
  timeout: number;

  /**
   * Retry delay in milliseconds
   */
  retryDelay?: number;

  /**
   * Maximum retry attempts
   */
  maxRetries?: number;
}

export interface RateLimitOptions {
  /**
   * Maximum number of requests
   */
  limit: number;

  /**
   * Time window in seconds
   */
  window: number;

  /**
   * Key prefix for rate limiting
   */
  prefix?: string;
}

