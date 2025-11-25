'use client';

import { useAuth } from '@/core/hooks/useAuth';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { useQuery } from '@tanstack/react-query';
import { postsService } from '@/core/api/users/posts';
import { photosService } from '@/core/api/users/photos';
import { videosService } from '@/core/api/users/videos';
import { analyticsService } from '@/core/api/data/analytics/analytics.service';
import { developerService } from '@/core/api/security/developer';
import type { Post } from '@/core/api/users/posts/types/post.type';
import Link from 'next/link';
import Image from 'next/image';
import {
  CodeIcon,
  ExternalLinkIcon,
  FileTextIcon,
  UsersIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  HeartIcon,
  MessageCircleIcon,
  ShareIcon,
  BookmarkIcon,
  EyeIcon,
  TrendingUpIcon,
  PlusIcon,
  MailIcon,
  CheckCircleIcon,
  XCircleIcon,
  ImageIcon,
  VideoIcon,
  LayoutDashboardIcon,
  SparklesIcon,
} from 'lucide-react';

export default function DashboardPage() {
  const { username } = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isInitializing, isLoadingUser } = useAuth();

  // Fetch user analytics for all counts
  const { data: userAnalytics } = useQuery({
    queryKey: ['analytics', 'user', user?.id],
    queryFn: () => analyticsService.getUserAnalytics(user!.id),
    enabled: !!user?.id && isAuthenticated && user.username === username,
  });

  // Fetch recent posts for activity feed
  const { data: recentPostsData } = useQuery({
    queryKey: ['posts', 'user', user?.id, 'recent'],
    queryFn: () => postsService.getByUser(user!.id, { page: 1, limit: 5 }),
    enabled: !!user?.id && isAuthenticated && user.username === username,
  });

  // Fetch liked posts count
  const { data: likedPostsData } = useQuery({
    queryKey: ['analytics', 'liked-posts', user?.id, 'count'],
    queryFn: () => analyticsService.getUserLikedPosts(user!.id, { page: 1, limit: 1 }),
    enabled: !!user?.id && isAuthenticated && user.username === username,
  });

  // Fetch bookmarked posts count
  const { data: bookmarkedPostsData } = useQuery({
    queryKey: ['posts', 'bookmarks', user?.id, 'count'],
    queryFn: () => postsService.getBookmarks({ page: 1, limit: 1 }),
    enabled: !!user?.id && isAuthenticated && user.username === username,
  });

  // Fetch photos count
  const { data: photosData } = useQuery({
    queryKey: ['photos', 'user', user?.id, 'count'],
    queryFn: () => photosService.getByUser(user!.id, { page: 1, limit: 1 }),
    enabled: !!user?.id && isAuthenticated && user.username === username,
  });

  // Fetch videos count
  const { data: videosData } = useQuery({
    queryKey: ['videos', 'user', user?.id, 'count'],
    queryFn: () => videosService.getByUser(user!.id, { page: 1, limit: 1 }),
    enabled: !!user?.id && isAuthenticated && user.username === username,
  });

  // Fetch shared photos count
  const { data: sharedPhotosData } = useQuery({
    queryKey: ['photos', 'shared', user?.id, 'count'],
    queryFn: () => photosService.getSharedPhotos({ page: 1, limit: 1 }),
    enabled: !!user?.id && isAuthenticated && user.username === username,
  });

  // Fetch shared videos count
  const { data: sharedVideosData } = useQuery({
    queryKey: ['videos', 'shared', user?.id, 'count'],
    queryFn: () => videosService.getSharedVideos({ page: 1, limit: 1 }),
    enabled: !!user?.id && isAuthenticated && user.username === username,
  });

  // Fetch developer applications
  const { data: applications } = useQuery({
    queryKey: ['developer', 'applications'],
    queryFn: () => developerService.getApplications(),
    enabled: !!user?.id && isAuthenticated && user.username === username && user.isDeveloper === true,
  });

  // Calculate engagement metrics from analytics
  const engagementMetrics = useMemo(() => {
    if (!userAnalytics) return null;

    const totalLikes = userAnalytics.likesReceivedCount || 0;
    const totalComments = userAnalytics.commentsCount || 0;
    const totalShares = userAnalytics.sharesReceivedCount || 0;
    const totalViews = userAnalytics.viewsCount || 0;
    const totalEngagement = totalLikes + totalComments + totalShares;
    const postsCount = userAnalytics.postsCount || 0;
    const avgEngagement = postsCount > 0 ? Math.round(totalEngagement / postsCount) : 0;

    return {
      totalLikes,
      totalComments,
      totalShares,
      totalViews,
      totalEngagement,
      avgEngagement,
      postsCount,
    };
  }, [userAnalytics]);

  const recentPosts = recentPostsData?.data || [];

  // Handle redirects in useEffect to avoid setState during render
  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!isInitializing && isAuthenticated && user && user.username !== username) {
      router.push(`/${user.username}/dashboard`);
      return;
    }
  }, [isInitializing, isAuthenticated, user, username, router]);

  // Show loading while initializing auth
  if (isInitializing || isLoadingUser || !user || user.username !== username) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col w-full">
      <div className="w-full">
        {/* Header */}
        <div className="w-full border-b border-border/50 bg-gradient-to-br from-background via-background to-primary/5 px-6 py-10 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-2xl" />
                  <div className="relative p-3 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/20 shadow-lg">
                    <LayoutDashboardIcon className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                      Welcome back, {user.displayName || user.username}!
                    </h1>
                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                      <SparklesIcon className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium text-primary">Dashboard</span>
                    </div>
                  </div>
                  <p className="text-sm md:text-base text-muted-foreground">
                    Here's what's happening with your account
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full px-6 py-6">
          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Primary Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                  title="Posts"
                  value={userAnalytics?.postsCount ?? 0}
                  icon={<FileTextIcon className="h-5 w-5" />}
                  color="text-blue-600 dark:text-blue-400"
                  bgColor="bg-blue-500/10"
                  link={`/${username}`}
                  linkText="View Profile"
                />
                <StatCard
                  title="Photos"
                  value={photosData?.meta?.total ?? 0}
                  icon={<ImageIcon className="h-5 w-5" />}
                  color="text-pink-600 dark:text-pink-400"
                  bgColor="bg-pink-500/10"
                  link={`/${username}/photos`}
                  linkText="View Photos"
                />
                <StatCard
                  title="Videos"
                  value={videosData?.meta?.total ?? 0}
                  icon={<VideoIcon className="h-5 w-5" />}
                  color="text-red-600 dark:text-red-400"
                  bgColor="bg-red-500/10"
                  link={`/${username}/videos`}
                  linkText="View Videos"
                />
                <StatCard
                  title="Followers"
                  value={userAnalytics?.followersCount ?? 0}
                  icon={<UsersIcon className="h-5 w-5" />}
                  color="text-purple-600 dark:text-purple-400"
                  bgColor="bg-purple-500/10"
                  link={`/${username}/followers`}
                  linkText="View Followers"
                />
                <StatCard
                  title="Following"
                  value={userAnalytics?.followingCount ?? 0}
                  icon={<UserPlusIcon className="h-5 w-5" />}
                  color="text-green-600 dark:text-green-400"
                  bgColor="bg-green-500/10"
                  link={`/${username}/following`}
                  linkText="View Following"
                />
              </div>

              {/* Shared Content Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard
                  title="Shared Photos"
                  value={sharedPhotosData?.meta?.total ?? 0}
                  icon={<ShareIcon className="h-5 w-5" />}
                  color="text-cyan-600 dark:text-cyan-400"
                  bgColor="bg-cyan-500/10"
                  link={`/${username}/photos/shared`}
                  linkText="View Shared Photos"
                />
                <StatCard
                  title="Shared Videos"
                  value={sharedVideosData?.meta?.total ?? 0}
                  icon={<ShareIcon className="h-5 w-5" />}
                  color="text-orange-600 dark:text-orange-400"
                  bgColor="bg-orange-500/10"
                  link={`/${username}/videos/shared`}
                  linkText="View Shared Videos"
                />
              </div>

              {/* Engagement Overview */}
              {engagementMetrics && (
              <Card className="border-primary/20 hover:border-primary/40 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 leading-none">
                        <TrendingUpIcon className="h-5 w-5 text-primary flex-shrink-0" />
                        <span>Engagement Overview</span>
                      </CardTitle>
                      <CardDescription>
                        Your content performance and interaction metrics
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/${username}/analytics`}>
                        View Analytics
                        <ExternalLinkIcon className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="p-4 rounded-lg bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <HeartIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <span className="text-xs text-muted-foreground">Likes</span>
                      </div>
                      <div className="text-2xl font-bold">{engagementMetrics.totalLikes.toLocaleString()}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <MessageCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs text-muted-foreground">Comments</span>
                      </div>
                      <div className="text-2xl font-bold">{engagementMetrics.totalComments.toLocaleString()}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <ShareIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span className="text-xs text-muted-foreground">Shares</span>
                      </div>
                      <div className="text-2xl font-bold">{engagementMetrics.totalShares.toLocaleString()}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <EyeIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        <span className="text-xs text-muted-foreground">Views</span>
                      </div>
                      <div className="text-2xl font-bold">{engagementMetrics.totalViews.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <HeartIcon className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                        <span className="text-sm text-muted-foreground">Liked Posts</span>
                      </div>
                      <span className="font-semibold">{likedPostsData?.meta?.total?.toLocaleString() ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <BookmarkIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-sm text-muted-foreground">Bookmarks</span>
                      </div>
                      <span className="font-semibold">{bookmarkedPostsData?.meta?.total?.toLocaleString() ?? 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              )}

              {/* Recent Activity */}
              <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 leading-none">
                      <FileTextIcon className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>Recent Activity</span>
                    </CardTitle>
                    <CardDescription>Your latest posts and interactions</CardDescription>
                  </div>
                  {recentPosts.length > 0 && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/${username}/posts`}>
                        View All
                        <ExternalLinkIcon className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {recentPosts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="relative mx-auto w-16 h-16 mb-4">
                      <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl" />
                      <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                        <FileTextIcon className="h-8 w-8 text-primary opacity-50" />
                      </div>
                    </div>
                    <p className="text-lg font-medium mb-2">No recent activity</p>
                    <p className="text-sm mb-4">Start creating content to see your activity here</p>
                    <Button variant="outline" asChild>
                      <Link href={`/${username}/posts`}>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Create Your First Post
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentPosts.map((post) => (
                      <RecentActivityItem key={post.id} post={post} username={username as string} />
                    ))}
                  </div>
                )}
              </CardContent>
              </Card>

              {/* Developer Section - Administrators Only */}
              {user.role === 'Administrator' && (
                <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 leading-none">
                      <CodeIcon className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>Developer</span>
                    </CardTitle>
                    <CardDescription>
                      Manage your OAuth applications
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {user.isDeveloper ? (
                  applications && applications.length > 0 ? (
                    <div className="space-y-3">
                      {applications.slice(0, 2).map((app) => (
                        <div
                          key={app.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{app.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {app.environment === 'PRODUCTION' ? 'Production' : 'Development'} •{' '}
                              {app.status}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/${username}/developer`}>
                              <ExternalLinkIcon className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      ))}
                      {applications.length > 2 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{applications.length - 2} more application{applications.length - 2 === 1 ? '' : 's'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <CodeIcon className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-4">No applications yet</p>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/${username}/developer`}>
                          Create Application
                        </Link>
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="text-center py-6">
                    <CodeIcon className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Register as a developer to create OAuth applications
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/${username}/developer`}>
                        Get Started
                      </Link>
                    </Button>
                  </div>
                )}
                </CardContent>
              </Card>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Account Overview */}
              <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 leading-none">
                  <UsersIcon className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>Account Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-primary/5 to-transparent border border-primary/10">
                  {user.profile?.avatar ? (
                    <div className="relative w-14 h-14 rounded-full overflow-hidden ring-2 ring-primary/20">
                      <Image
                        src={user.profile.avatar}
                        alt={user.displayName || user.username}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/30 via-primary/20 to-secondary/20 flex items-center justify-center ring-2 ring-primary/20">
                      <span className="text-xl font-semibold text-primary">
                        {(user.displayName || user.username)[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-base">{user.displayName || user.username}</p>
                    <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <MailIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground flex-1">Email</span>
                    <span className="font-medium truncate text-xs">{user.email}</span>
                  </div>
                  {user.role && (
                    <div className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <ShieldCheckIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground flex-1">Role</span>
                      <span className="font-medium">{user.role}</span>
                    </div>
                  )}
                  {user.profile?.bio && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Bio</p>
                      <p className="text-sm leading-relaxed">{user.profile.bio}</p>
                    </div>
                  )}
                </div>
              </CardContent>
              </Card>

              {/* Security Status */}
              <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 leading-none">
                  <ShieldCheckIcon className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>Security</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-green-500/5 to-transparent border border-green-500/20">
                  <div className="flex items-center gap-2">
                    <MailIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Email Verified</span>
                  </div>
                  {user.security?.isVerified ? (
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircleIcon className="h-4 w-4" />
                      <span className="text-sm font-semibold">Verified</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                      <XCircleIcon className="h-4 w-4" />
                      <span className="text-sm font-semibold">Pending</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">2FA Enabled</span>
                  </div>
                  {user.security?.isTwoFactorEnabled ? (
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircleIcon className="h-4 w-4" />
                      <span className="text-sm font-semibold">Active</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Inactive</span>
                  )}
                </div>
              </CardContent>
              </Card>

              {/* Engagement Summary */}
              {engagementMetrics && (
                <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 leading-none">
                    <TrendingUpIcon className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>Engagement Summary</span>
                  </CardTitle>
                  <CardDescription>Your content performance metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/5 to-transparent border border-primary/20">
                      <span className="text-sm font-medium text-muted-foreground">Total Engagement</span>
                      <span className="text-lg font-bold text-primary">{engagementMetrics.totalEngagement.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-sm text-muted-foreground">Avg per Post</span>
                      <span className="font-semibold">{engagementMetrics.avgEngagement.toLocaleString()}</span>
                    </div>
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Engagement Rate</span>
                        <span className="text-xs font-bold text-primary">
                          {engagementMetrics.postsCount && engagementMetrics.postsCount > 0
                            ? `${Math.round((engagementMetrics.totalEngagement / (engagementMetrics.postsCount * 10)) * 100)}%`
                            : '0%'}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-primary to-primary/80 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${
                              engagementMetrics.postsCount && engagementMetrics.postsCount > 0
                                ? Math.min(
                                    (engagementMetrics.totalEngagement / (engagementMetrics.postsCount * 10)) * 100,
                                    100,
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon,
  color,
  bgColor,
  link,
  linkText,
  showValueAsText = false,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  link?: string;
  linkText?: string;
  showValueAsText?: boolean;
}) {
  const content = (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className={`p-2 rounded-lg ${bgColor}`}>
            <div className={color}>{icon}</div>
          </div>
        </div>
        <CardDescription className="text-xs uppercase tracking-wide">{title}</CardDescription>
        <CardTitle className="text-2xl md:text-3xl mt-1">
          {showValueAsText ? (
            <span className={color}>{value}</span>
          ) : (
            <span className="text-foreground">{typeof value === 'number' ? value.toLocaleString() : value}</span>
          )}
        </CardTitle>
      </CardHeader>
      {link && linkText && (
        <CardContent>
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link href={link}>{linkText}</Link>
          </Button>
        </CardContent>
      )}
    </Card>
  );

  return content;
}

// Engagement Card Component
function EngagementCard({
  title,
  value,
  icon,
  color,
  link,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  link?: string;
}) {
  const content = (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{title}</p>
            <p className="text-xl font-bold">{value.toLocaleString()}</p>
          </div>
          <div className={color}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );

  if (link) {
    return <Link href={link}>{content}</Link>;
  }

  return content;
}

// Format time ago helper
const formatTimeAgo = (date: string) => {
  const now = new Date();
  const postDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;

  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
};

// Helper function to check if a URL is a video
const isVideoUrl = (url: string): boolean => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.quicktime'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some((ext) => lowerUrl.includes(ext));
};

// Recent Activity Item Component
function RecentActivityItem({ post, username }: { post: Post; username: string }) {
  const hasMedia = post.mediaUrl || (post.mediaUrls && post.mediaUrls.length > 0);
  const contentPreview = post.content?.substring(0, 150) || '';
  const truncatedContent = post.content && post.content.length > 150 ? `${contentPreview}...` : contentPreview;
  const isVideo = post.mediaUrl ? isVideoUrl(post.mediaUrl) || post.postType === 'video' : false;

  return (
    <Link href={`/${post.user?.username || ''}/posts/${post.id}`} className="block group">
      <div className="p-4 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                {formatTimeAgo(post.dateCreated)}
              </span>
              {post.isPinned && (
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  Pinned
                </span>
              )}
            </div>
            {truncatedContent && (
              <p className="text-sm text-foreground line-clamp-2 mb-3 group-hover:text-primary transition-colors">
                {truncatedContent}
              </p>
            )}
            {hasMedia && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3 px-2 py-1 rounded-full bg-muted/50 w-fit">
                <ImageIcon className="h-3 w-3" />
                <span>
                  {isVideo
                    ? '1 video'
                    : post.mediaUrl
                      ? '1 image'
                      : `${post.mediaUrls?.length || 0} images`}
                </span>
              </div>
            )}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
                <HeartIcon className="h-3.5 w-3.5" />
                <span className="font-medium">{post.likesCount || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <MessageCircleIcon className="h-3.5 w-3.5" />
                <span className="font-medium">{post.commentsCount || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                <ShareIcon className="h-3.5 w-3.5" />
                <span className="font-medium">{post.sharesCount || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <EyeIcon className="h-3.5 w-3.5" />
                <span className="font-medium">{post.viewsCount || 0}</span>
              </div>
            </div>
          </div>
          {post.mediaUrl && (
            <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted border border-border/50 group-hover:border-primary/30 transition-colors shadow-sm">
              {isVideo ? (
                // For videos, use regular img tag to avoid Next.js Image optimization
                <div className="relative w-full h-full bg-muted flex items-center justify-center">
                  <img
                    src={post.mediaUrl}
                    alt="Video preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // If video thumbnail fails, show video icon
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/30 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-white/95 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <svg
                        className="w-4 h-4 text-black ml-0.5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <Image
                  src={post.mediaUrl}
                  alt="Post preview"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                  sizes="80px"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
