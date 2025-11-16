import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cache:options';
export const CACHE_TTL_KEY = 'cache:ttl';
export const CACHE_TAGS_KEY = 'cache:tags';

export interface CacheDecoratorOptions {
  /**
   * Cache key (supports template variables like :userId, :id)
   */
  key: string;

  /**
   * Time to live in seconds
   */
  ttl?: number;

  /**
   * Tags for cache invalidation
   */
  tags?: string[];

  /**
   * Whether to use the method arguments in the cache key
   */
  useArgs?: boolean;
}

/**
 * Cache decorator - Caches method return value
 * @param options Cache options
 */
export const Cache = (options: CacheDecoratorOptions) => {
  return SetMetadata(CACHE_KEY, options);
};

/**
 * Cache TTL decorator - Sets TTL for cached method
 * @param ttl Time to live in seconds
 */
export const CacheTTL = (ttl: number) => {
  return SetMetadata(CACHE_TTL_KEY, ttl);
};

/**
 * Cache tags decorator - Sets tags for cache invalidation
 * @param tags Array of tags
 */
export const CacheTags = (...tags: string[]) => {
  return SetMetadata(CACHE_TAGS_KEY, tags);
};

