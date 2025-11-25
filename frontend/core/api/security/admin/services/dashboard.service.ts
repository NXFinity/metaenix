import { apiClient } from '@/lib/api/client';
import { ADMIN_ENDPOINTS } from '../admin.endpoints';
import type {
  PlatformStats,
  SystemHealth,
  PlatformActivity,
  GrowthMetrics,
} from '../types/admin.type';
import type { PaginationParams, PaginationResponse } from '@/core/api/users/posts/types/post.type';

/**
 * Admin Dashboard Service
 * 
 * Handles all admin dashboard operations including:
 * - Platform statistics
 * - System health
 * - Platform activity
 * - Growth metrics
 */
export const adminDashboardService = {
  /**
   * Get platform-wide statistics
   */
  async getStats(): Promise<PlatformStats> {
    const response = await apiClient.get<PlatformStats>(ADMIN_ENDPOINTS.GET_STATS);
    return response.data;
  },

  /**
   * Get system health status
   */
  async getHealth(): Promise<SystemHealth> {
    const response = await apiClient.get<SystemHealth>(ADMIN_ENDPOINTS.GET_HEALTH);
    return response.data;
  },

  /**
   * Get recent platform activity
   */
  async getActivity(
    params?: PaginationParams & { days?: number },
  ): Promise<PaginationResponse<PlatformActivity>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.days) queryParams.append('days', params.days.toString());

    const response = await apiClient.get<PaginationResponse<PlatformActivity>>(
      `${ADMIN_ENDPOINTS.GET_ACTIVITY}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
    );
    return response.data;
  },

  /**
   * Get growth metrics
   */
  async getGrowth(days: number = 30): Promise<GrowthMetrics> {
    const response = await apiClient.get<GrowthMetrics>(
      `${ADMIN_ENDPOINTS.GET_GROWTH}?days=${days}`,
    );
    return response.data;
  },
};

