import { apiClient } from '@/lib/api/client';
import { ADMIN_ENDPOINTS } from '../admin.endpoints';
import type {
  AnalyticsOverview,
  UserAnalytics,
  ContentAnalytics,
  EngagementMetrics,
  ReportAnalytics,
  AnalyticsExport,
  GrowthMetrics,
} from '../types/admin.type';

/**
 * Admin Analytics Service
 * 
 * Handles all admin analytics operations including:
 * - Platform-wide analytics overview
 * - User analytics
 * - Content analytics
 * - Engagement metrics
 * - Report analytics
 * - Growth metrics
 * - Analytics export
 */
export const adminAnalyticsService = {
  /**
   * Get platform-wide analytics overview
   */
  async getOverview(): Promise<AnalyticsOverview> {
    const response = await apiClient.get<AnalyticsOverview>(
      ADMIN_ENDPOINTS.GET_ANALYTICS_OVERVIEW,
    );
    return response.data;
  },

  /**
   * Get user analytics
   */
  async getUsers(days: number = 30): Promise<UserAnalytics> {
    const response = await apiClient.get<UserAnalytics>(
      `${ADMIN_ENDPOINTS.GET_ANALYTICS_USERS}?days=${days}`,
    );
    return response.data;
  },

  /**
   * Get content analytics
   */
  async getContent(): Promise<ContentAnalytics> {
    const response = await apiClient.get<ContentAnalytics>(
      ADMIN_ENDPOINTS.GET_ANALYTICS_CONTENT,
    );
    return response.data;
  },

  /**
   * Get engagement metrics
   */
  async getEngagement(days: number = 30): Promise<EngagementMetrics> {
    const response = await apiClient.get<EngagementMetrics>(
      `${ADMIN_ENDPOINTS.GET_ANALYTICS_ENGAGEMENT}?days=${days}`,
    );
    return response.data;
  },

  /**
   * Get report analytics
   */
  async getReports(): Promise<ReportAnalytics> {
    const response = await apiClient.get<ReportAnalytics>(
      ADMIN_ENDPOINTS.GET_ANALYTICS_REPORTS,
    );
    return response.data;
  },

  /**
   * Get growth metrics
   */
  async getGrowth(days: number = 30): Promise<GrowthMetrics> {
    const response = await apiClient.get<GrowthMetrics>(
      `${ADMIN_ENDPOINTS.GET_ANALYTICS_GROWTH}?days=${days}`,
    );
    return response.data;
  },

  /**
   * Export analytics data
   */
  async export(format: 'csv' | 'json' = 'json'): Promise<AnalyticsExport> {
    const response = await apiClient.get<AnalyticsExport>(
      `${ADMIN_ENDPOINTS.EXPORT_ANALYTICS}?format=${format}`,
    );
    return response.data;
  },
};

