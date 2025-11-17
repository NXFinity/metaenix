import { apiClient } from '@/lib/api/client';
import { FOLLOWS_ENDPOINTS } from './follows.endpoints';
import type {
  Follow,
  FollowUser,
  PaginationParams,
  PaginationResponse,
  FollowResponse,
  UnfollowResponse,
  FollowStatusResponse,
  BatchFollowStatusResponse,
  BatchFollowStatusRequest,
  FollowStats,
  FollowAnalytics,
  EnhancedFollowAnalytics,
  FollowSuggestion,
  FollowHistory,
} from './types/follow.type';

/**
 * Follows Service
 * 
 * Handles all follow-related API calls including:
 * - Following/unfollowing users
 * - Getting followers and following lists
 * - Follow status checks
 * - Follow suggestions
 * - Follow statistics and analytics
 * - Export functionality
 */
export const followsService = {
  /**
   * Follow a user
   * @param userId - User ID to follow
   * @returns Follow response
   */
  async follow(userId: string): Promise<FollowResponse> {
    const response = await apiClient.post<FollowResponse>(
      FOLLOWS_ENDPOINTS.FOLLOW(userId),
    );
    return response.data;
  },

  /**
   * Unfollow a user
   * @param userId - User ID to unfollow
   * @returns Unfollow response
   */
  async unfollow(userId: string): Promise<UnfollowResponse> {
    const response = await apiClient.delete<UnfollowResponse>(
      FOLLOWS_ENDPOINTS.UNFOLLOW(userId),
    );
    return response.data;
  },

  /**
   * Get users that a user is following
   * @param userId - User ID
   * @param params - Pagination and filter parameters
   * @returns Paginated following list
   */
  async getFollowing(
    userId: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<FollowUser>> {
    const response = await apiClient.get<PaginationResponse<FollowUser>>(
      FOLLOWS_ENDPOINTS.GET_FOLLOWING(userId),
      { params },
    );
    return response.data;
  },

  /**
   * Get followers of a user
   * @param userId - User ID
   * @param params - Pagination and filter parameters
   * @returns Paginated followers list
   */
  async getFollowers(
    userId: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<FollowUser>> {
    const response = await apiClient.get<PaginationResponse<FollowUser>>(
      FOLLOWS_ENDPOINTS.GET_FOLLOWERS(userId),
      { params },
    );
    return response.data;
  },

  /**
   * Batch check follow status for multiple users
   * @param data - Array of user IDs to check
   * @returns Object mapping user IDs to follow status
   */
  async batchFollowStatus(
    data: BatchFollowStatusRequest,
  ): Promise<BatchFollowStatusResponse> {
    const response = await apiClient.post<BatchFollowStatusResponse>(
      FOLLOWS_ENDPOINTS.BATCH_STATUS,
      data,
    );
    return response.data;
  },

  /**
   * Check if current user is following another user
   * @param userId - User ID to check
   * @returns Follow status
   */
  async getFollowStatus(userId: string): Promise<FollowStatusResponse> {
    const response = await apiClient.get<FollowStatusResponse>(
      FOLLOWS_ENDPOINTS.FOLLOW_STATUS(userId),
    );
    return response.data;
  },

  /**
   * Get follow suggestions based on mutual connections
   * @param limit - Maximum number of suggestions (default: 10)
   * @returns Array of follow suggestions
   */
  async getSuggestions(limit?: number): Promise<FollowSuggestion[]> {
    const response = await apiClient.get<FollowSuggestion[]>(
      FOLLOWS_ENDPOINTS.SUGGESTIONS,
      {
        params: limit ? { limit } : undefined,
      },
    );
    return response.data;
  },

  /**
   * Get follow statistics for a user
   * @param userId - User ID
   * @returns Follow statistics
   */
  async getStats(userId: string): Promise<FollowStats> {
    const response = await apiClient.get<FollowStats>(
      FOLLOWS_ENDPOINTS.STATS(userId),
    );
    return response.data;
  },

  /**
   * Get follow analytics for a user
   * @param userId - User ID
   * @returns Follow analytics
   */
  async getAnalytics(userId: string): Promise<FollowAnalytics> {
    const response = await apiClient.get<FollowAnalytics>(
      FOLLOWS_ENDPOINTS.ANALYTICS(userId),
    );
    return response.data;
  },

  /**
   * Get enhanced follow analytics with growth trends
   * @param userId - User ID
   * @returns Enhanced follow analytics
   */
  async getEnhancedAnalytics(
    userId: string,
  ): Promise<EnhancedFollowAnalytics> {
    const response = await apiClient.get<EnhancedFollowAnalytics>(
      FOLLOWS_ENDPOINTS.ENHANCED_ANALYTICS(userId),
    );
    return response.data;
  },

  /**
   * Get follow history/audit log
   * @param userId - User ID
   * @param params - Pagination parameters
   * @returns Paginated follow history
   */
  async getHistory(
    userId: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<FollowHistory>> {
    const response = await apiClient.get<PaginationResponse<FollowHistory>>(
      FOLLOWS_ENDPOINTS.HISTORY(userId),
      { params },
    );
    return response.data;
  },

  /**
   * Export followers list as CSV or JSON
   * @param userId - User ID
   * @param format - Export format ('csv' or 'json')
   * @returns Blob or JSON data
   */
  async exportFollowers(
    userId: string,
    format: 'csv' | 'json' = 'csv',
  ): Promise<Blob | string> {
    const response = await apiClient.get<Blob | string>(
      FOLLOWS_ENDPOINTS.EXPORT_FOLLOWERS(userId),
      {
        params: { format },
        responseType: format === 'json' ? 'json' : 'blob',
      },
    );
    return response.data;
  },

  /**
   * Export following list as CSV or JSON
   * @param userId - User ID
   * @param format - Export format ('csv' or 'json')
   * @returns Blob or JSON data
   */
  async exportFollowing(
    userId: string,
    format: 'csv' | 'json' = 'csv',
  ): Promise<Blob | string> {
    const response = await apiClient.get<Blob | string>(
      FOLLOWS_ENDPOINTS.EXPORT_FOLLOWING(userId),
      {
        params: { format },
        responseType: format === 'json' ? 'json' : 'blob',
      },
    );
    return response.data;
  },
};

