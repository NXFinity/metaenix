/**
 * Analytics API Endpoints
 * 
 * Defines all analytics-related API endpoint URLs
 */

export const ANALYTICS_ENDPOINTS = {
  /**
   * Get geographic analytics for user profile
   * GET /analytics/users/:userId/geographic
   */
  GET_GEOGRAPHIC_ANALYTICS: (userId: string) => `/analytics/users/${userId}/geographic`,

  /**
   * Get aggregate analytics for user across all resources
   * GET /analytics/users/:userId/aggregate
   */
  GET_AGGREGATE_ANALYTICS: (userId: string) => `/analytics/users/${userId}/aggregate`,

  /**
   * Get user analytics (cached/calculated)
   * GET /analytics/users/:userId?forceRecalculate=true
   */
  GET_USER_ANALYTICS: (userId: string, forceRecalculate?: boolean) => 
    `/analytics/users/${userId}${forceRecalculate ? '?forceRecalculate=true' : ''}`,

  /**
   * Get post analytics for a user
   * GET /analytics/users/:userId/posts
   */
  GET_USER_POST_ANALYTICS: (userId: string) => `/analytics/users/${userId}/posts`,

  /**
   * Get video analytics for a user
   * GET /analytics/users/:userId/videos
   */
  GET_USER_VIDEO_ANALYTICS: (userId: string) => `/analytics/users/${userId}/videos`,

  /**
   * Get photo analytics for a user
   * GET /analytics/users/:userId/photos
   */
  GET_USER_PHOTO_ANALYTICS: (userId: string) => `/analytics/users/${userId}/photos`,

  /**
   * Get user's liked posts
   * GET /analytics/users/:userId/likes?page=1&limit=20
   */
  GET_USER_LIKED_POSTS: (userId: string) => `/analytics/users/${userId}/likes`,

  /**
   * Get analytics for a specific post
   * GET /analytics/posts/:postId?forceRecalculate=true
   */
  GET_POST_ANALYTICS: (postId: string, forceRecalculate?: boolean) => 
    `/analytics/posts/${postId}${forceRecalculate ? '?forceRecalculate=true' : ''}`,

  /**
   * Get analytics for a specific video
   * GET /analytics/videos/:videoId?forceRecalculate=true
   */
  GET_VIDEO_ANALYTICS: (videoId: string, forceRecalculate?: boolean) => 
    `/analytics/videos/${videoId}${forceRecalculate ? '?forceRecalculate=true' : ''}`,

  /**
   * Get analytics for a specific photo
   * GET /analytics/photos/:photoId?forceRecalculate=true
   */
  GET_PHOTO_ANALYTICS: (photoId: string, forceRecalculate?: boolean) => 
    `/analytics/photos/${photoId}${forceRecalculate ? '?forceRecalculate=true' : ''}`,
} as const;

