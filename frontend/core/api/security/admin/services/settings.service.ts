import { apiClient } from '@/lib/api/client';
import { ADMIN_ENDPOINTS } from '../admin.endpoints';
import type {
  SystemSettings,
  FeatureFlags,
  RateLimits,
  CacheStatus,
} from '../types/admin.type';

/**
 * Admin Settings Service
 * 
 * Handles all admin settings operations including:
 * - System settings
 * - Feature flags
 * - Rate limits
 * - Cache management
 */
export const adminSettingsService = {
  /**
   * Get system settings
   */
  async getSettings(): Promise<SystemSettings> {
    const response = await apiClient.get<SystemSettings>(ADMIN_ENDPOINTS.GET_SETTINGS);
    return response.data;
  },

  /**
   * Update system settings
   */
  async updateSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
    const response = await apiClient.patch<SystemSettings>(
      ADMIN_ENDPOINTS.UPDATE_SETTINGS,
      data,
    );
    return response.data;
  },

  /**
   * Get feature flags
   */
  async getFeatureFlags(): Promise<FeatureFlags> {
    const response = await apiClient.get<FeatureFlags>(
      ADMIN_ENDPOINTS.GET_FEATURE_FLAGS,
    );
    return response.data;
  },

  /**
   * Update feature flag
   */
  async updateFeatureFlag(
    flag: string,
    enabled: boolean,
  ): Promise<FeatureFlags> {
    const response = await apiClient.patch<FeatureFlags>(
      ADMIN_ENDPOINTS.UPDATE_FEATURE_FLAG(flag),
      { enabled },
    );
    return response.data;
  },

  /**
   * Get rate limits
   */
  async getRateLimits(): Promise<RateLimits> {
    const response = await apiClient.get<RateLimits>(ADMIN_ENDPOINTS.GET_RATE_LIMITS);
    return response.data;
  },

  /**
   * Update rate limits
   */
  async updateRateLimits(data: RateLimits): Promise<RateLimits> {
    const response = await apiClient.patch<RateLimits>(
      ADMIN_ENDPOINTS.UPDATE_RATE_LIMITS,
      data,
    );
    return response.data;
  },

  /**
   * Get cache status
   */
  async getCacheStatus(): Promise<CacheStatus> {
    const response = await apiClient.get<CacheStatus>(ADMIN_ENDPOINTS.GET_CACHE_STATUS);
    return response.data;
  },

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    await apiClient.post(ADMIN_ENDPOINTS.CLEAR_CACHE);
  },
};

