// ============================================
// Notification Types
// ============================================

export enum NotificationType {
  FOLLOW = 'follow',
  UNFOLLOW = 'unfollow',
  POST_LIKE = 'post_like',
  POST_COMMENT = 'post_comment',
  POST_SHARE = 'post_share',
  POST_MENTION = 'post_mention',
  COMMENT_LIKE = 'comment_like',
  COMMENT_REPLY = 'comment_reply',
  SYSTEM = 'system',
  WELCOME = 'welcome',
  VERIFICATION = 'verification',
  CONTENT_REPORT = 'content_report',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string | null;
  metadata: Record<string, any> | null;
  relatedUserId: string | null;
  relatedPostId: string | null;
  relatedCommentId: string | null;
  isRead: boolean;
  readAt: string | null;
  actionUrl: string | null;
  dateCreated: string;
  dateUpdated: string;
  dateDeleted: string | null;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginationResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface GetNotificationsParams extends PaginationParams {
  type?: NotificationType;
  isRead?: boolean;
}

export interface UpdateNotificationRequest {
  isRead?: boolean;
}

export interface MarkAllReadRequest {
  type?: NotificationType;
}

export interface MarkAllReadResponse {
  count: number;
}

export interface UnreadCountResponse {
  count: number;
}

export interface DeleteAllReadResponse {
  count: number;
}

// WebSocket event types
export interface NewNotificationEvent {
  id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  metadata: Record<string, any> | null;
  relatedUserId: string | null;
  relatedPostId: string | null;
  relatedCommentId: string | null;
  actionUrl: string | null;
  isRead: boolean;
  dateCreated: string;
}

export interface UnreadCountEvent {
  count: number;
}

