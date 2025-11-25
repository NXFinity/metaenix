/**
 * Comments API Endpoints
 * 
 * Defines all comment-related API endpoint URLs for the universal comments system
 */

export const COMMENTS_ENDPOINTS = {
  /**
   * Create a comment on any resource
   * POST /comments/resources/:resourceType/:resourceId
   */
  CREATE: (resourceType: string, resourceId: string) =>
    `/comments/resources/${resourceType}/${resourceId}`,

  /**
   * Get comments for a resource
   * GET /comments/resources/:resourceType/:resourceId?page=1&limit=20
   */
  GET_FOR_RESOURCE: (resourceType: string, resourceId: string) =>
    `/comments/resources/${resourceType}/${resourceId}`,

  /**
   * Get a single comment by ID
   * GET /comments/:commentId
   */
  GET_BY_ID: (commentId: string) => `/comments/${commentId}`,

  /**
   * Update a comment
   * PATCH /comments/:commentId
   */
  UPDATE: (commentId: string) => `/comments/${commentId}`,

  /**
   * Delete a comment
   * DELETE /comments/:commentId
   */
  DELETE: (commentId: string) => `/comments/${commentId}`,

  // Legacy endpoints (for backward compatibility with posts)
  /**
   * Create a comment on a post (legacy)
   * POST /posts/:postId/comments
   */
  CREATE_FOR_POST: (postId: string) => `/posts/${postId}/comments`,

  /**
   * Get comments for a post (legacy)
   * GET /posts/:postId/comments?page=1&limit=20
   */
  GET_FOR_POST: (postId: string) => `/posts/${postId}/comments`,

  /**
   * Get a comment by ID (legacy)
   * GET /posts/comments/:commentId
   */
  GET_BY_ID_LEGACY: (commentId: string) => `/posts/comments/${commentId}`,

  /**
   * Get replies to a comment (legacy)
   * GET /posts/comments/:commentId/replies?page=1&limit=20
   */
  GET_REPLIES: (commentId: string) => `/posts/comments/${commentId}/replies`,

  /**
   * Update a comment (legacy)
   * PATCH /posts/comments/:commentId
   */
  UPDATE_LEGACY: (commentId: string) => `/posts/comments/${commentId}`,

  /**
   * Delete a comment (legacy)
   * DELETE /posts/comments/:commentId
   */
  DELETE_LEGACY: (commentId: string) => `/posts/comments/${commentId}`,
} as const;

