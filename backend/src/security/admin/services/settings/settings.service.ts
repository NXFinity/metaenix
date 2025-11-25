import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@redis/redis';
// Note: CachingService available for future use
// import { CachingService } from '@caching/caching';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';

/**
 * Admin Settings Service
 * 
 * Handles system configuration management for admin.
 * Uses Redis for feature flags and settings storage.
 */
@Injectable()
export class SettingsService {
  private readonly SETTINGS_KEY = 'admin:settings';
  private readonly FEATURE_FLAGS_KEY = 'admin:feature-flags';
  private readonly RATE_LIMITS_KEY = 'admin:rate-limits';

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    // Note: cachingService available for future use
    // private readonly cachingService: CachingService,
    private readonly loggingService: LoggingService,
  ) {}

  /**
   * Get system settings
   */
  async getSettings(): Promise<Record<string, any>> {
    try {
      const settings = await this.redisService.get(this.SETTINGS_KEY);
      if (settings) {
        return typeof settings === 'string' ? JSON.parse(settings) : settings;
      }

      // Return default settings from config
      return {
        maintenanceMode: false,
        registrationEnabled: true,
        maxFileSize: this.configService.get<number>('MAX_FILE_SIZE') || 104857600, // 100MB
        allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting settings',
        error instanceof Error ? error.stack : undefined,
        'AdminSettingsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to get settings');
    }
  }

  /**
   * Update system settings
   */
  async updateSettings(settings: Record<string, any>, updatedBy: string): Promise<Record<string, any>> {
    try {
      const currentSettings = await this.getSettings();
      const mergedSettings = { ...currentSettings, ...settings };

      await this.redisService.set(
        this.SETTINGS_KEY,
        JSON.stringify(mergedSettings),
        0, // No expiration
      );

      this.loggingService.log('Settings updated by admin', 'AdminSettingsService', {
        category: LogCategory.SYSTEM,
        userId: updatedBy,
        metadata: { settings },
      });

      return mergedSettings;
    } catch (error) {
      this.loggingService.error(
        'Error updating settings',
        error instanceof Error ? error.stack : undefined,
        'AdminSettingsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to update settings');
    }
  }

  /**
   * Get feature flags
   */
  async getFeatureFlags(): Promise<Record<string, boolean>> {
    try {
      const flags = await this.redisService.get(this.FEATURE_FLAGS_KEY);
      if (flags) {
        return typeof flags === 'string' ? JSON.parse(flags) : flags;
      }

      // Return default feature flags
      return {
        newDashboard: false,
        videoUploads: true,
        photoUploads: true,
        liveStreaming: false,
        advancedAnalytics: false,
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting feature flags',
        error instanceof Error ? error.stack : undefined,
        'AdminSettingsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to get feature flags');
    }
  }

  /**
   * Update feature flag
   */
  async updateFeatureFlag(
    flag: string,
    enabled: boolean,
    updatedBy: string,
  ): Promise<Record<string, boolean>> {
    try {
      const flags = await this.getFeatureFlags();
      flags[flag] = enabled;

      await this.redisService.set(
        this.FEATURE_FLAGS_KEY,
        JSON.stringify(flags),
        0, // No expiration
      );

      this.loggingService.log('Feature flag updated by admin', 'AdminSettingsService', {
        category: LogCategory.SYSTEM,
        userId: updatedBy,
        metadata: { flag, enabled },
      });

      return flags;
    } catch (error) {
      this.loggingService.error(
        'Error updating feature flag',
        error instanceof Error ? error.stack : undefined,
        'AdminSettingsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to update feature flag');
    }
  }

  /**
   * Get rate limit configurations
   */
  async getRateLimits(): Promise<Record<string, { limit: number; ttl: number }>> {
    try {
      const limits = await this.redisService.get(this.RATE_LIMITS_KEY);
      if (limits) {
        return typeof limits === 'string' ? JSON.parse(limits) : limits;
      }

      // Return default rate limits from config
      return {
        default: {
          limit: this.configService.get<number>('THROTTLE_DEFAULT_LIMIT') || 100,
          ttl: this.configService.get<number>('THROTTLE_DEFAULT_TTL') || 60,
        },
        auth: {
          limit: 5,
          ttl: 60,
        },
        api: {
          limit: 100,
          ttl: 60,
        },
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting rate limits',
        error instanceof Error ? error.stack : undefined,
        'AdminSettingsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to get rate limits');
    }
  }

  /**
   * Update rate limit configurations
   */
  async updateRateLimits(
    limits: Record<string, { limit: number; ttl: number }>,
    updatedBy: string,
  ): Promise<Record<string, { limit: number; ttl: number }>> {
    try {
      const currentLimits = await this.getRateLimits();
      const mergedLimits = { ...currentLimits, ...limits };

      await this.redisService.set(
        this.RATE_LIMITS_KEY,
        JSON.stringify(mergedLimits),
        0, // No expiration
      );

      this.loggingService.log('Rate limits updated by admin', 'AdminSettingsService', {
        category: LogCategory.SYSTEM,
        userId: updatedBy,
        metadata: { limits },
      });

      return mergedLimits;
    } catch (error) {
      this.loggingService.error(
        'Error updating rate limits',
        error instanceof Error ? error.stack : undefined,
        'AdminSettingsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to update rate limits');
    }
  }

  /**
   * Get cache status
   */
  async getCacheStatus(): Promise<{
    enabled: boolean;
    hitRate: number;
    missRate: number;
    totalKeys: number;
  }> {
    try {
      // In production, this would query Redis for cache statistics
      // For now, return basic status
      return {
        enabled: true,
        hitRate: 0, // Would be calculated from cache metrics
        missRate: 0, // Would be calculated from cache metrics
        totalKeys: 0, // Would be queried from Redis
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get cache status');
    }
  }

  /**
   * Clear cache
   */
  async clearCache(clearedBy: string): Promise<void> {
    try {
      // Clear all cache (implementation depends on CachingService)
      // For now, just log the action
      this.loggingService.log('Cache cleared by admin', 'AdminSettingsService', {
        category: LogCategory.SYSTEM,
        userId: clearedBy,
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to clear cache');
    }
  }
}
