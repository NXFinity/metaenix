import { apiClient } from '@/lib/api/client';
import { ANALYTICS_ENDPOINTS } from './analytics.endpoints';
import type {
  GeographicAnalytics,
  AggregateAnalytics,
  UserAnalytics,
  PostAnalytics,
  VideoAnalytics,
  PhotoAnalytics,
  PostAnalyticsResponse,
  VideoAnalyticsResponse,
  PhotoAnalyticsResponse,
} from './type/analytics.type';
import type { PaginationParams, PaginationResponse, Post } from '@/core/api/users/posts/types/post.type';

/**
 * Analytics Service
 *
 * Handles all analytics-related API calls including:
 * - Geographic analytics
 * - Aggregate analytics
 * - User analytics
 * - Post analytics
 * - Video analytics
 * - Photo analytics
 * - Resource analytics
 */
export const analyticsService = {
  /**
   * Get geographic analytics for user profile
   * @param userId - User UUID
   * @returns Geographic analytics data
   */
  async getGeographicAnalytics(userId: string): Promise<GeographicAnalytics> {
    const response = await apiClient.get<GeographicAnalytics>(
      ANALYTICS_ENDPOINTS.GET_GEOGRAPHIC_ANALYTICS(userId),
    );
    return response.data;
  },

  /**
   * Get aggregate analytics for user across all resources
   * @param userId - User UUID
   * @returns Aggregate analytics data
   */
  async getAggregateAnalytics(userId: string): Promise<AggregateAnalytics> {
    const response = await apiClient.get<AggregateAnalytics>(
      ANALYTICS_ENDPOINTS.GET_AGGREGATE_ANALYTICS(userId),
    );
    return response.data;
  },

  /**
   * Get user analytics (cached/calculated)
   * @param userId - User UUID
   * @param forceRecalculate - Force recalculation of analytics
   * @returns User analytics data
   */
  async getUserAnalytics(
    userId: string,
    forceRecalculate = false,
  ): Promise<UserAnalytics> {
    const response = await apiClient.get<UserAnalytics>(
      ANALYTICS_ENDPOINTS.GET_USER_ANALYTICS(userId, forceRecalculate),
    );
    return response.data;
  },

  /**
   * Get post analytics for a user
   * @param userId - User UUID
   * @returns Post analytics data for user
   */
  async getUserPostAnalytics(userId: string): Promise<PostAnalyticsResponse> {
    const response = await apiClient.get<PostAnalyticsResponse>(
      ANALYTICS_ENDPOINTS.GET_USER_POST_ANALYTICS(userId),
    );
    return response.data;
  },

  /**
   * Get video analytics for a user
   * @param userId - User UUID
   * @returns Video analytics data for user
   */
  async getUserVideoAnalytics(userId: string): Promise<VideoAnalyticsResponse> {
    const response = await apiClient.get<VideoAnalyticsResponse>(
      ANALYTICS_ENDPOINTS.GET_USER_VIDEO_ANALYTICS(userId),
    );
    return response.data;
  },

  /**
   * Get photo analytics for a user
   * @param userId - User UUID
   * @returns Photo analytics data for user
   */
  async getUserPhotoAnalytics(userId: string): Promise<PhotoAnalyticsResponse> {
    const response = await apiClient.get<PhotoAnalyticsResponse>(
      ANALYTICS_ENDPOINTS.GET_USER_PHOTO_ANALYTICS(userId),
    );
    return response.data;
  },

  /**
   * Get user's liked posts
   * @param userId - User UUID
   * @param params - Pagination parameters
   * @returns Paginated liked posts
   */
  async getUserLikedPosts(
    userId: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<Post>> {
    const response = await apiClient.get<PaginationResponse<Post>>(
      ANALYTICS_ENDPOINTS.GET_USER_LIKED_POSTS(userId),
      { params },
    );
    return response.data;
  },

  /**
   * Get analytics for a specific post
   * @param postId - Post UUID
   * @param forceRecalculate - Force recalculation of analytics
   * @returns Post analytics data
   */
  async getPostAnalytics(
    postId: string,
    forceRecalculate = false,
  ): Promise<PostAnalytics> {
    const response = await apiClient.get<PostAnalytics>(
      ANALYTICS_ENDPOINTS.GET_POST_ANALYTICS(postId, forceRecalculate),
    );
    return response.data;
  },

  /**
   * Get analytics for a specific video
   * @param videoId - Video UUID
   * @param forceRecalculate - Force recalculation of analytics
   * @returns Video analytics data
   */
  async getVideoAnalytics(
    videoId: string,
    forceRecalculate = false,
  ): Promise<VideoAnalytics> {
    const response = await apiClient.get<VideoAnalytics>(
      ANALYTICS_ENDPOINTS.GET_VIDEO_ANALYTICS(videoId, forceRecalculate),
    );
    return response.data;
  },

  /**
   * Get analytics for a specific photo
   * @param photoId - Photo UUID
   * @param forceRecalculate - Force recalculation of analytics
   * @returns Photo analytics data
   */
  async getPhotoAnalytics(
    photoId: string,
    forceRecalculate = false,
  ): Promise<PhotoAnalytics> {
    const response = await apiClient.get<PhotoAnalytics>(
      ANALYTICS_ENDPOINTS.GET_PHOTO_ANALYTICS(photoId, forceRecalculate),
    );
    return response.data;
  },
};

