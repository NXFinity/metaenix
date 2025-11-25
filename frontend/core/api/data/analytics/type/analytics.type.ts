/**
 * Analytics Types
 */

export interface GeographicAnalytics {
  topCountries: Array<{
    countryCode: string;
    countryName: string;
    count: number;
  }>;
  totalViews: number;
}

export interface ViewsOverTime {
  date: string;
  count: number;
}

export interface AggregateAnalytics {
  totalViews: number;
  viewsByResourceType: {
    profile: number;
    post: number;
    video: number;
    photo: number;
  };
  topCountries: Array<{
    countryCode: string;
    countryName: string;
    count: number;
  }>;
  viewsOverTime: ViewsOverTime[];
}

export interface ResourceAnalytics {
  totalViews: number;
  topCountries: Array<{
    countryCode: string;
    countryName: string;
    count: number;
  }>;
  viewsOverTime: ViewsOverTime[];
}

export interface UserAnalytics {
  userId: string;
  viewsCount: number;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  videosCount: number;
  commentsCount: number;
  likesReceivedCount: number;
  sharesReceivedCount: number;
  lastCalculatedAt: string;
}

export interface PostAnalytics {
  postId: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  bookmarksCount: number;
  reportsCount: number;
  reactionsCount: number;
  engagementRate: number;
  totalEngagements: number;
  lastCalculatedAt: string;
}

export interface VideoAnalytics {
  videoId: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  totalWatchTime: number;
  averageWatchTime: number;
  completionRate: number;
  lastCalculatedAt: string;
}

export interface PhotoAnalytics {
  photoId: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  lastCalculatedAt: string;
}

export interface PostAnalyticsResponse extends ResourceAnalytics {
  // Additional post-specific analytics
}

export interface VideoAnalyticsResponse extends ResourceAnalytics {
  // Additional video-specific analytics
}

export interface PhotoAnalyticsResponse extends ResourceAnalytics {
  // Additional photo-specific analytics
}

