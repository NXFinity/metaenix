/**
 * Likes API Endpoints
 * 
 * Defines all like-related API endpoint URLs for the universal likes system
 */

export const LIKES_ENDPOINTS = {
  /**
   * Like a resource
   * POST /likes/resources/:resourceType/:resourceId
   */
  LIKE: (resourceType: string, resourceId: string) =>
    `/likes/resources/${resourceType}/${resourceId}`,

  /**
   * Unlike a resource
   * DELETE /likes/resources/:resourceType/:resourceId
   */
  UNLIKE: (resourceType: string, resourceId: string) =>
    `/likes/resources/${resourceType}/${resourceId}`,

  /**
   * Check if user has liked a resource
   * GET /likes/resources/:resourceType/:resourceId/status
   */
  CHECK_STATUS: (resourceType: string, resourceId: string) =>
    `/likes/resources/${resourceType}/${resourceId}/status`,

  /**
   * Get likes count for a resource
   * GET /likes/resources/:resourceType/:resourceId/count
   */
  GET_COUNT: (resourceType: string, resourceId: string) =>
    `/likes/resources/${resourceType}/${resourceId}/count`,

  // Legacy endpoints (for backward compatibility with posts)
  /**
   * Like a post (legacy)
   * POST /posts/:postId/like
   */
  LIKE_POST: (postId: string) => `/posts/${postId}/like`,

  /**
   * Unlike a post (legacy)
   * DELETE /posts/:postId/like
   */
  UNLIKE_POST: (postId: string) => `/posts/${postId}/like`,

  /**
   * Like a comment (legacy)
   * POST /posts/comments/:commentId/like
   */
  LIKE_COMMENT: (commentId: string) => `/posts/comments/${commentId}/like`,

  /**
   * Unlike a comment (legacy)
   * DELETE /posts/comments/:commentId/like
   */
  UNLIKE_COMMENT: (commentId: string) => `/posts/comments/${commentId}/like`,
} as const;

