/**
 * Shares API Endpoints
 * 
 * Defines all share-related API endpoint URLs for the universal shares system
 */

export const SHARES_ENDPOINTS = {
  /**
   * Share a resource
   * POST /shares/resources/:resourceType/:resourceId
   */
  SHARE: (resourceType: string, resourceId: string) =>
    `/shares/resources/${resourceType}/${resourceId}`,

  /**
   * Unshare a resource
   * DELETE /shares/resources/:resourceType/:resourceId
   */
  UNSHARE: (resourceType: string, resourceId: string) =>
    `/shares/resources/${resourceType}/${resourceId}`,

  /**
   * Check if user has shared a resource
   * GET /shares/resources/:resourceType/:resourceId/status
   */
  CHECK_STATUS: (resourceType: string, resourceId: string) =>
    `/shares/resources/${resourceType}/${resourceId}/status`,

  /**
   * Get shares count for a resource
   * GET /shares/resources/:resourceType/:resourceId/count
   */
  GET_COUNT: (resourceType: string, resourceId: string) =>
    `/shares/resources/${resourceType}/${resourceId}/count`,

  /**
   * Get user's shared posts
   * GET /shares/posts
   */
  GET_SHARED_POSTS: '/shares/posts',

  /**
   * Get user's shared photos
   * GET /shares/photos
   */
  GET_SHARED_PHOTOS: '/shares/photos',

  /**
   * Get user's shared videos
   * GET /shares/videos
   */
  GET_SHARED_VIDEOS: '/shares/videos',

  // Legacy endpoints (for backward compatibility with posts)
  /**
   * Share a post (legacy)
   * POST /posts/:postId/share
   */
  SHARE_POST: (postId: string) => `/posts/${postId}/share`,
} as const;

