import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@redis/redis';
import { RateLimitOptions } from '@redis/redis';
import { ThrottleResult } from './interfaces/throttle-options.interface';

@Injectable()
export class ThrottleService {
  private readonly logger = new Logger(ThrottleService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Check rate limit for an identifier and action
   * @param identifier - Unique identifier (e.g., userId, IP address)
   * @param action - Action being rate limited (e.g., 'login', 'api-call')
   * @param options - Rate limit options
   * @returns Throttle result with allowed status and metadata
   */
  async checkRateLimit(
    identifier: string,
    action: string,
    options: RateLimitOptions,
  ): Promise<ThrottleResult> {
    try {
      const result = await this.redisService.checkRateLimit(
        identifier,
        action,
        options,
      );

      return {
        allowed: result.allowed,
        remaining: result.remaining,
        resetAt: result.resetAt,
        current: options.limit - result.remaining,
        limit: options.limit,
      };
    } catch (error) {
      this.logger.error(
        `Rate limit check failed for ${identifier}:${action}:`,
        error,
      );
      // Fail open - allow request if Redis fails
      return {
        allowed: true,
        remaining: options.limit,
        resetAt: Math.floor(Date.now() / 1000) + options.window,
        current: 0,
        limit: options.limit,
      };
    }
  }

  /**
   * Reset rate limit for an identifier and action
   * @param identifier - Unique identifier
   * @param action - Action name
   */
  async resetRateLimit(identifier: string, action: string): Promise<void> {
    try {
      const key = this.redisService.keyBuilder.rateLimit(identifier, action);
      await this.redisService.del(key);
    } catch (error) {
      this.logger.error(
        `Failed to reset rate limit for ${identifier}:${action}:`,
        error,
      );
    }
  }

  /**
   * Get current rate limit status
   * @param identifier - Unique identifier
   * @param action - Action name
   * @param options - Rate limit options
   */
  async getRateLimitStatus(
    identifier: string,
    action: string,
    options: RateLimitOptions,
  ): Promise<ThrottleResult> {
    return this.checkRateLimit(identifier, action, options);
  }
}
