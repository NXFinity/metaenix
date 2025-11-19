/**
 * Notifications API Endpoints
 * 
 * Defines all notification-related API endpoint URLs
 */

export const NOTIFICATION_ENDPOINTS = {
  /**
   * Get all notifications for current user (paginated)
   * GET /notifications?page=1&limit=20&type=follow&isRead=false
   */
  GET_ALL: '/notifications',

  /**
   * Get unread notification count
   * GET /notifications/unread/count
   */
  GET_UNREAD_COUNT: '/notifications/unread/count',

  /**
   * Get a single notification by ID
   * GET /notifications/:id
   */
  GET_BY_ID: (id: string) => `/notifications/${id}`,

  /**
   * Update a notification (e.g., mark as read)
   * PATCH /notifications/:id
   */
  UPDATE: (id: string) => `/notifications/${id}`,

  /**
   * Mark all notifications as read
   * PATCH /notifications/mark-all-read
   */
  MARK_ALL_READ: '/notifications/mark-all-read',

  /**
   * Delete a notification
   * DELETE /notifications/:id
   */
  DELETE: (id: string) => `/notifications/${id}`,

  /**
   * Delete all read notifications
   * DELETE /notifications/read/all
   */
  DELETE_ALL_READ: '/notifications/read/all',
} as const;

