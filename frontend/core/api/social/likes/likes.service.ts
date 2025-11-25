import { apiClient } from '@/lib/api/client';
import { LIKES_ENDPOINTS } from './likes.endpoints';
import type {
  LikeResourceType,
  LikeResponse,
  LikeStatusResponse,
  LikeCountResponse,
  Like,
} from './types/like.type';

/**
 * Likes Service
 * 
 * Universal likes service that works with any resource type
 * (posts, videos, comments, photos, articles, etc.)
 */
export const likesService = {
  /**
   * Like a resource
   * @param resourceType - Type of resource (post, video, comment, photo, article)
   * @param resourceId - ID of the resource
   * @returns Like response
   */
  async like(
    resourceType: LikeResourceType | string,
    resourceId: string,
  ): Promise<LikeResponse> {
    const response = await apiClient.post<Like>(
      LIKES_ENDPOINTS.LIKE(resourceType, resourceId),
    );
    // Transform the Like entity to LikeResponse format
    return {
      data: response.data,
      liked: true,
    };
  },

  /**
   * Unlike a resource
   * @param resourceType - Type of resource (post, video, comment, photo, article)
   * @param resourceId - ID of the resource
   * @returns Unlike response
   */
  async unlike(
    resourceType: LikeResourceType | string,
    resourceId: string,
  ): Promise<LikeResponse> {
    const response = await apiClient.delete<void>(
      LIKES_ENDPOINTS.UNLIKE(resourceType, resourceId),
    );
    // Transform the response to LikeResponse format
    return {
      data: {} as Like, // Empty like data for unlike
      liked: false,
    };
  },

  /**
   * Check if user has liked a resource
   * @param resourceType - Type of resource (post, video, comment, photo, article)
   * @param resourceId - ID of the resource
   * @returns Like status
   */
  async checkStatus(
    resourceType: LikeResourceType | string,
    resourceId: string,
  ): Promise<LikeStatusResponse> {
    const response = await apiClient.get<LikeStatusResponse>(
      LIKES_ENDPOINTS.CHECK_STATUS(resourceType, resourceId),
    );
    return response.data;
  },

  /**
   * Get likes count for a resource
   * @param resourceType - Type of resource (post, video, comment, photo, article)
   * @param resourceId - ID of the resource
   * @returns Likes count
   */
  async getCount(
    resourceType: LikeResourceType | string,
    resourceId: string,
  ): Promise<LikeCountResponse> {
    const response = await apiClient.get<LikeCountResponse>(
      LIKES_ENDPOINTS.GET_COUNT(resourceType, resourceId),
    );
    return response.data;
  },
};

export default likesService;

