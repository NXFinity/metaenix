import { apiClient } from '@/lib/api/client';
import { NOTIFICATION_ENDPOINTS } from './notification.endpoints';
import { NotificationType } from './types/notification.type';
import type {
  Notification,
  GetNotificationsParams,
  PaginationResponse,
  UpdateNotificationRequest,
  MarkAllReadRequest,
  MarkAllReadResponse,
  UnreadCountResponse,
  DeleteAllReadResponse,
} from './types/notification.type';

/**
 * Normalize actionUrl by removing /data/ prefix from old notifications
 * and fixing comment notifications that point to posts instead of comments
 */
const normalizeActionUrl = (url: string | null | undefined, notification: Notification): string | null => {
  if (!url) return null;
  
  // Remove /data/ prefix
  let normalized = url.replace(/^\/data\//, '/');
  
  // Remove ?postId= query parameter - we don't need it, comment page fetches comment by ID directly
  normalized = normalized.replace(/\?postId=[^&]*/, '').replace(/\&postId=[^&]*/, '');
  
  // Fix comment notifications that point to posts instead of comments
  // If notification has relatedCommentId and is a comment type, but URL points to post
  const isCommentNotification = 
    notification.type === NotificationType.POST_COMMENT || 
    notification.type === NotificationType.COMMENT_REPLY || 
    notification.type === NotificationType.COMMENT_LIKE;
  
  if (isCommentNotification && notification.relatedCommentId) {
    // Check if URL is pointing to a post instead of comment
    // Pattern: /username/posts/postId (should be /username/posts/comment/commentId)
    const postPattern = /^\/([^/]+)\/posts\/([a-f0-9-]+)(\?.*)?$/;
    const match = normalized.match(postPattern);
    
    if (match && !normalized.includes('/posts/comment/')) {
      const [, username] = match;
      // Convert to comment URL (NO postId query param needed)
      normalized = `/${username}/posts/comment/${notification.relatedCommentId}`;
    }
  }
  
  return normalized;
};

/**
 * Normalize notification actionUrl
 */
const normalizeNotification = (notification: Notification): Notification => {
  return {
    ...notification,
    actionUrl: normalizeActionUrl(notification.actionUrl, notification),
  };
};

/**
 * Normalize array of notifications
 */
const normalizeNotifications = (notifications: Notification[]): Notification[] => {
  return notifications.map(normalizeNotification);
};

/**
 * Notifications Service
 * 
 * Handles all notification-related API calls including:
 * - Getting notifications (paginated, filterable)
 * - Getting unread count
 * - Updating notifications (mark as read)
 * - Marking all as read
 * - Deleting notifications
 */
export const notificationsService = {
  /**
   * Get all notifications for current user
   * @param params - Pagination and filter parameters
   * @returns Paginated list of notifications
   */
  async getAll(
    params?: GetNotificationsParams,
  ): Promise<PaginationResponse<Notification>> {
    // ABSOLUTE GUARD - if params are missing or empty, return empty result WITHOUT making HTTP request
    if (!params) {
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
    
    const response = await apiClient.get<PaginationResponse<Notification>>(
      NOTIFICATION_ENDPOINTS.GET_ALL,
      { params },
    );
    return {
      ...response.data,
      data: normalizeNotifications(response.data.data),
    };
  },

  /**
   * Get unread notification count
   * @returns Unread count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<UnreadCountResponse>(
      NOTIFICATION_ENDPOINTS.GET_UNREAD_COUNT,
    );
    return response.data.count;
  },

  /**
   * Get a single notification by ID
   * @param id - Notification ID
   * @returns Notification data
   */
  async getById(id: string): Promise<Notification> {
    const response = await apiClient.get<Notification>(
      NOTIFICATION_ENDPOINTS.GET_BY_ID(id),
    );
    return normalizeNotification(response.data);
  },

  /**
   * Update a notification (e.g., mark as read)
   * @param id - Notification ID
   * @param data - Update data
   * @returns Updated notification
   */
  async update(
    id: string,
    data: UpdateNotificationRequest,
  ): Promise<Notification> {
    const response = await apiClient.patch<Notification>(
      NOTIFICATION_ENDPOINTS.UPDATE(id),
      data,
    );
    return normalizeNotification(response.data);
  },

  /**
   * Mark notification as read
   * @param id - Notification ID
   * @returns Updated notification
   */
  async markAsRead(id: string): Promise<Notification> {
    return this.update(id, { isRead: true });
  },

  /**
   * Mark all notifications as read
   * @param data - Optional type filter
   * @returns Count of notifications marked as read
   */
  async markAllAsRead(data?: MarkAllReadRequest): Promise<number> {
    const response = await apiClient.patch<MarkAllReadResponse>(
      NOTIFICATION_ENDPOINTS.MARK_ALL_READ,
      data,
    );
    return response.data.count;
  },

  /**
   * Delete a notification
   * @param id - Notification ID
   * @returns void
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(NOTIFICATION_ENDPOINTS.DELETE(id));
  },

  /**
   * Delete all read notifications
   * @returns Count of notifications deleted
   */
  async deleteAllRead(): Promise<number> {
    const response = await apiClient.delete<DeleteAllReadResponse>(
      NOTIFICATION_ENDPOINTS.DELETE_ALL_READ,
    );
    return response.data.count;
  },
};

