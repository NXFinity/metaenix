import { apiClient } from '@/lib/api/client';
import { SHARES_ENDPOINTS } from './shares.endpoints';
import type {
  ShareResourceType,
  CreateShareRequest,
  ShareResponse,
  ShareStatusResponse,
  ShareCountResponse,
} from './types/share.type';

/**
 * Shares Service
 * 
 * Universal shares service that works with any resource type
 * (posts, videos, photos, articles, etc.)
 */
export const sharesService = {
  /**
   * Share a resource
   * @param resourceType - Type of resource (post, video, photo, article)
   * @param resourceId - ID of the resource
   * @param data - Share data (optional comment)
   * @returns Share response
   */
  async share(
    resourceType: ShareResourceType | string,
    resourceId: string,
    data?: CreateShareRequest,
  ): Promise<ShareResponse> {
    const response = await apiClient.post<ShareResponse>(
      SHARES_ENDPOINTS.SHARE(resourceType, resourceId),
      data || {},
    );
    return response.data;
  },

  /**
   * Unshare a resource
   * @param resourceType - Type of resource (post, video, photo, article)
   * @param resourceId - ID of the resource
   * @returns void
   */
  async unshare(
    resourceType: ShareResourceType | string,
    resourceId: string,
  ): Promise<void> {
    await apiClient.delete(
      SHARES_ENDPOINTS.UNSHARE(resourceType, resourceId),
    );
  },

  /**
   * Check if user has shared a resource
   * @param resourceType - Type of resource (post, video, photo, article)
   * @param resourceId - ID of the resource
   * @returns Share status
   */
  async checkStatus(
    resourceType: ShareResourceType | string,
    resourceId: string,
  ): Promise<ShareStatusResponse> {
    const response = await apiClient.get<ShareStatusResponse>(
      SHARES_ENDPOINTS.CHECK_STATUS(resourceType, resourceId),
    );
    return response.data;
  },

  /**
   * Get shares count for a resource
   * @param resourceType - Type of resource (post, video, photo, article)
   * @param resourceId - ID of the resource
   * @returns Shares count
   */
  async getCount(
    resourceType: ShareResourceType | string,
    resourceId: string,
  ): Promise<ShareCountResponse> {
    const response = await apiClient.get<ShareCountResponse>(
      SHARES_ENDPOINTS.GET_COUNT(resourceType, resourceId),
    );
    return response.data;
  },

  /**
   * Get user's shared photos
   * @param params - Pagination parameters
   * @returns Paginated shared photos
   */
  async getSharedPhotos(params?: { page?: number; limit?: number }) {
    const response = await apiClient.get(SHARES_ENDPOINTS.GET_SHARED_PHOTOS, {
      params,
    });
    return response.data;
  },

  /**
   * Get user's shared videos
   * @param params - Pagination parameters
   * @returns Paginated shared videos
   */
  async getSharedVideos(params?: { page?: number; limit?: number }) {
    const response = await apiClient.get(SHARES_ENDPOINTS.GET_SHARED_VIDEOS, {
      params,
    });
    return response.data;
  },
};

export default sharesService;

