// ============================================
// Follow Types
// ============================================

import type { User } from '@/core/api/user/types/user.type';

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  dateCreated: string;
  dateUpdated: string;
  dateDeleted?: string | null;
  follower?: User;
  following?: User;
}

export interface FollowUser {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  profile?: {
    avatar?: string | null;
    bio?: string | null;
  };
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  dateCreated?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: 'dateCreated' | 'username' | 'displayName';
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
}

export interface PaginationResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface FollowResponse {
  message: string;
  follow: Follow;
}

export interface UnfollowResponse {
  message: string;
}

export interface FollowStatusResponse {
  isFollowing: boolean;
}

export interface BatchFollowStatusResponse {
  [userId: string]: boolean;
}

export interface BatchFollowStatusRequest {
  userIds: string[];
}

export interface FollowStats {
  followersCount: number;
  followingCount: number;
  mutualFollowersCount?: number;
}

export interface FollowAnalytics {
  totalFollowers: number;
  totalFollowing: number;
  followersGrowth: {
    period: string;
    count: number;
  }[];
  followingGrowth: {
    period: string;
    count: number;
  }[];
  topFollowers?: {
    userId: string;
    username: string;
    displayName: string;
    followersCount: number;
  }[];
}

export interface EnhancedFollowAnalytics extends FollowAnalytics {
  growthRate: number;
  engagementRate: number;
  followerRetentionRate: number;
  averageFollowersPerDay: number;
  peakGrowthPeriod: {
    startDate: string;
    endDate: string;
    followersGained: number;
  };
  growthTrends?: {
    daily: Array<{ date: string; followers: number; following: number }>;
    weekly: Array<{ week: string; followers: number; following: number }>;
  };
  engagementMetrics?: {
    averageFollowersPerDay: number;
    averageFollowingPerDay: number;
    followerRetentionRate: number;
  };
}

export interface FollowSuggestion {
  id: string;
  username: string;
  displayName: string;
  profile?: {
    avatar?: string | null;
    bio?: string | null;
  };
  followersCount: number;
  mutualFollowers?: number;
  reason?: string;
}

export interface FollowHistory {
  id: string;
  action: 'follow' | 'unfollow';
  followerId: string;
  followingId: string;
  follower?: {
    id: string;
    username: string;
    displayName: string;
  };
  following?: {
    id: string;
    username: string;
    displayName: string;
  };
  dateCreated: string;
}

