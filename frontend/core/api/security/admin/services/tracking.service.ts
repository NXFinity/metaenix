import { apiClient } from '@/lib/api/client';
import { ADMIN_ENDPOINTS } from '../admin.endpoints';
import type {
  PlatformActivity,
  PlatformStats,
  SystemLog,
  LogExport,
} from '../types/admin.type';
import type { PaginationParams, PaginationResponse } from '@/core/api/users/posts/types/post.type';

/**
 * Admin Tracking Service
 * 
 * Handles all admin tracking and logging operations including:
 * - Platform activity
 * - Platform statistics
 * - System logs
 * - Error logs
 * - Log export
 */
export const adminTrackingService = {
  /**
   * Get platform activity
   */
  async getActivity(
    params?: PaginationParams & { days?: number },
  ): Promise<PaginationResponse<PlatformActivity>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.days) queryParams.append('days', params.days.toString());

    const response = await apiClient.get<PaginationResponse<PlatformActivity>>(
      `${ADMIN_ENDPOINTS.GET_TRACKING_ACTIVITY}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
    );
    return response.data;
  },

  /**
   * Get platform statistics
   */
  async getStats(): Promise<PlatformStats> {
    const response = await apiClient.get<PlatformStats>(ADMIN_ENDPOINTS.GET_TRACKING_STATS);
    return response.data;
  },

  /**
   * Get system logs
   */
  async getSystemLogs(
    params?: PaginationParams & { level?: string },
  ): Promise<PaginationResponse<SystemLog>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.level) queryParams.append('level', params.level);

    const response = await apiClient.get<PaginationResponse<SystemLog>>(
      `${ADMIN_ENDPOINTS.GET_SYSTEM_LOGS}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
    );
    return response.data;
  },

  /**
   * Get error logs
   */
  async getErrorLogs(params?: PaginationParams): Promise<PaginationResponse<SystemLog>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get<PaginationResponse<SystemLog>>(
      `${ADMIN_ENDPOINTS.GET_ERROR_LOGS}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
    );
    return response.data;
  },

  /**
   * Export logs
   */
  async exportLogs(
    format: 'csv' | 'json' = 'json',
    type?: 'system' | 'error' | 'audit',
  ): Promise<LogExport> {
    const queryParams = new URLSearchParams();
    queryParams.append('format', format);
    if (type) queryParams.append('type', type);

    const response = await apiClient.get<LogExport>(
      `${ADMIN_ENDPOINTS.EXPORT_LOGS}?${queryParams.toString()}`,
    );
    return response.data;
  },
};

