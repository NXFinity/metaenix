/**
 * Follows API Endpoints
 * 
 * Defines all follow-related API endpoint URLs
 */

export const FOLLOWS_ENDPOINTS = {
  /**
   * Follow a user
   * POST /follows/:userId/follow
   */
  FOLLOW: (userId: string) => `/follows/${userId}/follow`,

  /**
   * Unfollow a user
   * DELETE /follows/:userId/follow
   */
  UNFOLLOW: (userId: string) => `/follows/${userId}/follow`,

  /**
   * Get users that a user is following
   * GET /follows/:userId/following?page=1&limit=20
   */
  GET_FOLLOWING: (userId: string) => `/follows/${userId}/following`,

  /**
   * Get followers of a user
   * GET /follows/:userId/followers?page=1&limit=20
   */
  GET_FOLLOWERS: (userId: string) => `/follows/${userId}/followers`,

  /**
   * Batch check follow status for multiple users
   * POST /follows/batch-status
   */
  BATCH_STATUS: '/follows/batch-status',

  /**
   * Check if current user is following another user
   * GET /follows/:userId/follow-status
   */
  FOLLOW_STATUS: (userId: string) => `/follows/${userId}/follow-status`,

  /**
   * Get follow suggestions
   * GET /follows/suggestions?limit=10
   */
  SUGGESTIONS: '/follows/suggestions',

  /**
   * Get follow statistics for a user
   * GET /follows/:userId/stats
   */
  STATS: (userId: string) => `/follows/${userId}/stats`,

  /**
   * Get follow analytics for a user
   * GET /follows/:userId/analytics
   */
  ANALYTICS: (userId: string) => `/follows/${userId}/analytics`,

  /**
   * Get enhanced follow analytics
   * GET /follows/:userId/analytics/enhanced
   */
  ENHANCED_ANALYTICS: (userId: string) =>
    `/follows/${userId}/analytics/enhanced`,

  /**
   * Get follow history/audit log
   * GET /follows/:userId/history?page=1&limit=50
   */
  HISTORY: (userId: string) => `/follows/${userId}/history`,

  /**
   * Export followers list
   * GET /follows/:userId/followers/export?format=csv|json
   */
  EXPORT_FOLLOWERS: (userId: string) => `/follows/${userId}/followers/export`,

  /**
   * Export following list
   * GET /follows/:userId/following/export?format=csv|json
   */
  EXPORT_FOLLOWING: (userId: string) => `/follows/${userId}/following/export`,
} as const;

