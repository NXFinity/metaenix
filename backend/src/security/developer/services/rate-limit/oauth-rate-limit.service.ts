import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@redis/redis';
import { ApplicationEnvironment } from '../../assets/enum/application-environment.enum';
import { Application } from '../../assets/entities/application.entity';

export interface OAuthRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp
  limit: number;
  current: number;
}

export interface OAuthRateLimitOptions {
  limit?: number; // Override default limit
  window?: number; // Window in seconds (default: 3600 = 1 hour)
}

@Injectable()
export class OAuthRateLimitService {
  private readonly logger = new Logger(OAuthRateLimitService.name);

  // Default rate limits per hour
  private readonly DEFAULT_DEVELOPMENT_LIMIT = 1000; // requests/hour
  private readonly DEFAULT_PRODUCTION_LIMIT = 10000; // requests/hour
  private readonly DEFAULT_WINDOW_SECONDS = 3600; // 1 hour

  constructor(private readonly redisService: RedisService) {}

  /**
   * Check rate limit for OAuth application request
   * Uses sliding window algorithm with Redis sorted sets
   *
   * @param application - Application making the request
   * @param userId - User ID (null for client credentials)
   * @param endpoint - Endpoint being accessed (optional, for per-endpoint limits)
   * @param options - Override options
   * @returns Rate limit result
   */
  async checkRateLimit(
    application: Application,
    userId: string | null,
    endpoint?: string,
    options?: OAuthRateLimitOptions,
  ): Promise<OAuthRateLimitResult> {
    // Determine limit based on environment or override
    const limit =
      options?.limit ||
      application.rateLimit ||
      (application.environment === ApplicationEnvironment.PRODUCTION
        ? this.DEFAULT_PRODUCTION_LIMIT
        : this.DEFAULT_DEVELOPMENT_LIMIT);

    const window = options?.window || this.DEFAULT_WINDOW_SECONDS;

    // Build Redis key
    const key = this.buildRateLimitKey(application.clientId, userId, endpoint);

    try {
      // Use sliding window algorithm with sorted sets
      const now = Math.floor(Date.now() / 1000); // Current Unix timestamp in seconds
      // const windowStart = now - window; // Start of sliding window - Reserved for future use

      // Use Redis Lua script for atomic operations
      const script = `
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local limit = tonumber(ARGV[3])
        local windowStart = now - window
        
        -- Remove old entries outside the window
        redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
        
        -- Add current request with timestamp as score
        redis.call('ZADD', key, now, now)
        
        -- Set expiration (window + 1 hour buffer)
        redis.call('EXPIRE', key, window + 3600)
        
        -- Count requests in current window
        local count = redis.call('ZCOUNT', key, windowStart, now)
        
        -- Calculate remaining and reset time
        local remaining = math.max(0, limit - count)
        local resetAt = now + window
        
        return {count, remaining, resetAt, limit}
      `;

      const result = await this.redisService.eval(
        script,
        1,
        key,
        now,
        window,
        limit,
      ) as [number, number, number, number];

      const [current, remaining, resetAt, actualLimit] = result;
      const allowed = current <= limit;

      return {
        allowed,
        remaining: Math.max(0, remaining),
        resetAt,
        limit: actualLimit,
        current,
      };
    } catch (error) {
      this.logger.error(
        `Rate limit check failed for app ${application.clientId}, user ${userId || 'client-credentials'}:`,
        error,
      );
      // Fail open - allow request if Redis fails
      const now = Math.floor(Date.now() / 1000);
      return {
        allowed: true,
        remaining: limit,
        resetAt: now + window,
        limit,
        current: 0,
      };
    }
  }

  /**
   * Build Redis key for rate limiting
   * Format: rate_limit:oauth:app:{clientId}:user:{userId}:{endpoint}
   * For client credentials: rate_limit:oauth:app:{clientId}:endpoint:{endpoint}
   */
  private buildRateLimitKey(
    clientId: string,
    userId: string | null,
    endpoint?: string,
  ): string {
    const parts = ['rate_limit', 'oauth', 'app', clientId];

    if (userId) {
      parts.push('user', userId);
    } else {
      parts.push('client-credentials');
    }

    if (endpoint) {
      // Normalize endpoint (remove query params, method prefix)
      const normalizedEndpoint = endpoint
        .replace(/^[A-Z]+ /, '') // Remove method prefix
        .replace(/\?.*$/, '') // Remove query params
        .replace(/\/+/g, '/') // Normalize slashes
        .replace(/^\/|\/$/g, ''); // Remove leading/trailing slashes
      parts.push('endpoint', normalizedEndpoint);
    }

    return parts.join(':');
  }

  /**
   * Get rate limit status without incrementing
   * Useful for checking limits before making requests
   */
  async getRateLimitStatus(
    application: Application,
    userId: string | null,
    endpoint?: string,
  ): Promise<OAuthRateLimitResult> {
    const limit =
      application.rateLimit ||
      (application.environment === ApplicationEnvironment.PRODUCTION
        ? this.DEFAULT_PRODUCTION_LIMIT
        : this.DEFAULT_DEVELOPMENT_LIMIT);

    const window = this.DEFAULT_WINDOW_SECONDS;
    const key = this.buildRateLimitKey(application.clientId, userId, endpoint);

    try {
      const now = Math.floor(Date.now() / 1000);
      const windowStart = now - window;

      // Count requests in current window without adding new request
      const current = await this.redisService.zcount(key, windowStart, now);

      const remaining = Math.max(0, limit - current);
      const resetAt = now + window;

      return {
        allowed: current < limit,
        remaining,
        resetAt,
        limit,
        current,
      };
    } catch (error) {
      this.logger.error(
        `Rate limit status check failed for app ${application.clientId}:`,
        error,
      );
      // Fail open
      const now = Math.floor(Date.now() / 1000);
      return {
        allowed: true,
        remaining: limit,
        resetAt: now + window,
        limit,
        current: 0,
      };
    }
  }
}

