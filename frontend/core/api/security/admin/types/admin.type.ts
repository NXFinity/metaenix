/**
 * Admin API Types
 * 
 * Type definitions for admin API requests and responses
 */

import type { PaginationParams, PaginationResponse } from '@/core/api/users/posts/types/post.type';
import type { User } from '@/core/api/users/user/types/user.type';

// #########################################################
// DASHBOARD & STATISTICS
// #########################################################

export interface PlatformStats {
  totalUsers: number;
  totalPosts: number;
  totalVideos: number;
  totalPhotos: number;
  newUsersToday: number;
  newPostsToday: number;
  newVideosToday: number;
  newPhotosToday: number;
}

export interface SystemHealth {
  status: 'ok' | 'error';
  info?: Record<string, any>;
  error?: Record<string, any>;
  details?: Record<string, any>;
}

export interface PlatformActivity {
  type: string;
  action: string;
  userId?: string;
  username?: string;
  resourceId?: string;
  resourceType?: string;
  timestamp: string;
}

export interface GrowthMetrics {
  userGrowth: {
    current: number;
    previous: number;
    growthRate: number;
  };
  contentGrowth: {
    posts: { current: number; previous: number; growthRate: number };
    videos: { current: number; previous: number; growthRate: number };
    photos: { current: number; previous: number; growthRate: number };
  };
  engagementGrowth: {
    current: number;
    previous: number;
    growthRate: number;
  };
}

// #########################################################
// USER MANAGEMENT
// #########################################################

export interface SearchUsersParams extends PaginationParams {
  q?: string;
}

export interface UserDetails extends User {
  security: {
    isBanned: boolean;
    banReason?: string;
    bannedAt?: string;
    bannedUntil?: string;
    isTimedOut: boolean;
    timeoutReason?: string;
    timedOutUntil?: string;
    isVerified: boolean;
    isTwoFactorEnabled: boolean;
  };
}

export interface BanUserRequest {
  reason: string;
  bannedUntil?: string;
}

export interface TimeoutUserRequest {
  reason: string;
  timedOutUntil: string;
}

export interface ChangeRoleRequest {
  role: 'Member' | 'Moderator' | 'Admin' | 'Developer';
}

export interface UserActivity {
  type: string;
  action: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  timedOutUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

// #########################################################
// CONTENT MODERATION
// #########################################################

export interface Report {
  id: string;
  userId: string;
  resourceType: 'post' | 'video' | 'photo';
  resourceId: string;
  reason: string;
  description?: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  dateCreated: string;
  dateUpdated?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewerInfo?: {
    username: string;
    displayName: string;
  } | null;
  reporter?: {
    id: string;
    username: string;
    displayName: string;
    profile?: {
      avatar?: string | null;
    };
  };
}

export interface ReviewReportRequest {
  status: 'reviewed' | 'resolved' | 'dismissed';
}

// #########################################################
// ANALYTICS
// #########################################################

export interface AnalyticsOverview {
  totalUsers: number;
  activeUsers: number;
  totalPosts: number;
  totalVideos: number;
  totalPhotos: number;
  totalViews: number;
  totalEngagements: number;
  engagementRate: number;
}

export interface UserAnalytics {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  growthRate: number;
  usersOverTime: Array<{ date: string; count: number }>;
}

export interface ContentAnalytics {
  totalPosts: number;
  totalVideos: number;
  totalPhotos: number;
  postsEngagement: number;
  videosEngagement: number;
  photosEngagement: number;
  topContent: Array<{
    id: string;
    type: 'post' | 'video' | 'photo';
    views: number;
    engagements: number;
  }>;
}

export interface EngagementMetrics {
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  engagementRate: number;
  engagementOverTime: Array<{
    date: string;
    likes: number;
    comments: number;
    shares: number;
  }>;
}

export interface ReportAnalytics {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  dismissedReports: number;
  reportsByReason: Array<{ reason: string; count: number }>;
  resolutionRate: number;
}

export interface AnalyticsExport {
  data: string;
  format: 'csv' | 'json';
  filename: string;
}

// #########################################################
// SETTINGS
// #########################################################

export interface SystemSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  maxFileSize: number;
  allowedFileTypes: string[];
}

export interface FeatureFlags {
  [key: string]: boolean;
}

export interface RateLimitConfig {
  limit: number;
  ttl: number;
}

export interface RateLimits {
  [key: string]: RateLimitConfig;
}

export interface CacheStatus {
  enabled: boolean;
  hitRate: number;
  missRate: number;
  totalKeys: number;
}

// #########################################################
// SECURITY
// #########################################################

export interface SecurityAlert {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  firstOccurrence: string;
  lastOccurrence: string;
}

export interface SecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface Session {
  userId: string;
  websocketId: string;
  username: string;
  displayName: string;
}

export interface BlockIPRequest {
  ip: string;
  reason?: string;
}

// #########################################################
// TRACKING & LOGS
// #########################################################

export interface SystemLog {
  id: string;
  level: string;
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface LogExport {
  data: string;
  format: 'csv' | 'json';
  filename: string;
}

