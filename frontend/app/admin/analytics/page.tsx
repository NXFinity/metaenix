'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { adminAnalyticsService } from '@/core/api/security/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { LoadingSpinner } from '@/theme/components/loading/LoadingSpinner';
import { ErrorState } from '@/theme/components/error/ErrorState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/theme/ui/tabs';
import { BarChart3, Users, FileText, TrendingUp, AlertTriangle, ArrowLeft as ArrowLeftIcon, Shield } from 'lucide-react';
import Link from 'next/link';

const ADMIN_ROLES = ['Administrator', 'Founder', 'Chief Executive'];

const isAdmin = (role: string | undefined): boolean => {
  if (!role) return false;
  return ADMIN_ROLES.includes(role);
};

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitializing } = useAuth();

  useEffect(() => {
    if (!isInitializing) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }
      if (user && !isAdmin(user.role)) {
        router.push('/');
        return;
      }
    }
  }, [user, isAuthenticated, isInitializing, router]);

  // Fetch analytics overview
  const { data: overview, isLoading: isLoadingOverview } = useQuery({
    queryKey: ['admin', 'analytics', 'overview'],
    queryFn: () => adminAnalyticsService.getOverview(),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  // Fetch user analytics
  const { data: userAnalytics, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin', 'analytics', 'users'],
    queryFn: () => adminAnalyticsService.getUsers(30),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  // Fetch content analytics
  const { data: contentAnalytics, isLoading: isLoadingContent } = useQuery({
    queryKey: ['admin', 'analytics', 'content'],
    queryFn: () => adminAnalyticsService.getContent(),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  // Fetch engagement metrics
  const { data: engagement, isLoading: isLoadingEngagement } = useQuery({
    queryKey: ['admin', 'analytics', 'engagement'],
    queryFn: () => adminAnalyticsService.getEngagement(30),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  if (isInitializing) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen p-4">
        <ErrorState
          title="Authentication Required"
          message="You must be logged in to access the admin analytics"
          onRetry={() => router.push('/login')}
        />
      </div>
    );
  }

  if (!isAdmin(user.role)) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen p-4">
        <ErrorState
          title="Access Denied"
          message="You do not have permission to access this page"
          onRetry={() => router.push('/')}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col w-full">
      {/* Header */}
      <div className="w-full border-b border-border/50 bg-gradient-to-br from-background via-background to-primary/5 px-6 py-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button 
              variant="ghost" 
              size="sm" 
              asChild
              className="hover:bg-muted/80 transition-all duration-200 rounded-lg"
            >
              <Link href="/admin">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div className="h-10 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-2xl" />
                <div className="relative p-3 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/20 shadow-lg">
                  <BarChart3 className="h-7 w-7 text-primary" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    Analytics
                  </h1>
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">Admin</span>
                  </div>
                </div>
                <p className="text-sm md:text-base text-muted-foreground">
                  View platform-wide analytics and insights
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-6 py-6">
        <Tabs defaultValue="overview" className="w-full space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card className="w-full">
            <CardHeader>
              <CardTitle>Analytics Overview</CardTitle>
              <CardDescription>Platform-wide analytics summary</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingOverview ? (
                <LoadingSpinner />
              ) : overview ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Users</p>
                      <p className="text-2xl font-bold">{overview.totalUsers || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Active: {overview.activeUsers || 0}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Posts</p>
                      <p className="text-2xl font-bold">{overview.totalPosts || 0}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Videos</p>
                      <p className="text-2xl font-bold">{overview.totalVideos || 0}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Photos</p>
                      <p className="text-2xl font-bold">{overview.totalPhotos || 0}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Views</p>
                      <p className="text-2xl font-bold">{overview.totalViews || 0}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Engagements</p>
                      <p className="text-2xl font-bold">{overview.totalEngagements || 0}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Engagement Rate</p>
                      <p className="text-2xl font-bold">
                        {overview.engagementRate ? `${(overview.engagementRate * 100).toFixed(2)}%` : '0%'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No analytics data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Analytics
              </CardTitle>
              <CardDescription>User growth and activity metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <LoadingSpinner />
              ) : userAnalytics ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Users</p>
                      <p className="text-2xl font-bold">{userAnalytics.totalUsers || 0}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">New Users</p>
                      <p className="text-2xl font-bold">{userAnalytics.newUsers || 0}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Active Users</p>
                      <p className="text-2xl font-bold">{userAnalytics.activeUsers || 0}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Growth Rate</p>
                      <p className="text-2xl font-bold">
                        {userAnalytics.growthRate ? `${(userAnalytics.growthRate * 100).toFixed(2)}%` : '0%'}
                      </p>
                    </div>
                  </div>
                  {userAnalytics.usersOverTime && userAnalytics.usersOverTime.length > 0 && (
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm font-medium mb-4">Users Over Time</p>
                      <div className="space-y-2">
                        {userAnalytics.usersOverTime.slice(-10).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {new Date(item.date).toLocaleDateString()}
                            </span>
                            <span className="font-medium">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No user analytics available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Content Analytics
              </CardTitle>
              <CardDescription>Content creation and engagement metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingContent ? (
                <LoadingSpinner />
              ) : contentAnalytics ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Posts</p>
                      <p className="text-2xl font-bold">{contentAnalytics.totalPosts || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Engagement: {contentAnalytics.postsEngagement || 0}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Videos</p>
                      <p className="text-2xl font-bold">{contentAnalytics.totalVideos || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Engagement: {contentAnalytics.videosEngagement || 0}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Photos</p>
                      <p className="text-2xl font-bold">{contentAnalytics.totalPhotos || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Engagement: {contentAnalytics.photosEngagement || 0}
                      </p>
                    </div>
                  </div>
                  {contentAnalytics.topContent && contentAnalytics.topContent.length > 0 && (
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm font-medium mb-4">Top Content</p>
                      <div className="space-y-2">
                        {contentAnalytics.topContent.slice(0, 10).map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm p-2 border rounded">
                            <div className="flex items-center gap-2">
                              <span className="capitalize">{item.type}</span>
                              <span className="text-muted-foreground text-xs">{item.id.substring(0, 8)}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-muted-foreground">{item.views} views</span>
                              <span className="text-muted-foreground">{item.engagements} engagements</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No content analytics available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

          <TabsContent value="engagement" className="space-y-4">
            <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Engagement Metrics
              </CardTitle>
              <CardDescription>User engagement and interaction metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingEngagement ? (
                <LoadingSpinner />
              ) : engagement ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Likes</p>
                      <p className="text-2xl font-bold">{engagement.totalLikes || 0}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Comments</p>
                      <p className="text-2xl font-bold">{engagement.totalComments || 0}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Shares</p>
                      <p className="text-2xl font-bold">{engagement.totalShares || 0}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Views</p>
                      <p className="text-2xl font-bold">{engagement.totalViews || 0}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Engagement Rate</p>
                      <p className="text-2xl font-bold">
                        {engagement.engagementRate ? `${(engagement.engagementRate * 100).toFixed(2)}%` : '0%'}
                      </p>
                    </div>
                  </div>
                  {engagement.engagementOverTime && engagement.engagementOverTime.length > 0 && (
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm font-medium mb-4">Engagement Over Time</p>
                      <div className="space-y-2">
                        {engagement.engagementOverTime.slice(-10).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm p-2 border rounded">
                            <span className="text-muted-foreground">
                              {new Date(item.date).toLocaleDateString()}
                            </span>
                            <div className="flex items-center gap-4">
                              <span className="text-muted-foreground">{item.likes} likes</span>
                              <span className="text-muted-foreground">{item.comments} comments</span>
                              <span className="text-muted-foreground">{item.shares} shares</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No engagement metrics available</p>
              )}
            </CardContent>
          </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

