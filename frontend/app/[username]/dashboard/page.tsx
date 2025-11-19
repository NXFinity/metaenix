'use client';

import { useAuth } from '@/core/hooks/useAuth';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { useQuery } from '@tanstack/react-query';
import { postsService } from '@/core/api/posts';
import { developerService } from '@/core/api/developer';
import type { Post } from '@/core/api/posts/types/post.type';
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
} from 'lucide-react';

export default function DashboardPage() {
  const { username } = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isInitializing, isLoadingUser } = useAuth();

  // Fetch posts for stats
  const { data: postsData } = useQuery({
    queryKey: ['posts', 'user', user?.id, 'all'],
    queryFn: () => postsService.getByUser(user!.id, { page: 1, limit: 100 }),
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
    queryKey: ['posts', 'liked', user?.id, 'count'],
    queryFn: () => postsService.getLikedPosts({ page: 1, limit: 1 }),
    enabled: !!user?.id && isAuthenticated && user.username === username,
  });

  // Fetch shared posts count
  const { data: sharedPostsData } = useQuery({
    queryKey: ['posts', 'shared', user?.id, 'count'],
    queryFn: () => postsService.getSharedPosts({ page: 1, limit: 1 }),
    enabled: !!user?.id && isAuthenticated && user.username === username,
  });

  // Fetch bookmarked posts count
  const { data: bookmarkedPostsData } = useQuery({
    queryKey: ['posts', 'bookmarks', user?.id, 'count'],
    queryFn: () => postsService.getBookmarks({ page: 1, limit: 1 }),
    enabled: !!user?.id && isAuthenticated && user.username === username,
  });

  // Fetch developer applications
  const { data: applications } = useQuery({
    queryKey: ['developer', 'applications'],
    queryFn: () => developerService.getApplications(),
    enabled: !!user?.id && isAuthenticated && user.username === username && user.isDeveloper === true,
  });

  // Calculate engagement metrics
  const engagementMetrics = useMemo(() => {
    if (!postsData?.data) return null;

    const posts = postsData.data;
    const totalLikes = posts.reduce((sum, post) => sum + (post.likesCount || 0), 0);
    const totalComments = posts.reduce((sum, post) => sum + (post.commentsCount || 0), 0);
    const totalShares = posts.reduce((sum, post) => sum + (post.sharesCount || 0), 0);
    const totalViews = posts.reduce((sum, post) => sum + (post.viewsCount || 0), 0);
    const totalEngagement = totalLikes + totalComments + totalShares;
    const avgEngagement = posts.length > 0 ? Math.round(totalEngagement / posts.length) : 0;

    return {
      totalLikes,
      totalComments,
      totalShares,
      totalViews,
      totalEngagement,
      avgEngagement,
    };
  }, [postsData]);

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
    <div className="flex flex-1 flex-col max-w-7xl mx-auto w-full p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Welcome back, {user.displayName || user.username}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your account
          </p>
        </div>

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Posts"
            value={postsData?.meta?.total ?? 0}
            icon={<FileTextIcon className="h-5 w-5" />}
            color="text-blue-600 dark:text-blue-400"
            bgColor="bg-blue-500/10"
            link={`/${username}`}
            linkText="View Profile"
          />
          <StatCard
            title="Followers"
            value={user.followersCount ?? 0}
            icon={<UsersIcon className="h-5 w-5" />}
            color="text-purple-600 dark:text-purple-400"
            bgColor="bg-purple-500/10"
            link={`/${username}/followers`}
            linkText="View Followers"
          />
          <StatCard
            title="Following"
            value={user.followingCount ?? 0}
            icon={<UserPlusIcon className="h-5 w-5" />}
            color="text-green-600 dark:text-green-400"
            bgColor="bg-green-500/10"
            link={`/${username}/following`}
            linkText="View Following"
          />
          <StatCard
            title="Account Status"
            value={user.security?.isVerified ? 'Verified' : 'Unverified'}
            icon={
              user.security?.isVerified ? (
                <ShieldCheckIcon className="h-5 w-5" />
              ) : (
                <ShieldAlertIcon className="h-5 w-5" />
              )
            }
            color={
              user.security?.isVerified
                ? 'text-green-600 dark:text-green-400'
                : 'text-yellow-600 dark:text-yellow-400'
            }
            bgColor={
              user.security?.isVerified ? 'bg-green-500/10' : 'bg-yellow-500/10'
            }
            link={user.security?.isVerified ? undefined : '/verify'}
            linkText={user.security?.isVerified ? undefined : 'Verify Email'}
            showValueAsText
          />
        </div>

        {/* Engagement Stats Grid */}
        {engagementMetrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <EngagementCard
              title="Total Likes"
              value={engagementMetrics.totalLikes}
              icon={<HeartIcon className="h-4 w-4" />}
              color="text-red-600 dark:text-red-400"
            />
            <EngagementCard
              title="Comments"
              value={engagementMetrics.totalComments}
              icon={<MessageCircleIcon className="h-4 w-4" />}
              color="text-blue-600 dark:text-blue-400"
            />
            <EngagementCard
              title="Shares"
              value={engagementMetrics.totalShares}
              icon={<ShareIcon className="h-4 w-4" />}
              color="text-green-600 dark:text-green-400"
            />
            <EngagementCard
              title="Views"
              value={engagementMetrics.totalViews}
              icon={<EyeIcon className="h-4 w-4" />}
              color="text-purple-600 dark:text-purple-400"
            />
            <EngagementCard
              title="Liked Posts"
              value={likedPostsData?.meta?.total ?? 0}
              icon={<HeartIcon className="h-4 w-4" />}
              color="text-pink-600 dark:text-pink-400"
              link={`/${username}?tab=likes`}
            />
            <EngagementCard
              title="Bookmarks"
              value={bookmarkedPostsData?.meta?.total ?? 0}
              icon={<BookmarkIcon className="h-4 w-4" />}
              color="text-orange-600 dark:text-orange-400"
            />
          </div>
        )}

        {/* Analytics Card - Prominent */}
        <Card className="mb-6 border-2 border-primary/20 hover:border-primary/40 transition-colors">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUpIcon className="h-5 w-5 text-primary" />
                  Analytics & Insights
                </CardTitle>
                <CardDescription>
                  Track your follower growth, engagement metrics, and activity history
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{user.followersCount ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Followers</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{user.followingCount ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Following</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{postsData?.meta?.total ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Posts</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">
                  {engagementMetrics ? engagementMetrics.totalEngagement : 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Total Engagement</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Your latest posts and interactions</CardDescription>
                  </div>
                  {recentPosts.length > 0 && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/${username}/posts`}>View All</Link>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {recentPosts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileTextIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">No recent activity</p>
                    <p className="text-sm mb-4">Start creating content to see your activity here</p>
                    <Button variant="outline" asChild>
                      <Link href={`/${username}/posts`}>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Create Your First Post
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
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
                    <CardTitle>Developer</CardTitle>
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

          {/* Right Column */}
          <div className="space-y-6">
            {/* Account Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Account Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  {user.profile?.avatar ? (
                    <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-border">
                      <Image
                        src={user.profile.avatar}
                        alt={user.displayName || user.username}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center ring-2 ring-border">
                      <span className="text-lg font-semibold text-primary">
                        {(user.displayName || user.username)[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{user.displayName || user.username}</p>
                    <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                  </div>
                </div>
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <MailIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground flex-1">Email</span>
                    <span className="font-medium truncate">{user.email}</span>
                  </div>
                  {user.role && (
                    <div className="flex items-center gap-2 text-sm">
                      <ShieldCheckIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground flex-1">Role</span>
                      <span className="font-medium">{user.role}</span>
                    </div>
                  )}
                  {user.profile?.bio && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Bio</p>
                      <p className="text-sm">{user.profile.bio}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Security Status */}
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <MailIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Email Verified</span>
                    </div>
                    {user.security?.isVerified ? (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircleIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">Yes</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                        <XCircleIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">No</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <ShieldCheckIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">2FA Enabled</span>
                    </div>
                    {user.security?.isTwoFactorEnabled ? (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircleIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">Yes</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Engagement Summary */}
            {engagementMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Summary</CardTitle>
                  <CardDescription>Your content performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Engagement</span>
                      <span className="font-semibold">{engagementMetrics.totalEngagement.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Avg per Post</span>
                      <span className="font-semibold">{engagementMetrics.avgEngagement}</span>
                    </div>
                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">Engagement Rate</span>
                        <span className="text-xs font-medium">
                          {postsData?.meta?.total && postsData.meta.total > 0
                            ? `${Math.round((engagementMetrics.totalEngagement / (postsData.meta.total * 10)) * 100)}%`
                            : '0%'}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              postsData?.meta?.total && postsData.meta.total > 0
                                ? Math.min(
                                    (engagementMetrics.totalEngagement / (postsData.meta.total * 10)) * 100,
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

// Recent Activity Item Component
function RecentActivityItem({ post, username }: { post: Post; username: string }) {
  const hasMedia = post.mediaUrl || (post.mediaUrls && post.mediaUrls.length > 0);
  const contentPreview = post.content?.substring(0, 150) || '';
  const truncatedContent = post.content && post.content.length > 150 ? `${contentPreview}...` : contentPreview;

  return (
    <Link href={`/${post.user?.username || ''}/posts/${post.id}`} className="block">
      <div className="p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground">
                {formatTimeAgo(post.dateCreated)}
              </span>
              {post.isPinned && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  Pinned
                </span>
              )}
            </div>
            {truncatedContent && (
              <p className="text-sm text-foreground line-clamp-2 mb-2">
                {truncatedContent}
              </p>
            )}
            {hasMedia && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <ImageIcon className="h-3 w-3" />
                <span>{post.mediaUrl ? '1 image' : `${post.mediaUrls?.length || 0} images`}</span>
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <HeartIcon className="h-3 w-3" />
                <span>{post.likesCount || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircleIcon className="h-3 w-3" />
                <span>{post.commentsCount || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <ShareIcon className="h-3 w-3" />
                <span>{post.sharesCount || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <EyeIcon className="h-3 w-3" />
                <span>{post.viewsCount || 0}</span>
              </div>
            </div>
          </div>
          {post.mediaUrl && (
            <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-muted">
              <Image
                src={post.mediaUrl}
                alt="Post preview"
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
