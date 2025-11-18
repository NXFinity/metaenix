import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Cluster } from 'ioredis';
import { KeyBuilder } from './utils/key-builder.util';
import { DistributedLockOptions, RateLimitOptions } from './interfaces/cache-options.interface';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis | Cluster;
  // private subscriber: Redis | null = null; // Reserved for future pub/sub functionality
  private isConnected = false;
  public readonly keyBuilder: KeyBuilder;

  constructor(private configService: ConfigService) {
    const keyPrefix = this.configService.get<string>('REDIS_KEY_PREFIX');
    if (!keyPrefix) {
      throw new Error('REDIS_KEY_PREFIX environment variable is required');
    }
    this.keyBuilder = new KeyBuilder(keyPrefix);
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  // #########################################################
  // CONNECTION MANAGEMENT
  // #########################################################

  /**
   * Connect to Redis server
   */
  private async connect(): Promise<void> {
    try {
      const host = this.configService.get<string>('REDIS_HOST');
      const port = this.configService.get<number>('REDIS_PORT');
      const password = this.configService.get<string>('REDIS_PASSWORD');
      const db = this.configService.get<number>('REDIS_DB');
      
      if (!host) {
        throw new Error('REDIS_HOST environment variable is required');
      }
      if (port === undefined) {
        throw new Error('REDIS_PORT environment variable is required');
      }
      if (!password) {
        throw new Error('REDIS_PASSWORD environment variable is required');
      }
      if (db === undefined) {
        throw new Error('REDIS_DB environment variable is required');
      }
      
      const enableReadyCheck = this.configService.get<boolean>('REDIS_ENABLE_READY_CHECK');
      if (enableReadyCheck === undefined) {
        throw new Error('REDIS_ENABLE_READY_CHECK environment variable is required');
      }
      const maxRetriesPerRequest = this.configService.get<number>('REDIS_MAX_RETRIES');
      if (maxRetriesPerRequest === undefined) {
        throw new Error('REDIS_MAX_RETRIES environment variable is required');
      }
      const retryStrategy = (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      };

      this.client = new Redis({
        host,
        port,
        password,
        db,
        enableReadyCheck,
        maxRetriesPerRequest,
        retryStrategy,
        lazyConnect: true,
        reconnectOnError: (err: Error) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true;
          }
          return false;
        },
      });

      // Event handlers
      this.client.on('connect', () => {
        this.logger.log('Redis client connecting...');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        this.logger.log(`Redis client connected to ${host}:${port}`);
      });

      this.client.on('error', (err: Error) => {
        this.logger.error('Redis client error:', err.message);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.logger.warn('Redis client connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        this.logger.log('Redis client reconnecting...');
      });

      // Connect to Redis
      await this.client.connect();
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis server
   */
  private async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis client disconnected');
    }
  }

  /**
   * Get Redis client instance
   */
  getClient(): Redis | Cluster {
    if (!this.isConnected) {
      throw new Error('Redis client is not connected');
    }
    return this.client;
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return this.isConnected && this.client?.status === 'ready';
  }

  /**
   * Ping Redis server
   */
  async ping(): Promise<string> {
    try {
      return await this.client.ping();
    } catch (error) {
      this.logger.error('Redis ping failed:', error);
      throw error;
    }
  }

  // #########################################################
  // BASIC KEY OPERATIONS
  // #########################################################

  /**
   * Set a key-value pair
   * @param key - Redis key
   * @param value - Value to store (will be JSON stringified if object)
   * @param ttlSeconds - Optional TTL in seconds
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const stringValue =
        typeof value === 'string' ? value : JSON.stringify(value);

      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }
    } catch (error) {
      this.logger.error(`Failed to set key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a value by key
   * @param key - Redis key
   * @param parseJson - Whether to parse JSON (default: true)
   */
  async get<T = any>(
    key: string,
    parseJson: boolean = true,
  ): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (value === null) {
        return null;
      }

      if (parseJson) {
        try {
          return JSON.parse(value) as T;
        } catch {
          // If parsing fails, return as string
          return value as T;
        }
      }

      return value as T;
    } catch (error) {
      this.logger.error(`Failed to get key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete one or more keys
   * @param keys - Key or array of keys to delete
   */
  async del(...keys: string[]): Promise<number> {
    try {
      return await this.client.del(...keys);
    } catch (error) {
      this.logger.error(`Failed to delete keys ${keys.join(', ')}:`, error);
      throw error;
    }
  }

  /**
   * Check if a key exists
   * @param key - Redis key
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check existence of key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set expiration time for a key
   * @param key - Redis key
   * @param seconds - TTL in seconds
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to set expiration for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get TTL (time to live) of a key
   * @param key - Redis key
   * @returns TTL in seconds, -1 if no expiration, -2 if key doesn't exist
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      this.logger.error(`Failed to get TTL for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all keys matching a pattern
   * @param pattern - Pattern to match (e.g., 'user:*')
   */
  async getKeys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      this.logger.error(`Failed to get keys with pattern ${pattern}:`, error);
      throw error;
    }
  }

  // #########################################################
  // HASH OPERATIONS
  // #########################################################

  /**
   * Set a field in a hash
   * @param key - Hash key
   * @param field - Field name
   * @param value - Field value
   */
  async hset(key: string, field: string, value: any): Promise<number> {
    try {
      const stringValue =
        typeof value === 'string' ? value : JSON.stringify(value);
      return await this.client.hset(key, field, stringValue);
    } catch (error) {
      this.logger.error(`Failed to hset ${key}.${field}:`, error);
      throw error;
    }
  }

  /**
   * Set multiple fields in a hash
   * @param key - Hash key
   * @param data - Object with field-value pairs
   */
  async hsetMultiple(key: string, data: Record<string, any>): Promise<number> {
    try {
      const fields: (string | Buffer)[] = [];
      for (const [field, value] of Object.entries(data)) {
        fields.push(field);
        const stringValue =
          typeof value === 'string' ? value : JSON.stringify(value);
        fields.push(stringValue);
      }
      return await this.client.hset(key, ...fields);
    } catch (error) {
      this.logger.error(`Failed to hsetMultiple ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a field value from a hash
   * @param key - Hash key
   * @param field - Field name
   * @param parseJson - Whether to parse JSON (default: true)
   */
  async hget<T = any>(
    key: string,
    field: string,
    parseJson: boolean = true,
  ): Promise<T | null> {
    try {
      const value = await this.client.hget(key, field);
      if (value === null) {
        return null;
      }

      if (parseJson) {
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as T;
        }
      }

      return value as T;
    } catch (error) {
      this.logger.error(`Failed to hget ${key}.${field}:`, error);
      throw error;
    }
  }

  /**
   * Get all fields and values from a hash
   * @param key - Hash key
   */
  async hgetall<T = Record<string, any>>(key: string): Promise<T | null> {
    try {
      const data = await this.client.hgetall(key);
      if (Object.keys(data).length === 0) {
        return null;
      }

      // Try to parse JSON values
      const parsed: Record<string, any> = {};
      for (const [field, value] of Object.entries(data)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value;
        }
      }

      return parsed as T;
    } catch (error) {
      this.logger.error(`Failed to hgetall ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete one or more fields from a hash
   * @param key - Hash key
   * @param fields - Field names to delete
   */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    try {
      return await this.client.hdel(key, ...fields);
    } catch (error) {
      this.logger.error(
        `Failed to hdel ${key} fields ${fields.join(', ')}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Check if a field exists in a hash
   * @param key - Hash key
   * @param field - Field name
   */
  async hexists(key: string, field: string): Promise<boolean> {
    try {
      const result = await this.client.hexists(key, field);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to hexists ${key}.${field}:`, error);
      throw error;
    }
  }

  /**
   * Get all field names in a hash
   * @param key - Hash key
   */
  async hkeys(key: string): Promise<string[]> {
    try {
      return await this.client.hkeys(key);
    } catch (error) {
      this.logger.error(`Failed to hkeys ${key}:`, error);
      throw error;
    }
  }

  // #########################################################
  // LIST OPERATIONS
  // #########################################################

  /**
   * Push value to the left of a list
   * @param key - List key
   * @param value - Value to push
   */
  async lpush(key: string, ...values: any[]): Promise<number> {
    try {
      const stringValues = values.map((v) =>
        typeof v === 'string' ? v : JSON.stringify(v),
      );
      return await this.client.lpush(key, ...stringValues);
    } catch (error) {
      this.logger.error(`Failed to lpush ${key}:`, error);
      throw error;
    }
  }

  /**
   * Push value to the right of a list
   * @param key - List key
   * @param value - Value to push
   */
  async rpush(key: string, ...values: any[]): Promise<number> {
    try {
      const stringValues = values.map((v) =>
        typeof v === 'string' ? v : JSON.stringify(v),
      );
      return await this.client.rpush(key, ...stringValues);
    } catch (error) {
      this.logger.error(`Failed to rpush ${key}:`, error);
      throw error;
    }
  }

  /**
   * Pop value from the left of a list
   * @param key - List key
   * @param parseJson - Whether to parse JSON (default: true)
   */
  async lpop<T = any>(
    key: string,
    parseJson: boolean = true,
  ): Promise<T | null> {
    try {
      const value = await this.client.lpop(key);
      if (value === null) {
        return null;
      }

      if (parseJson) {
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as T;
        }
      }

      return value as T;
    } catch (error) {
      this.logger.error(`Failed to lpop ${key}:`, error);
      throw error;
    }
  }

  /**
   * Pop value from the right of a list
   * @param key - List key
   * @param parseJson - Whether to parse JSON (default: true)
   */
  async rpop<T = any>(
    key: string,
    parseJson: boolean = true,
  ): Promise<T | null> {
    try {
      const value = await this.client.rpop(key);
      if (value === null) {
        return null;
      }

      if (parseJson) {
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as T;
        }
      }

      return value as T;
    } catch (error) {
      this.logger.error(`Failed to rpop ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get list length
   * @param key - List key
   */
  async llen(key: string): Promise<number> {
    try {
      return await this.client.llen(key);
    } catch (error) {
      this.logger.error(`Failed to llen ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get range of elements from a list
   * @param key - List key
   * @param start - Start index
   * @param stop - Stop index (-1 for end)
   * @param parseJson - Whether to parse JSON (default: true)
   */
  async lrange<T = any>(
    key: string,
    start: number,
    stop: number,
    parseJson: boolean = true,
  ): Promise<T[]> {
    try {
      const values = await this.client.lrange(key, start, stop);

      if (parseJson) {
        return values.map((v) => {
          try {
            return JSON.parse(v) as T;
          } catch {
            return v as T;
          }
        });
      }

      return values as T[];
    } catch (error) {
      this.logger.error(`Failed to lrange ${key}:`, error);
      throw error;
    }
  }

  // #########################################################
  // SET OPERATIONS
  // #########################################################

  /**
   * Add one or more members to a set
   * @param key - Set key
   * @param members - Members to add
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.sadd(key, ...members);
    } catch (error) {
      this.logger.error(`Failed to sadd ${key}:`, error);
      throw error;
    }
  }

  /**
   * Remove one or more members from a set
   * @param key - Set key
   * @param members - Members to remove
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.srem(key, ...members);
    } catch (error) {
      this.logger.error(`Failed to srem ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if a member exists in a set
   * @param key - Set key
   * @param member - Member to check
   */
  async sismember(key: string, member: string): Promise<boolean> {
    try {
      const result = await this.client.sismember(key, member);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to sismember ${key} ${member}:`, error);
      throw error;
    }
  }

  /**
   * Get all members of a set
   * @param key - Set key
   */
  async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      this.logger.error(`Failed to smembers ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get the number of members in a set
   * @param key - Set key
   */
  async scard(key: string): Promise<number> {
    try {
      return await this.client.scard(key);
    } catch (error) {
      this.logger.error(`Failed to scard ${key}:`, error);
      throw error;
    }
  }

  // #########################################################
  // PUB/SUB OPERATIONS
  // #########################################################

  /**
   * Publish a message to a channel
   * @param channel - Channel name
   * @param message - Message to publish
   */
  async publish(channel: string, message: any): Promise<number> {
    try {
      const stringMessage =
        typeof message === 'string' ? message : JSON.stringify(message);
      return await this.client.publish(channel, stringMessage);
    } catch (error) {
      this.logger.error(`Failed to publish to channel ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to a channel
   * @param channel - Channel name
   * @param callback - Callback function for messages
   */
  async subscribe(
    channel: string,
    callback: (message: string) => void,
  ): Promise<void> {
    try {
      const subscriber = this.client.duplicate();
      await subscriber.connect();

      await subscriber.subscribe(channel);

      subscriber.on('message', (ch, message) => {
        if (ch === channel) {
          try {
            const parsed = JSON.parse(message);
            callback(parsed);
          } catch {
            callback(message);
          }
        }
      });
    } catch (error) {
      this.logger.error(`Failed to subscribe to channel ${channel}:`, error);
      throw error;
    }
  }

  // #########################################################
  // UTILITY OPERATIONS
  // #########################################################

  /**
   * Increment a key's value
   * @param key - Key to increment
   * @param amount - Amount to increment by (default: 1)
   */
  async incr(key: string, amount: number = 1): Promise<number> {
    try {
      if (amount === 1) {
        return await this.client.incr(key);
      } else {
        return await this.client.incrby(key, amount);
      }
    } catch (error) {
      this.logger.error(`Failed to incr ${key}:`, error);
      throw error;
    }
  }

  /**
   * Decrement a key's value
   * @param key - Key to decrement
   * @param amount - Amount to decrement by (default: 1)
   */
  async decr(key: string, amount: number = 1): Promise<number> {
    try {
      if (amount === 1) {
        return await this.client.decr(key);
      } else {
        return await this.client.decrby(key, amount);
      }
    } catch (error) {
      this.logger.error(`Failed to decr ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get multiple keys at once
   * @param keys - Array of keys
   * @param parseJson - Whether to parse JSON (default: true)
   */
  async mget<T = any>(
    keys: string[],
    parseJson: boolean = true,
  ): Promise<(T | null)[]> {
    try {
      const values = await this.client.mget(...keys);

      if (parseJson) {
        return values.map((v) => {
          if (v === null) return null;
          try {
            return JSON.parse(v) as T;
          } catch {
            return v as T;
          }
        });
      }

      return values as (T | null)[];
    } catch (error) {
      this.logger.error(`Failed to mget keys ${keys.join(', ')}:`, error);
      throw error;
    }
  }

  /**
   * Set multiple keys at once
   * @param data - Object with key-value pairs
   */
  async mset(data: Record<string, any>): Promise<void> {
    try {
      const keyValuePairs: string[] = [];
      for (const [key, value] of Object.entries(data)) {
        keyValuePairs.push(key);
        const stringValue =
          typeof value === 'string' ? value : JSON.stringify(value);
        keyValuePairs.push(stringValue);
      }
      await this.client.mset(...keyValuePairs);
    } catch (error) {
      this.logger.error('Failed to mset:', error);
      throw error;
    }
  }

  /**
   * Flush all keys (use with caution!)
   * @param pattern - Optional pattern to match (default: all keys)
   */
  async flushall(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        const keys = await this.getKeys(pattern);
        if (keys.length > 0) {
          await this.del(...keys);
        }
      } else {
        await this.client.flushall();
      }
    } catch (error) {
      this.logger.error('Failed to flushall:', error);
      throw error;
    }
  }

  // #########################################################
  // DISTRIBUTED LOCKING
  // #########################################################

  /**
   * Acquire a distributed lock
   * @param key - Lock key
   * @param options - Lock options
   * @returns Lock identifier if acquired, null otherwise
   */
  async acquireLock(key: string, options: DistributedLockOptions): Promise<string | null> {
    const lockId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const lockKey = this.keyBuilder.lock(key);
    const startTime = Date.now();

    while (Date.now() - startTime < options.timeout) {
      const result = await this.client.set(lockKey, lockId, 'PX', options.timeout, 'NX');
      
      if (result === 'OK') {
        return lockId;
      }

      // Wait before retrying
      await new Promise(resolve => 
        setTimeout(resolve, options.retryDelay || 100)
      );
    }

    return null;
  }

  /**
   * Release a distributed lock
   * @param key - Lock key
   * @param lockId - Lock identifier
   */
  async releaseLock(key: string, lockId: string): Promise<boolean> {
    const lockKey = this.keyBuilder.lock(key);
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = await this.client.eval(script, 1, lockKey, lockId) as number;
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to release lock ${key}:`, error);
      return false;
    }
  }

  /**
   * Execute a function with a distributed lock
   * @param key - Lock key
   * @param options - Lock options
   * @param fn - Function to execute
   */
  async withLock<T>(
    key: string,
    options: DistributedLockOptions,
    fn: () => Promise<T>
  ): Promise<T> {
    const lockId = await this.acquireLock(key, options);
    
    if (!lockId) {
      throw new Error(`Failed to acquire lock: ${key}`);
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(key, lockId);
    }
  }

  // #########################################################
  // RATE LIMITING
  // #########################################################

  /**
   * Check and increment rate limit
   * @param identifier - Unique identifier (e.g., userId, IP address)
   * @param action - Action being rate limited (e.g., 'login', 'api-call')
   * @param options - Rate limit options
   * @returns Object with allowed status and remaining requests
   */
  async checkRateLimit(
    identifier: string,
    action: string,
    options: RateLimitOptions
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = this.keyBuilder.rateLimit(identifier, action);
    const window = options.window;
    const limit = options.limit;

    try {
      const script = `
        local key = KEYS[1]
        local window = tonumber(ARGV[1])
        local limit = tonumber(ARGV[2])
        local current = redis.call('INCR', key)
        
        if current == 1 then
          redis.call('EXPIRE', key, window)
        end
        
        local ttl = redis.call('TTL', key)
        local remaining = math.max(0, limit - current)
        local resetAt = redis.call('TIME')[1] + ttl
        
        return {current, remaining, resetAt}
      `;

      const result = await this.client.eval(
        script,
        1,
        key,
        window.toString(),
        limit.toString()
      ) as [number, number, number];

      const [current, remaining, resetAt] = result;
      const allowed = current <= limit;

      return {
        allowed,
        remaining: Math.max(0, remaining),
        resetAt,
      };
    } catch (error) {
      this.logger.error(`Rate limit check failed for ${identifier}:${action}:`, error);
      // Fail open - allow request if Redis fails
      return {
        allowed: true,
        remaining: limit,
        resetAt: Date.now() + window * 1000,
      };
    }
  }

  // #########################################################
  // CACHE MANAGEMENT
  // #########################################################

  /**
   * Cache a value with tags for invalidation
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds
   * @param tags - Tags for invalidation
   */
  async cacheSet(
    key: string,
    value: any,
    ttl?: number,
    tags?: string[]
  ): Promise<void> {
    await this.set(key, value, ttl);

    if (tags && tags.length > 0) {
      // Store tags for this key
      const tagKey = this.keyBuilder.build('cache:tags', key);
      await this.set(tagKey, tags, ttl);

      // Add key to each tag's set
      for (const tag of tags) {
        const tagSetKey = this.keyBuilder.tag(tag);
        await this.sadd(tagSetKey, key);
        if (ttl) {
          await this.expire(tagSetKey, ttl);
        }
      }
    }
  }

  /**
   * Invalidate cache by tags
   * @param tags - Tags to invalidate
   */
  async invalidateByTags(...tags: string[]): Promise<number> {
    let deleted = 0;

    for (const tag of tags) {
      const tagSetKey = this.keyBuilder.tag(tag);
      const keys = await this.smembers(tagSetKey);

      if (keys.length > 0) {
        // Delete all keys with this tag
        deleted += await this.del(...keys);
        
        // Delete tag metadata
        for (const key of keys) {
          await this.del(this.keyBuilder.build('cache:tags', key));
        }

        // Delete tag set
        await this.del(tagSetKey);
      }
    }

    return deleted;
  }

  /**
   * Invalidate cache by pattern
   * @param pattern - Pattern to match (e.g., 'user:*')
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    const keys = await this.getKeys(pattern);
    if (keys.length === 0) {
      return 0;
    }
    return await this.del(...keys);
  }

  /**
   * Get or set cache value (cache-aside pattern)
   * @param key - Cache key
   * @param fn - Function to fetch value if not cached
   * @param ttl - Time to live in seconds
   * @param tags - Tags for invalidation
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number,
    tags?: string[]
  ): Promise<T> {
    const cached = await this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const value = await fn();
    await this.cacheSet(key, value, ttl, tags);
    
    return value;
  }

  // #########################################################
  // SORTED SETS OPERATIONS
  // #########################################################

  /**
   * Add member to sorted set
   * @param key - Sorted set key
   * @param score - Score
   * @param member - Member value
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    try {
      return await this.client.zadd(key, score, member);
    } catch (error) {
      this.logger.error(`Failed to zadd ${key}:`, error);
      throw error;
    }
  }

  /**
   * Add multiple members to sorted set
   * @param key - Sorted set key
   * @param members - Array of [score, member] pairs
   */
  async zaddMultiple(key: string, members: Array<[number, string]>): Promise<number> {
    try {
      const args: (number | string)[] = [];
      for (const [score, member] of members) {
        args.push(score, member);
      }
      return await this.client.zadd(key, ...args);
    } catch (error) {
      this.logger.error(`Failed to zaddMultiple ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get rank of member in sorted set
   * @param key - Sorted set key
   * @param member - Member value
   */
  async zrank(key: string, member: string): Promise<number | null> {
    try {
      const rank = await this.client.zrank(key, member);
      return rank === null ? null : rank;
    } catch (error) {
      this.logger.error(`Failed to zrank ${key} ${member}:`, error);
      throw error;
    }
  }

  /**
   * Get reverse rank of member in sorted set
   * @param key - Sorted set key
   * @param member - Member value
   */
  async zrevrank(key: string, member: string): Promise<number | null> {
    try {
      const rank = await this.client.zrevrank(key, member);
      return rank === null ? null : rank;
    } catch (error) {
      this.logger.error(`Failed to zrevrank ${key} ${member}:`, error);
      throw error;
    }
  }

  /**
   * Get range of members from sorted set
   * @param key - Sorted set key
   * @param start - Start index
   * @param stop - Stop index
   * @param withScores - Include scores in result
   */
  async zrange(
    key: string,
    start: number,
    stop: number,
    withScores: boolean = false
  ): Promise<string[] | Array<[string, number]>> {
    try {
      if (withScores) {
        const result = await this.client.zrange(key, start, stop, 'WITHSCORES') as unknown as string[];
        // Convert ['member1', 'score1', 'member2', 'score2'] to [['member1', score1], ['member2', score2]]
        const pairs: Array<[string, number]> = [];
        for (let i = 0; i < result.length; i += 2) {
          pairs.push([result[i], parseFloat(result[i + 1])]);
        }
        return pairs;
      }
      return await this.client.zrange(key, start, stop);
    } catch (error) {
      this.logger.error(`Failed to zrange ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get reverse range of members from sorted set
   * @param key - Sorted set key
   * @param start - Start index
   * @param stop - Stop index
   * @param withScores - Include scores in result
   */
  async zrevrange(
    key: string,
    start: number,
    stop: number,
    withScores: boolean = false
  ): Promise<string[] | Array<[string, number]>> {
    try {
      if (withScores) {
        const result = await this.client.zrevrange(key, start, stop, 'WITHSCORES') as unknown as string[];
        // Convert ['member1', 'score1', 'member2', 'score2'] to [['member1', score1], ['member2', score2]]
        const pairs: Array<[string, number]> = [];
        for (let i = 0; i < result.length; i += 2) {
          pairs.push([result[i], parseFloat(result[i + 1])]);
        }
        return pairs;
      }
      return await this.client.zrevrange(key, start, stop);
    } catch (error) {
      this.logger.error(`Failed to zrevrange ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get count of members in sorted set by score range
   * @param key - Sorted set key
   * @param min - Minimum score
   * @param max - Maximum score
   */
  async zcount(key: string, min: number, max: number): Promise<number> {
    try {
      return await this.client.zcount(key, min, max);
    } catch (error) {
      this.logger.error(`Failed to zcount ${key}:`, error);
      throw error;
    }
  }

  /**
   * Remove members from sorted set
   * @param key - Sorted set key
   * @param members - Members to remove
   */
  async zrem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.zrem(key, ...members);
    } catch (error) {
      this.logger.error(`Failed to zrem ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get score of member in sorted set
   * @param key - Sorted set key
   * @param member - Member value
   */
  async zscore(key: string, member: string): Promise<number | null> {
    try {
      const score = await this.client.zscore(key, member);
      return score === null ? null : parseFloat(score);
    } catch (error) {
      this.logger.error(`Failed to zscore ${key} ${member}:`, error);
      throw error;
    }
  }

  /**
   * Increment score of member in sorted set
   * @param key - Sorted set key
   * @param member - Member value
   * @param increment - Amount to increment
   */
  async zincrby(key: string, member: string, increment: number): Promise<number> {
    try {
      return parseFloat(await this.client.zincrby(key, increment, member));
    } catch (error) {
      this.logger.error(`Failed to zincrby ${key} ${member}:`, error);
      throw error;
    }
  }

  /**
   * Get cardinality of sorted set
   * @param key - Sorted set key
   */
  async zcard(key: string): Promise<number> {
    try {
      return await this.client.zcard(key);
    } catch (error) {
      this.logger.error(`Failed to zcard ${key}:`, error);
      throw error;
    }
  }

  /**
   * Remove members from sorted set by score range
   * @param key - Sorted set key
   * @param min - Minimum score
   * @param max - Maximum score
   */
  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    try {
      return await this.client.zremrangebyscore(key, min, max);
    } catch (error) {
      this.logger.error(`Failed to zremrangebyscore ${key}:`, error);
      throw error;
    }
  }

  /**
   * Execute Lua script
   * @param script - Lua script
   * @param numKeys - Number of keys
   * @param keys - Key arguments
   * @param args - Additional arguments
   */
  async eval(
    script: string,
    numKeys: number,
    ...keysAndArgs: (string | number)[]
  ): Promise<unknown> {
    try {
      return await this.client.eval(script, numKeys, ...keysAndArgs.map(String));
    } catch (error) {
      this.logger.error(`Failed to execute Lua script:`, error);
      throw error;
    }
  }

  // #########################################################
  // PIPELINE & TRANSACTIONS
  // #########################################################

  /**
   * Execute multiple commands in a pipeline (faster than individual calls)
   * @param commands - Array of command functions
   */
  async pipeline<T = any>(commands: Array<(client: Redis | Cluster) => Promise<T>>): Promise<T[]> {
    const pipeline = this.client.pipeline();
    const results: T[] = [];

    for (const command of commands) {
      results.push(await command(this.client));
    }

    await pipeline.exec();
    return results;
  }

  /**
   * Execute commands in a transaction (all or nothing)
   * @param commands - Array of command functions
   */
  async transaction<T = any>(commands: Array<(client: Redis | Cluster) => Promise<T>>): Promise<T[]> {
    const multi = this.client.multi();
    const results: T[] = [];

    for (const command of commands) {
      const result = await command(this.client);
      results.push(result);
    }

    await multi.exec();
    return results;
  }

  // #########################################################
  // HYPERLOGLOG OPERATIONS
  // #########################################################

  /**
   * Add elements to HyperLogLog
   * @param key - HyperLogLog key
   * @param elements - Elements to add
   */
  async pfadd(key: string, ...elements: string[]): Promise<number> {
    try {
      return await this.client.pfadd(key, ...elements);
    } catch (error) {
      this.logger.error(`Failed to pfadd ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get approximate count of unique elements in HyperLogLog
   * @param key - HyperLogLog key
   */
  async pfcount(key: string): Promise<number> {
    try {
      return await this.client.pfcount(key);
    } catch (error) {
      this.logger.error(`Failed to pfcount ${key}:`, error);
      throw error;
    }
  }

  /**
   * Merge multiple HyperLogLogs
   * @param destKey - Destination key
   * @param sourceKeys - Source keys to merge
   */
  async pfmerge(destKey: string, ...sourceKeys: string[]): Promise<void> {
    try {
      await this.client.pfmerge(destKey, ...sourceKeys);
    } catch (error) {
      this.logger.error(`Failed to pfmerge ${destKey}:`, error);
      throw error;
    }
  }

  // #########################################################
  // STREAMS OPERATIONS
  // #########################################################

  /**
   * Add entry to stream
   * @param key - Stream key
   * @param fields - Fields to add
   * @param id - Optional entry ID (default: auto-generate)
   */
  async xadd(
    key: string,
    fields: Record<string, string>,
    id?: string
  ): Promise<string> {
    try {
      const args: (string | number)[] = [];
      if (id) {
        args.push(id);
      }
      
      for (const [field, value] of Object.entries(fields)) {
        args.push(field, value);
      }

      return await this.client.xadd(key, '*', ...args) as string;
    } catch (error) {
      this.logger.error(`Failed to xadd ${key}:`, error);
      throw error;
    }
  }

  /**
   * Read entries from stream
   * @param key - Stream key
   * @param startId - Start ID (use '-' for beginning, '+' for end)
   * @param count - Maximum number of entries
   */
  async xread(
    key: string,
    startId: string = '0',
    count?: number
  ): Promise<Array<{ id: string; fields: Record<string, string> }>> {
    try {
      let result: any[];
      if (count) {
        result = await this.client.xread('COUNT', count, 'STREAMS', key, startId) as any[];
      } else {
        result = await this.client.xread('STREAMS', key, startId) as any[];
      }
      if (!result || result.length === 0) {
        return [];
      }

      const entries: Array<{ id: string; fields: Record<string, string> }> = [];
      for (const [, streamData] of result) {
        for (const [id, fieldArray] of streamData) {
          const fields: Record<string, string> = {};
          for (let i = 0; i < fieldArray.length; i += 2) {
            fields[fieldArray[i]] = fieldArray[i + 1];
          }
          entries.push({ id, fields });
        }
      }

      return entries;
    } catch (error) {
      this.logger.error(`Failed to xread ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get stream length
   * @param key - Stream key
   */
  async xlen(key: string): Promise<number> {
    try {
      return await this.client.xlen(key);
    } catch (error) {
      this.logger.error(`Failed to xlen ${key}:`, error);
      throw error;
    }
  }

  // #########################################################
  // GEOSPATIAL OPERATIONS
  // #########################################################

  /**
   * Add geospatial member
   * @param key - Geospatial set key
   * @param longitude - Longitude
   * @param latitude - Latitude
   * @param member - Member identifier
   */
  async geoadd(
    key: string,
    longitude: number,
    latitude: number,
    member: string
  ): Promise<number> {
    try {
      return await this.client.geoadd(key, longitude, latitude, member);
    } catch (error) {
      this.logger.error(`Failed to geoadd ${key} ${member}:`, error);
      throw error;
    }
  }

  /**
   * Get distance between two geospatial members
   * @param key - Geospatial set key
   * @param member1 - First member
   * @param member2 - Second member
   * @param unit - Unit (m, km, mi, ft)
   */
  async geodist(
    key: string,
    member1: string,
    member2: string,
    unit: 'm' | 'km' | 'mi' | 'ft' = 'km'
  ): Promise<number | null> {
    try {
      const distance = await this.client.geodist(key, member1, member2, unit as any);
      return distance === null ? null : parseFloat(distance);
    } catch (error) {
      this.logger.error(`Failed to geodist ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get geohash of member
   * @param key - Geospatial set key
   * @param member - Member identifier
   */
  async geohash(key: string, member: string): Promise<string | null> {
    try {
      const result = await this.client.geohash(key, member);
      return result === null ? null : result[0];
    } catch (error) {
      this.logger.error(`Failed to geohash ${key} ${member}:`, error);
      throw error;
    }
  }

  /**
   * Get position (longitude, latitude) of member
   * @param key - Geospatial set key
   * @param member - Member identifier
   */
  async geopos(key: string, member: string): Promise<[number, number] | null> {
    try {
      const result = await this.client.geopos(key, member);
      if (!result || result.length === 0 || !result[0]) {
        return null;
      }
      const [lon, lat] = result[0];
      return [parseFloat(lon), parseFloat(lat)];
    } catch (error) {
      this.logger.error(`Failed to geopos ${key} ${member}:`, error);
      throw error;
    }
  }

  /**
   * Find members within radius
   * @param key - Geospatial set key
   * @param longitude - Center longitude
   * @param latitude - Center latitude
   * @param radius - Radius
   * @param unit - Unit (m, km, mi, ft)
   * @param options - Options (WITHCOORD, WITHDIST, WITHHASH, COUNT)
   */
  async georadius(
    key: string,
    longitude: number,
    latitude: number,
    radius: number,
    unit: 'm' | 'km' | 'mi' | 'ft' = 'km',
    options?: {
      withCoord?: boolean;
      withDist?: boolean;
      withHash?: boolean;
      count?: number;
      sort?: 'ASC' | 'DESC';
    }
  ): Promise<any[]> {
    try {
      const args: any[] = [key, longitude, latitude, radius, unit];
      
      if (options?.withCoord) args.push('WITHCOORD');
      if (options?.withDist) args.push('WITHDIST');
      if (options?.withHash) args.push('WITHHASH');
      if (options?.count) {
        args.push('COUNT', options.count);
      }
      if (options?.sort) {
        args.push(options.sort);
      }

      return await (this.client.georadius as any)(...args);
    } catch (error) {
      this.logger.error(`Failed to georadius ${key}:`, error);
      throw error;
    }
  }

  // #########################################################
  // METRICS & MONITORING
  // #########################################################

  /**
   * Track cache hit
   */
  async trackCacheHit(_key: string): Promise<void> {
    const metricsKey = this.keyBuilder.build('metrics', 'cache', 'hits');
    await this.incr(metricsKey);
    await this.expire(metricsKey, 86400); // 24 hours
  }

  /**
   * Track cache miss
   */
  async trackCacheMiss(_key: string): Promise<void> {
    const metricsKey = this.keyBuilder.build('metrics', 'cache', 'misses');
    await this.incr(metricsKey);
    await this.expire(metricsKey, 86400); // 24 hours
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ hits: number; misses: number; hitRate: number }> {
    const hitsKey = this.keyBuilder.build('metrics', 'cache', 'hits');
    const missesKey = this.keyBuilder.build('metrics', 'cache', 'misses');
    
    const hits = (await this.get<number>(hitsKey, false)) || 0;
    const misses = (await this.get<number>(missesKey, false)) || 0;
    const total = hits + misses;
    const hitRate = total > 0 ? hits / total : 0;

    return { hits, misses, hitRate };
  }

  /**
   * Get Redis info
   */
  async getInfo(section?: string): Promise<string> {
    try {
      if (section) {
        return await this.client.info(section);
      }
      return await this.client.info();
    } catch (error) {
      this.logger.error('Failed to get Redis info:', error);
      throw error;
    }
  }

  /**
   * Get memory usage statistics
   */
  async getMemoryStats(): Promise<{
    used: number;
    peak: number;
    fragmentation: number;
  }> {
    try {
      const info = await this.getInfo('memory');
      const lines = info.split('\r\n');
      const stats: any = {};

      for (const line of lines) {
        if (line.includes('used_memory:')) {
          stats.used = parseInt(line.split(':')[1]);
        } else if (line.includes('used_memory_peak:')) {
          stats.peak = parseInt(line.split(':')[1]);
        } else if (line.includes('mem_fragmentation_ratio:')) {
          stats.fragmentation = parseFloat(line.split(':')[1]);
        }
      }

      return {
        used: stats.used || 0,
        peak: stats.peak || 0,
        fragmentation: stats.fragmentation || 0,
      };
    } catch (error) {
      this.logger.error('Failed to get memory stats:', error);
      throw error;
    }
  }
}
