import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@redis/redis';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { CacheOptions } from './interfaces/cache-options.interface';

@Injectable()
export class CachingService {
  private readonly logger = new Logger(CachingService.name);

  // Default TTLs (in seconds)
  private readonly DEFAULT_USER_TTL = 300; // 5 minutes
  private readonly DEFAULT_PROFILE_TTL = 600; // 10 minutes
  private readonly DEFAULT_GENERIC_TTL = 300; // 5 minutes

  constructor(
    private readonly redisService: RedisService,
    private readonly loggingService: LoggingService,
  ) {}

  // #########################################################
  // USER CACHING METHODS
  // #########################################################

  /**
   * Cache a user by ID
   */
  async cacheUser(
    userId: string,
    user: any,
    options: CacheOptions = {},
  ): Promise<void> {
    try {
      const key = this.getUserCacheKey('id', userId);
      const ttl = options.ttl || this.DEFAULT_USER_TTL;
      const tags = options.tags || ['user', `user:${userId}`];

      await this.redisService.cacheSet(key, user, ttl, tags);

      // Also cache by username and email if available
      if (user.username) {
        const usernameKey = this.getUserCacheKey('username', user.username);
        await this.redisService.cacheSet(usernameKey, user, ttl, tags);
      }

      if (user.email) {
        const emailKey = this.getUserCacheKey('email', user.email);
        await this.redisService.cacheSet(emailKey, user, ttl, tags);
      }

      if (user.websocketId) {
        const websocketKey = this.getUserCacheKey('websocketId', user.websocketId);
        await this.redisService.cacheSet(websocketKey, user, ttl, tags);
      }
    } catch (error) {
      this.loggingService.error(
        `Error caching user: ${userId}`,
        error instanceof Error ? error.stack : undefined,
        'CachingService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { userId },
        },
      );
    }
  }

  /**
   * Get cached user by ID
   */
  async getCachedUser(userId: string): Promise<any | null> {
    try {
      const key = this.getUserCacheKey('id', userId);
      return await this.redisService.get<any>(key);
    } catch (error) {
      this.loggingService.error(
        `Error getting cached user: ${userId}`,
        error instanceof Error ? error.stack : undefined,
        'CachingService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { userId },
        },
      );
      return null;
    }
  }

  /**
   * Get cached user by username
   */
  async getCachedUserByUsername(username: string): Promise<any | null> {
    try {
      const key = this.getUserCacheKey('username', username);
      return await this.redisService.get<any>(key);
    } catch (error) {
      this.loggingService.error(
        `Error getting cached user by username: ${username}`,
        error instanceof Error ? error.stack : undefined,
        'CachingService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { username },
        },
      );
      return null;
    }
  }

  /**
   * Get cached user by email
   */
  async getCachedUserByEmail(email: string): Promise<any | null> {
    try {
      const key = this.getUserCacheKey('email', email);
      return await this.redisService.get<any>(key);
    } catch (error) {
      this.loggingService.error(
        `Error getting cached user by email: ${email}`,
        error instanceof Error ? error.stack : undefined,
        'CachingService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { email },
        },
      );
      return null;
    }
  }

  /**
   * Get cached user by websocketId
   */
  async getCachedUserByWebsocketId(websocketId: string): Promise<any | null> {
    try {
      const key = this.getUserCacheKey('websocketId', websocketId);
      return await this.redisService.get<any>(key);
    } catch (error) {
      this.loggingService.error(
        `Error getting cached user by websocketId: ${websocketId}`,
        error instanceof Error ? error.stack : undefined,
        'CachingService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { websocketId },
        },
      );
      return null;
    }
  }

  /**
   * Get or set user cache (cache-aside pattern)
   * @param lookupType - Type of lookup: 'id', 'username', 'email', 'websocketId'
   * @param identifier - The identifier value
   * @param fetchFn - Function to fetch user from database if not cached
   * @param options - Cache options
   */
  async getOrSetUser(
    lookupType: 'id' | 'username' | 'email' | 'websocketId',
    identifier: string,
    fetchFn: () => Promise<any>,
    options: CacheOptions = {},
  ): Promise<any> {
    try {
      const key = this.getUserCacheKey(lookupType, identifier);
      const ttl = options.ttl || this.DEFAULT_USER_TTL;
      const tags = options.tags || ['user', `user:${identifier}`];

      return await this.redisService.getOrSet(
        key,
        async () => {
          const user = await fetchFn();
          // Cache user by all identifiers if available
          if (user) {
            await this.cacheUser(user.id || identifier, user, { ttl, tags });
          }
          return user;
        },
        ttl,
        tags,
      );
    } catch (error) {
      this.loggingService.error(
        `Error in getOrSetUser: ${lookupType}=${identifier}`,
        error instanceof Error ? error.stack : undefined,
        'CachingService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { lookupType, identifier },
        },
      );
      // Fallback to direct fetch on error
      return await fetchFn();
    }
  }

  /**
   * Invalidate all caches for a user
   * @param userId - User ID
   */
  async invalidateUser(userId: string): Promise<void> {
    try {
      await this.redisService.invalidateByTags('user', `user:${userId}`);
      this.logger.debug(`Invalidated cache for user: ${userId}`);
    } catch (error) {
      this.loggingService.error(
        `Error invalidating user cache: ${userId}`,
        error instanceof Error ? error.stack : undefined,
        'CachingService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { userId },
        },
      );
    }
  }

  /**
   * Invalidate user cache by username
   */
  async invalidateUserByUsername(username: string): Promise<void> {
    try {
      const key = this.getUserCacheKey('username', username);
      await this.redisService.del(key);
      await this.redisService.invalidateByTags('user');
      this.logger.debug(`Invalidated cache for user by username: ${username}`);
    } catch (error) {
      this.loggingService.error(
        `Error invalidating user cache by username: ${username}`,
        error instanceof Error ? error.stack : undefined,
        'CachingService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { username },
        },
      );
    }
  }

  /**
   * Invalidate user cache by email
   */
  async invalidateUserByEmail(email: string): Promise<void> {
    try {
      const key = this.getUserCacheKey('email', email);
      await this.redisService.del(key);
      await this.redisService.invalidateByTags('user');
      this.logger.debug(`Invalidated cache for user by email: ${email}`);
    } catch (error) {
      this.loggingService.error(
        `Error invalidating user cache by email: ${email}`,
        error instanceof Error ? error.stack : undefined,
        'CachingService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { email },
        },
      );
    }
  }

  /**
   * Invalidate user cache by websocketId
   */
  async invalidateUserByWebsocketId(websocketId: string): Promise<void> {
    try {
      const key = this.getUserCacheKey('websocketId', websocketId);
      await this.redisService.del(key);
      await this.redisService.invalidateByTags('user');
      this.logger.debug(`Invalidated cache for user by websocketId: ${websocketId}`);
    } catch (error) {
      this.loggingService.error(
        `Error invalidating user cache by websocketId: ${websocketId}`,
        error instanceof Error ? error.stack : undefined,
        'CachingService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { websocketId },
        },
      );
    }
  }

  // #########################################################
  // GENERIC CACHING METHODS
  // #########################################################

  /**
   * Generic get or set cache (cache-aside pattern)
   * @param key - Cache key
   * @param fetchFn - Function to fetch value if not cached
   * @param options - Cache options
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    try {
      const ttl = options.ttl || this.DEFAULT_GENERIC_TTL;
      const tags = options.tags || [];

      return await this.redisService.getOrSet(key, fetchFn, ttl, tags);
    } catch (error) {
      this.loggingService.error(
        `Error in getOrSet cache: ${key}`,
        error instanceof Error ? error.stack : undefined,
        'CachingService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { key },
        },
      );
      // Fallback to direct fetch on error
      return await fetchFn();
    }
  }

  /**
   * Set a cache value
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {},
  ): Promise<void> {
    try {
      const ttl = options.ttl || this.DEFAULT_GENERIC_TTL;
      const tags = options.tags || [];
      await this.redisService.cacheSet(key, value, ttl, tags);
    } catch (error) {
      this.loggingService.error(
        `Error setting cache: ${key}`,
        error instanceof Error ? error.stack : undefined,
        'CachingService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { key },
        },
      );
    }
  }

  /**
   * Get a cached value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      return await this.redisService.get<T>(key);
    } catch (error) {
      this.loggingService.error(
        `Error getting cache: ${key}`,
        error instanceof Error ? error.stack : undefined,
        'CachingService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { key },
        },
      );
      return null;
    }
  }

  /**
   * Delete a cache key
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redisService.del(key);
    } catch (error) {
      this.loggingService.error(
        `Error deleting cache: ${key}`,
        error instanceof Error ? error.stack : undefined,
        'CachingService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { key },
        },
      );
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(...tags: string[]): Promise<number> {
    try {
      return await this.redisService.invalidateByTags(...tags);
    } catch (error) {
      this.loggingService.error(
        `Error invalidating cache by tags: ${tags.join(', ')}`,
        error instanceof Error ? error.stack : undefined,
        'CachingService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { tags },
        },
      );
      return 0;
    }
  }

  /**
   * Invalidate cache by pattern
   * @param pattern - Pattern to match (e.g., 'cache:user:*')
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      return await this.redisService.invalidateByPattern(pattern);
    } catch (error) {
      this.loggingService.error(
        `Error invalidating cache by pattern: ${pattern}`,
        error instanceof Error ? error.stack : undefined,
        'CachingService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { pattern },
        },
      );
      return 0;
    }
  }

  /**
   * Clear all user caches
   */
  async clearAllUserCaches(): Promise<void> {
    try {
      await this.invalidateByPattern('cache:user:*');
      this.logger.debug('Cleared all user caches');
    } catch (error) {
      this.loggingService.error(
        'Error clearing all user caches',
        error instanceof Error ? error.stack : undefined,
        'CachingService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
    }
  }

  // #########################################################
  // PRIVATE HELPER METHODS
  // #########################################################

  /**
   * Build cache key for user lookups
   */
  private getUserCacheKey(
    lookupType: 'id' | 'username' | 'email' | 'websocketId',
    identifier: string,
  ): string {
    return this.redisService.keyBuilder.cache('user', lookupType, identifier);
  }
}
