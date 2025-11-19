/**
 * Notification Types
 * 
 * Defines all possible notification types in the system
 */
export enum NotificationType {
  // Follow notifications
  FOLLOW = 'follow',
  UNFOLLOW = 'unfollow',
  
  // Post notifications
  POST_LIKE = 'post_like',
  POST_COMMENT = 'post_comment',
  POST_SHARE = 'post_share',
  POST_MENTION = 'post_mention',
  
  // Comment notifications
  COMMENT_LIKE = 'comment_like',
  COMMENT_REPLY = 'comment_reply',
  
  // System notifications
  SYSTEM = 'system',
  WELCOME = 'welcome',
  VERIFICATION = 'verification',
}

