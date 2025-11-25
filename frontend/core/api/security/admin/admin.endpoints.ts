/**
 * Admin API Endpoints
 * 
 * Defines all admin-related API endpoint URLs
 */

export const ADMIN_ENDPOINTS = {
  // #########################################################
  // DASHBOARD & STATISTICS
  // #########################################################

  /**
   * Get platform-wide statistics
   * GET /admin/stats
   */
  GET_STATS: '/admin/stats',

  /**
   * Get system health status
   * GET /admin/health
   */
  GET_HEALTH: '/admin/health',

  /**
   * Get recent platform activity
   * GET /admin/activity
   */
  GET_ACTIVITY: '/admin/activity',

  /**
   * Get growth metrics
   * GET /admin/stats/growth
   */
  GET_GROWTH: '/admin/stats/growth',

  // #########################################################
  // USER MANAGEMENT
  // #########################################################

  /**
   * Search users
   * GET /admin/users/search?q=query
   */
  SEARCH_USERS: '/admin/users/search',

  /**
   * Get user details (admin view)
   * GET /admin/users/:id/details
   */
  GET_USER_DETAILS: (id: string) => `/admin/users/${id}/details`,

  /**
   * Update user
   * PATCH /admin/users/:id
   */
  UPDATE_USER: (id: string) => `/admin/users/${id}`,

  /**
   * Delete user
   * DELETE /admin/users/:id
   */
  DELETE_USER: (id: string) => `/admin/users/${id}`,

  /**
   * Ban user
   * POST /admin/users/:id/ban
   */
  BAN_USER: (id: string) => `/admin/users/${id}/ban`,

  /**
   * Unban user
   * POST /admin/users/:id/unban
   */
  UNBAN_USER: (id: string) => `/admin/users/${id}/unban`,

  /**
   * Timeout user
   * POST /admin/users/:id/timeout
   */
  TIMEOUT_USER: (id: string) => `/admin/users/${id}/timeout`,

  /**
   * Get user activity logs
   * GET /admin/users/:id/activity
   */
  GET_USER_ACTIVITY: (id: string) => `/admin/users/${id}/activity`,

  /**
   * Change user role
   * PATCH /admin/users/:id/role
   */
  CHANGE_USER_ROLE: (id: string) => `/admin/users/${id}/role`,

  /**
   * Clear follow cooldown
   * DELETE /admin/users/:id/cooldown/:followingId
   */
  CLEAR_COOLDOWN: (id: string, followingId: string) => 
    `/admin/users/${id}/cooldown/${followingId}`,

  /**
   * Get user statistics
   * GET /admin/users/stats
   */
  GET_USER_STATS: '/admin/users/stats',

  // #########################################################
  // CONTENT MODERATION
  // #########################################################

  /**
   * Get all reports
   * GET /admin/content/reports
   */
  GET_REPORTS: '/admin/content/reports',

  /**
   * Get report details
   * GET /admin/content/reports/:id
   */
  GET_REPORT: (id: string) => `/admin/content/reports/${id}`,

  /**
   * Review report
   * POST /admin/content/reports/:id/review
   */
  REVIEW_REPORT: (id: string) => `/admin/content/reports/${id}/review`,

  /**
   * Delete report
   * DELETE /admin/content/reports/:id
   */
  DELETE_REPORT: (id: string) => `/admin/content/reports/${id}`,

  /**
   * Get all posts (admin view)
   * GET /admin/content/posts
   */
  GET_POSTS: '/admin/content/posts',

  /**
   * Get post details (admin view)
   * GET /admin/content/posts/:id
   */
  GET_POST: (id: string) => `/admin/content/posts/${id}`,

  /**
   * Delete post (admin override)
   * DELETE /admin/content/posts/:id
   */
  DELETE_POST: (id: string) => `/admin/content/posts/${id}`,

  /**
   * Get all videos (admin view)
   * GET /admin/content/videos
   */
  GET_VIDEOS: '/admin/content/videos',

  /**
   * Get video details (admin view)
   * GET /admin/content/videos/:id
   */
  GET_VIDEO: (id: string) => `/admin/content/videos/${id}`,

  /**
   * Delete video (admin override)
   * DELETE /admin/content/videos/:id
   */
  DELETE_VIDEO: (id: string) => `/admin/content/videos/${id}`,

  /**
   * Get all photos (admin view)
   * GET /admin/content/photos
   */
  GET_PHOTOS: '/admin/content/photos',

  /**
   * Get photo details (admin view)
   * GET /admin/content/photos/:id
   */
  GET_PHOTO: (id: string) => `/admin/content/photos/${id}`,

  /**
   * Delete photo (admin override)
   * DELETE /admin/content/photos/:id
   */
  DELETE_PHOTO: (id: string) => `/admin/content/photos/${id}`,

  // #########################################################
  // ANALYTICS
  // #########################################################

  /**
   * Get platform-wide analytics overview
   * GET /admin/analytics/overview
   */
  GET_ANALYTICS_OVERVIEW: '/admin/analytics/overview',

  /**
   * Get user analytics
   * GET /admin/analytics/users?days=30
   */
  GET_ANALYTICS_USERS: '/admin/analytics/users',

  /**
   * Get content analytics
   * GET /admin/analytics/content
   */
  GET_ANALYTICS_CONTENT: '/admin/analytics/content',

  /**
   * Get engagement metrics
   * GET /admin/analytics/engagement?days=30
   */
  GET_ANALYTICS_ENGAGEMENT: '/admin/analytics/engagement',

  /**
   * Get report analytics
   * GET /admin/analytics/reports
   */
  GET_ANALYTICS_REPORTS: '/admin/analytics/reports',

  /**
   * Get growth metrics
   * GET /admin/analytics/growth?days=30
   */
  GET_ANALYTICS_GROWTH: '/admin/analytics/growth',

  /**
   * Export analytics data
   * GET /admin/analytics/export?format=json
   */
  EXPORT_ANALYTICS: '/admin/analytics/export',

  // #########################################################
  // SETTINGS
  // #########################################################

  /**
   * Get system settings
   * GET /admin/settings
   */
  GET_SETTINGS: '/admin/settings',

  /**
   * Update system settings
   * PATCH /admin/settings
   */
  UPDATE_SETTINGS: '/admin/settings',

  /**
   * Get feature flags
   * GET /admin/settings/feature-flags
   */
  GET_FEATURE_FLAGS: '/admin/settings/feature-flags',

  /**
   * Update feature flag
   * PATCH /admin/settings/feature-flags/:flag
   */
  UPDATE_FEATURE_FLAG: (flag: string) => `/admin/settings/feature-flags/${flag}`,

  /**
   * Get rate limits
   * GET /admin/settings/rate-limits
   */
  GET_RATE_LIMITS: '/admin/settings/rate-limits',

  /**
   * Update rate limits
   * PATCH /admin/settings/rate-limits
   */
  UPDATE_RATE_LIMITS: '/admin/settings/rate-limits',

  /**
   * Get cache status
   * GET /admin/settings/cache
   */
  GET_CACHE_STATUS: '/admin/settings/cache',

  /**
   * Clear cache
   * POST /admin/settings/cache/clear
   */
  CLEAR_CACHE: '/admin/settings/cache/clear',

  // #########################################################
  // SECURITY
  // #########################################################

  /**
   * Get security alerts
   * GET /admin/security/alerts
   */
  GET_SECURITY_ALERTS: '/admin/security/alerts',

  /**
   * Get security events
   * GET /admin/security/events
   */
  GET_SECURITY_EVENTS: '/admin/security/events',

  /**
   * Get audit logs
   * GET /admin/security/audit
   */
  GET_AUDIT_LOGS: '/admin/security/audit',

  /**
   * Get specific audit log entry
   * GET /admin/security/audit/:id
   */
  GET_AUDIT_LOG: (id: string) => `/admin/security/audit/${id}`,

  /**
   * Get active sessions
   * GET /admin/security/sessions
   */
  GET_SESSIONS: '/admin/security/sessions',

  /**
   * Terminate session
   * DELETE /admin/security/sessions/:userId
   */
  TERMINATE_SESSION: (userId: string) => `/admin/security/sessions/${userId}`,

  /**
   * Get blocked IPs
   * GET /admin/security/ip-blocks
   */
  GET_BLOCKED_IPS: '/admin/security/ip-blocks',

  /**
   * Block IP
   * POST /admin/security/ip-blocks
   */
  BLOCK_IP: '/admin/security/ip-blocks',

  /**
   * Unblock IP
   * DELETE /admin/security/ip-blocks/:ip
   */
  UNBLOCK_IP: (ip: string) => `/admin/security/ip-blocks/${ip}`,

  // #########################################################
  // TRACKING & LOGS
  // #########################################################

  /**
   * Get platform activity
   * GET /admin/tracking/activity?days=7
   */
  GET_TRACKING_ACTIVITY: '/admin/tracking/activity',

  /**
   * Get platform statistics
   * GET /admin/tracking/stats
   */
  GET_TRACKING_STATS: '/admin/tracking/stats',

  /**
   * Get system logs
   * GET /admin/tracking/logs/system
   */
  GET_SYSTEM_LOGS: '/admin/tracking/logs/system',

  /**
   * Get error logs
   * GET /admin/tracking/logs/errors
   */
  GET_ERROR_LOGS: '/admin/tracking/logs/errors',

  /**
   * Export logs
   * GET /admin/tracking/logs/export?format=json&type=system
   */
  EXPORT_LOGS: '/admin/tracking/logs/export',
} as const;

