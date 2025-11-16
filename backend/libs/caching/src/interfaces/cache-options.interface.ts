export interface CacheOptions {
  /**
   * Time to live in seconds
   * @default 300 (5 minutes for user data)
   */
  ttl?: number;

  /**
   * Tags for cache invalidation
   * @example ['user', 'user:123']
   */
  tags?: string[];
}

