'use client';

import { useAuth } from '@/core/hooks/useAuth';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/theme/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { followsService } from '@/core/api/follows';
import { postsService } from '@/core/api/posts';
import { ArrowLeftIcon, TrendingUpIcon, UsersIcon, UserPlusIcon, UserMinusIcon, HistoryIcon, BarChartIcon, LineChartIcon, EyeIcon, HeartIcon, MessageCircleIcon, ShareIcon, FileTextIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function AnalyticsPage() {
  const { username } = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isInitializing } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Redirect if not authenticated or wrong user
  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!isInitializing && isAuthenticated && user && user.username !== username) {
      router.push(`/${user.username}/analytics`);
      return;
    }
  }, [isInitializing, isAuthenticated, user, username, router]);

  // Fetch follow analytics
  const {
    data: followAnalytics,
    isLoading: isLoadingAnalytics,
  } = useQuery({
    queryKey: ['follows', 'analytics', user?.id],
    queryFn: () => followsService.getAnalytics(user!.id),
    enabled: !!user?.id && isAuthenticated && user.username === username,
  });

  // Fetch enhanced analytics
  const {
    data: enhancedAnalytics,
    isLoading: isLoadingEnhanced,
  } = useQuery({
    queryKey: ['follows', 'analytics', 'enhanced', user?.id],
    queryFn: () => followsService.getEnhancedAnalytics(user!.id),
    enabled: !!user?.id && isAuthenticated && user.username === username,
  });

  // Fetch follow history
  const {
    data: followHistory,
    isLoading: isLoadingHistory,
  } = useQuery({
    queryKey: ['follows', 'history', user?.id],
    queryFn: () => followsService.getHistory(user!.id, { page: 1, limit: 50 }),
    enabled: !!user?.id && isAuthenticated && user.username === username,
  });

  // Fetch all posts for content analytics (paginate through all pages)
  const {
    data: postsData,
    isLoading: isLoadingPosts,
  } = useQuery({
    queryKey: ['posts', 'user', user?.id, 'analytics'],
    queryFn: async () => {
      // Fetch all posts by paginating through pages (max limit is 100 per page)
      const allPosts = [];
      let page = 1;
      let hasMore = true;
      let lastMeta;
      const limit = 100; // Maximum allowed by backend

      while (hasMore) {
        const response = await postsService.getByUser(user!.id, { page, limit });
        allPosts.push(...response.data);
        lastMeta = response.meta;
        
        // Check if there are more pages
        const totalPages = response.meta?.totalPages || 1;
        hasMore = page < totalPages && response.data.length === limit;
        page++;
        
        // Safety limit: don't fetch more than 50 pages (5000 posts max)
        if (page > 50) break;
      }

      return {
        data: allPosts,
        meta: lastMeta || {
          page: 1,
          limit: allPosts.length,
          total: allPosts.length,
          totalPages: 1,
        },
      };
    },
    enabled: !!user?.id && isAuthenticated && user.username === username,
  });

  // Calculate content analytics from posts
  const contentAnalytics = useMemo(() => {
    if (!postsData?.data || postsData.data.length === 0) {
      return null;
    }

    const posts = postsData.data;
    const publicPosts = posts.filter((p) => p.isPublic && !p.isDraft);

    // Aggregate statistics
    const totalPosts = publicPosts.length;
    const totalViews = publicPosts.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
    const totalLikes = publicPosts.reduce((sum, p) => sum + (p.likesCount || 0), 0);
    const totalComments = publicPosts.reduce((sum, p) => sum + (p.commentsCount || 0), 0);
    const totalShares = publicPosts.reduce((sum, p) => sum + (p.sharesCount || 0), 0);
    const totalEngagements = totalLikes + totalComments + totalShares;
    const avgEngagementRate = totalViews > 0 ? (totalEngagements / totalViews) * 100 : 0;

    // Group posts by month for time series data
    const postsByMonth = publicPosts.reduce((acc, post) => {
      const date = new Date(post.dateCreated);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[monthKey]) {
        acc[monthKey] = {
          period: monthKey,
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          posts: 0,
        };
      }
      acc[monthKey].views += post.viewsCount || 0;
      acc[monthKey].likes += post.likesCount || 0;
      acc[monthKey].comments += post.commentsCount || 0;
      acc[monthKey].shares += post.sharesCount || 0;
      acc[monthKey].posts += 1;
      return acc;
    }, {} as Record<string, { period: string; views: number; likes: number; comments: number; shares: number; posts: number }>);

    const engagementOverTime = Object.values(postsByMonth).sort((a, b) => 
      a.period.localeCompare(b.period)
    );

    // Top performing posts
    const topPosts = [...publicPosts]
      .sort((a, b) => {
        const aEngagement = (a.viewsCount || 0) + (a.likesCount || 0) + (a.commentsCount || 0) + (a.sharesCount || 0);
        const bEngagement = (b.viewsCount || 0) + (b.likesCount || 0) + (b.commentsCount || 0) + (b.sharesCount || 0);
        return bEngagement - aEngagement;
      })
      .slice(0, 10);

    return {
      totalPosts,
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      totalEngagements,
      avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
      engagementOverTime,
      topPosts,
    };
  }, [postsData]);

  if (isInitializing || isLoadingAnalytics) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user || user.username !== username) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col w-full min-w-0">
      <div className="w-full p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${username}/dashboard`}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Analytics
          </h1>
          <p className="text-muted-foreground">
            Track your follower growth, engagement, and activity
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <BarChartIcon className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <FileTextIcon className="h-4 w-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="enhanced" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <LineChartIcon className="h-4 w-4 mr-2" />
              Enhanced Analytics
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <HistoryIcon className="h-4 w-4 mr-2" />
              Follow History
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            {followAnalytics ? (
              <div className="space-y-6 lg:space-y-8">
                {/* Summary Cards - Enhanced Design */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                  <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <UsersIcon className="h-4 w-4 text-primary" />
                        Total Followers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-primary mb-1">{followAnalytics.totalFollowers.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Active followers</p>
                    </CardContent>
                  </Card>
                  <Card className="relative overflow-hidden border-green-500/30 bg-gradient-to-br from-green-500/20 via-green-500/10 to-green-500/5 shadow-lg shadow-green-500/10 hover:shadow-xl hover:shadow-green-500/20 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <UserPlusIcon className="h-4 w-4 text-green-500" />
                        Total Following
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-green-500 mb-1">{followAnalytics.totalFollowing.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">People you follow</p>
                    </CardContent>
                  </Card>
                  <Card className="relative overflow-hidden border-yellow-500/30 bg-gradient-to-br from-yellow-500/20 via-yellow-500/10 to-yellow-500/5 shadow-lg shadow-yellow-500/10 hover:shadow-xl hover:shadow-yellow-500/20 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <TrendingUpIcon className="h-4 w-4 text-yellow-500" />
                        Top Followers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-yellow-500 mb-1">{followAnalytics.topFollowers?.length || 0}</div>
                      <p className="text-xs text-muted-foreground">Influential accounts</p>
                    </CardContent>
                  </Card>
                  <Card className="relative overflow-hidden border-purple-500/30 bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-purple-500/5 shadow-lg shadow-purple-500/10 hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <BarChartIcon className="h-4 w-4 text-purple-500" />
                        Net Growth
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-purple-500 mb-1">
                        {(followAnalytics.totalFollowers - followAnalytics.totalFollowing).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">Followers - Following</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Growth Charts - Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  {/* Followers Growth */}
                  {followAnalytics?.followersGrowth && followAnalytics.followersGrowth.length > 0 ? (
                    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-xl font-bold">Followers Growth</CardTitle>
                            <CardDescription className="mt-1">Follower count over time</CardDescription>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                            <UsersIcon className="h-6 w-6 text-primary" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={350}>
                          <AreaChart
                            data={followAnalytics.followersGrowth}
                            margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                                <stop offset="50%" stopColor="#60a5fa" stopOpacity={0.6} />
                                <stop offset="95%" stopColor="#93c5fd" stopOpacity={0.2} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.1} />
                            <XAxis
                              dataKey="period"
                              className="text-xs"
                              tick={{ fill: '#ffffff', fontSize: 11 }}
                              stroke="#ffffff"
                              strokeWidth={1}
                            />
                            <YAxis
                              className="text-xs"
                              tick={{ fill: '#ffffff', fontSize: 11 }}
                              stroke="#ffffff"
                              strokeWidth={1}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                              }}
                              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                            />
                            <Area
                              type="monotone"
                              dataKey="count"
                              stroke="#3b82f6"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#colorFollowers)"
                              dot={{ fill: '#3b82f6', r: 4 }}
                              activeDot={{ r: 6, fill: '#2563eb' }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
                      <CardHeader>
                        <CardTitle>Followers Growth</CardTitle>
                        <CardDescription>Follower count over time</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-12 text-muted-foreground">
                          No growth data available yet
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Following Growth */}
                  {followAnalytics?.followingGrowth && followAnalytics.followingGrowth.length > 0 ? (
                    <Card className="border-green-500/20 bg-gradient-to-br from-background to-green-500/5 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-xl font-bold">Following Growth</CardTitle>
                            <CardDescription className="mt-1">Following count over time</CardDescription>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                            <UserPlusIcon className="h-6 w-6 text-green-500" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={350}>
                          <LineChart
                            data={followAnalytics.followingGrowth}
                            margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.1} />
                            <XAxis
                              dataKey="period"
                              className="text-xs"
                              tick={{ fill: '#ffffff', fontSize: 11 }}
                              stroke="#ffffff"
                              strokeWidth={1}
                            />
                            <YAxis
                              className="text-xs"
                              tick={{ fill: '#ffffff', fontSize: 11 }}
                              stroke="#ffffff"
                              strokeWidth={1}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                              }}
                              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="count"
                              stroke="#10b981"
                              strokeWidth={3}
                              dot={{ fill: '#10b981', r: 4 }}
                              activeDot={{ r: 6, fill: '#059669' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-green-500/20 bg-gradient-to-br from-background to-green-500/5">
                      <CardHeader>
                        <CardTitle>Following Growth</CardTitle>
                        <CardDescription>Following count over time</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-12 text-muted-foreground">
                          No growth data available yet
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Top Followers - Enhanced Layout */}
                {followAnalytics?.topFollowers && followAnalytics.topFollowers.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                    {/* Bar Chart - Enhanced */}
                    <Card className="border-purple-500/20 bg-gradient-to-br from-background to-purple-500/5 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-xl font-bold">Top Followers Chart</CardTitle>
                            <CardDescription className="mt-1">Followers count comparison</CardDescription>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <BarChartIcon className="h-6 w-6 text-purple-500" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart
                            data={followAnalytics.topFollowers.slice(0, 10).map((f, index) => ({
                              name: f.displayName.length > 12 ? f.displayName.substring(0, 12) + '...' : f.displayName,
                              followers: f.followersCount,
                              rank: index + 1,
                            }))}
                            margin={{ top: 20, right: 30, left: -20, bottom: 60 }}
                          >
                            <defs>
                              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                                <stop offset="50%" stopColor="#a78bfa" stopOpacity={0.8} />
                                <stop offset="100%" stopColor="#c4b5fd" stopOpacity={0.6} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.1} />
                            <XAxis
                              dataKey="name"
                              angle={-45}
                              textAnchor="end"
                              height={80}
                              className="text-xs"
                              tick={{ fill: '#ffffff', fontSize: 11 }}
                              stroke="#ffffff"
                              strokeWidth={1}
                            />
                            <YAxis
                              className="text-xs"
                              tick={{ fill: '#ffffff', fontSize: 11 }}
                              stroke="#ffffff"
                              strokeWidth={1}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                              }}
                              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                              formatter={(value: number) => [value.toLocaleString(), 'Followers']}
                            />
                            <Bar 
                              dataKey="followers" 
                              fill="url(#barGradient)" 
                              radius={[8, 8, 0, 0]}
                              stroke="#7c3aed"
                              strokeWidth={2}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Top Followers List */}
                    <Card className="border-purple-500/20 bg-gradient-to-br from-background to-purple-500/5 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-xl font-bold">Top Followers</CardTitle>
                            <CardDescription className="mt-1">Your most influential followers</CardDescription>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <UsersIcon className="h-6 w-6 text-purple-500" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {followAnalytics.topFollowers.slice(0, 10).map((follower, index) => (
                            <div 
                              key={follower.userId} 
                              className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-muted/50 to-muted/30 border border-border/50 hover:border-primary/30 hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 transition-all duration-200 group"
                            >
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-md ${
                                  index === 0 ? 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 text-yellow-500 ring-2 ring-yellow-500/50' : 
                                  index === 1 ? 'bg-gradient-to-br from-gray-400/30 to-gray-500/20 text-gray-400 ring-2 ring-gray-400/50' : 
                                  index === 2 ? 'bg-gradient-to-br from-orange-500/30 to-orange-600/20 text-orange-500 ring-2 ring-orange-500/50' : 
                                  'bg-gradient-to-br from-primary/30 to-primary/20 text-primary ring-2 ring-primary/50'
                                }`}>
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                                    {follower.displayName}
                                  </div>
                                  <div className="text-sm text-muted-foreground truncate">@{follower.username}</div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end">
                                <div className="text-base font-bold text-primary">
                                  {follower.followersCount.toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground">followers</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : null}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No analytics data available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Content Analytics Tab */}
          <TabsContent value="content" className="mt-6">
            {isLoadingPosts ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="animate-pulse text-muted-foreground">Loading content analytics...</div>
                </CardContent>
              </Card>
            ) : contentAnalytics ? (
              <div className="space-y-6 lg:space-y-8">
                {/* Summary Cards - Enhanced Design */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 lg:gap-6">
                  <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <FileTextIcon className="h-4 w-4 text-primary" />
                        Total Posts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-primary mb-1">{contentAnalytics.totalPosts.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Public posts</p>
                    </CardContent>
                  </Card>
                  <Card className="relative overflow-hidden border-blue-500/30 bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-blue-500/5 shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <EyeIcon className="h-4 w-4 text-blue-500" />
                        Total Views
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-blue-500 mb-1">{contentAnalytics.totalViews.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Post views</p>
                    </CardContent>
                  </Card>
                  <Card className="relative overflow-hidden border-red-500/30 bg-gradient-to-br from-red-500/20 via-red-500/10 to-red-500/5 shadow-lg shadow-red-500/10 hover:shadow-xl hover:shadow-red-500/20 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <HeartIcon className="h-4 w-4 text-red-500" />
                        Total Likes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-red-500 mb-1">{contentAnalytics.totalLikes.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Likes received</p>
                    </CardContent>
                  </Card>
                  <Card className="relative overflow-hidden border-green-500/30 bg-gradient-to-br from-green-500/20 via-green-500/10 to-green-500/5 shadow-lg shadow-green-500/10 hover:shadow-xl hover:shadow-green-500/20 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <MessageCircleIcon className="h-4 w-4 text-green-500" />
                        Total Comments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-green-500 mb-1">{contentAnalytics.totalComments.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Comments received</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
                  <Card className="relative overflow-hidden border-purple-500/30 bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-purple-500/5 shadow-lg shadow-purple-500/10 hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <ShareIcon className="h-4 w-4 text-purple-500" />
                        Total Shares
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-purple-500 mb-1">{contentAnalytics.totalShares.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Shares received</p>
                    </CardContent>
                  </Card>
                  <Card className="relative overflow-hidden border-yellow-500/30 bg-gradient-to-br from-yellow-500/20 via-yellow-500/10 to-yellow-500/5 shadow-lg shadow-yellow-500/10 hover:shadow-xl hover:shadow-yellow-500/20 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <TrendingUpIcon className="h-4 w-4 text-yellow-500" />
                        Total Engagements
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-yellow-500 mb-1">{contentAnalytics.totalEngagements.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Total interactions</p>
                    </CardContent>
                  </Card>
                  <Card className="relative overflow-hidden border-orange-500/30 bg-gradient-to-br from-orange-500/20 via-orange-500/10 to-orange-500/5 shadow-lg shadow-orange-500/10 hover:shadow-xl hover:shadow-orange-500/20 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <BarChartIcon className="h-4 w-4 text-orange-500" />
                        Avg Engagement Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-orange-500 mb-1">{contentAnalytics.avgEngagementRate.toFixed(2)}%</div>
                      <p className="text-xs text-muted-foreground">Engagement ratio</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Engagement Charts - Multiple Graphs */}
                {contentAnalytics.engagementOverTime && contentAnalytics.engagementOverTime.length > 0 ? (
                  <div className="space-y-6 lg:space-y-8">
                    {/* Combined Engagement Over Time */}
                    <Card className="border-blue-500/20 bg-gradient-to-br from-background to-blue-500/5 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-xl font-bold">Engagement Over Time</CardTitle>
                            <CardDescription className="mt-1">Views, likes, comments, and shares by month</CardDescription>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <LineChartIcon className="h-6 w-6 text-blue-500" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={450}>
                        <AreaChart
                          data={contentAnalytics.engagementOverTime}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="colorShares" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.2} />
                          <XAxis
                            dataKey="period"
                            className="text-xs"
                            tick={{ fill: '#ffffff' }}
                            stroke="#ffffff"
                            strokeWidth={1}
                          />
                          <YAxis
                            className="text-xs"
                            tick={{ fill: '#ffffff' }}
                            stroke="#ffffff"
                            strokeWidth={1}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                          />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="views"
                            stackId="1"
                            stroke="#3b82f6"
                            fill="url(#colorViews)"
                            name="Views"
                          />
                          <Area
                            type="monotone"
                            dataKey="likes"
                            stackId="1"
                            stroke="#ef4444"
                            fill="url(#colorLikes)"
                            name="Likes"
                          />
                          <Area
                            type="monotone"
                            dataKey="comments"
                            stackId="1"
                            stroke="#10b981"
                            fill="url(#colorComments)"
                            name="Comments"
                          />
                          <Area
                            type="monotone"
                            dataKey="shares"
                            stackId="1"
                            stroke="#a855f7"
                            fill="url(#colorShares)"
                            name="Shares"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                    {/* Individual Engagement Metrics - 2x2 Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                      {/* Views Over Time */}
                      <Card className="border-blue-500/20 bg-gradient-to-br from-background to-blue-500/5 shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg font-bold">Views Over Time</CardTitle>
                              <CardDescription className="mt-1">Post views by month</CardDescription>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                              <EyeIcon className="h-5 w-5 text-blue-500" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <AreaChart
                              data={contentAnalytics.engagementOverTime}
                              margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="colorViewsOnly" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.1} />
                              <XAxis dataKey="period" className="text-xs" tick={{ fill: '#ffffff', fontSize: 10 }} stroke="#ffffff" strokeWidth={1} />
                              <YAxis className="text-xs" tick={{ fill: '#ffffff', fontSize: 10 }} stroke="#ffffff" strokeWidth={1} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--background))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                }}
                                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                              />
                              <Area type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorViewsOnly)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Likes Over Time */}
                      <Card className="border-red-500/20 bg-gradient-to-br from-background to-red-500/5 shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg font-bold">Likes Over Time</CardTitle>
                              <CardDescription className="mt-1">Post likes by month</CardDescription>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                              <HeartIcon className="h-5 w-5 text-red-500" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <AreaChart
                              data={contentAnalytics.engagementOverTime}
                              margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="colorLikesOnly" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9} />
                                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.1} />
                              <XAxis dataKey="period" className="text-xs" tick={{ fill: '#ffffff', fontSize: 10 }} stroke="#ffffff" strokeWidth={1} />
                              <YAxis className="text-xs" tick={{ fill: '#ffffff', fontSize: 10 }} stroke="#ffffff" strokeWidth={1} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--background))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                }}
                                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                              />
                              <Area type="monotone" dataKey="likes" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorLikesOnly)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Comments Over Time */}
                      <Card className="border-green-500/20 bg-gradient-to-br from-background to-green-500/5 shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg font-bold">Comments Over Time</CardTitle>
                              <CardDescription className="mt-1">Post comments by month</CardDescription>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                              <MessageCircleIcon className="h-5 w-5 text-green-500" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <AreaChart
                              data={contentAnalytics.engagementOverTime}
                              margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="colorCommentsOnly" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.2} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.1} />
                              <XAxis dataKey="period" className="text-xs" tick={{ fill: '#ffffff', fontSize: 10 }} stroke="#ffffff" strokeWidth={1} />
                              <YAxis className="text-xs" tick={{ fill: '#ffffff', fontSize: 10 }} stroke="#ffffff" strokeWidth={1} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--background))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                }}
                                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                              />
                              <Area type="monotone" dataKey="comments" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCommentsOnly)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Shares Over Time */}
                      <Card className="border-purple-500/20 bg-gradient-to-br from-background to-purple-500/5 shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg font-bold">Shares Over Time</CardTitle>
                              <CardDescription className="mt-1">Post shares by month</CardDescription>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                              <ShareIcon className="h-5 w-5 text-purple-500" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <AreaChart
                              data={contentAnalytics.engagementOverTime}
                              margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="colorSharesOnly" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.9} />
                                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.2} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.1} />
                              <XAxis dataKey="period" className="text-xs" tick={{ fill: '#ffffff', fontSize: 10 }} stroke="#ffffff" strokeWidth={1} />
                              <YAxis className="text-xs" tick={{ fill: '#ffffff', fontSize: 10 }} stroke="#ffffff" strokeWidth={1} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--background))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                }}
                                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                              />
                              <Area type="monotone" dataKey="shares" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorSharesOnly)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Engagement Over Time</CardTitle>
                      <CardDescription>Views, likes, comments, and shares by month</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                        No engagement data available yet
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Top Performing Posts */}
                {contentAnalytics.topPosts && contentAnalytics.topPosts.length > 0 ? (
                  <Card className="border-orange-500/20 bg-gradient-to-br from-background to-orange-500/5 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl font-bold">Top Performing Posts</CardTitle>
                          <CardDescription className="mt-1">Your most engaging posts ranked by total engagement</CardDescription>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                          <TrendingUpIcon className="h-6 w-6 text-orange-500" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {contentAnalytics.topPosts.map((post, index) => {
                          const postEngagement = (post.viewsCount || 0) + (post.likesCount || 0) + (post.commentsCount || 0) + (post.sharesCount || 0);
                          return (
                            <div
                              key={post.id}
                              className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-muted/50 to-muted/30 border border-border/50 hover:border-primary/30 hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 transition-all duration-200 group"
                            >
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-lg shadow-md ${
                                  index === 0 ? 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 text-yellow-500 ring-2 ring-yellow-500/50' :
                                  index === 1 ? 'bg-gradient-to-br from-gray-400/30 to-gray-500/20 text-gray-400 ring-2 ring-gray-400/50' :
                                  index === 2 ? 'bg-gradient-to-br from-orange-500/30 to-orange-600/20 text-orange-500 ring-2 ring-orange-500/50' :
                                  'bg-gradient-to-br from-primary/30 to-primary/20 text-primary ring-2 ring-primary/50'
                                }`}>
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-base text-foreground truncate group-hover:text-primary transition-colors">
                                    {post.content ? (
                                      post.content.length > 80
                                        ? `${post.content.substring(0, 80)}...`
                                        : post.content
                                    ) : 'Post'}
                                  </p>
                                  <div className="flex items-center gap-4 mt-2 text-sm">
                                    <span className="flex items-center gap-1.5 text-blue-500">
                                      <EyeIcon className="h-4 w-4" />
                                      <span className="font-medium">{(post.viewsCount || 0).toLocaleString()}</span>
                                    </span>
                                    <span className="flex items-center gap-1.5 text-red-500">
                                      <HeartIcon className="h-4 w-4" />
                                      <span className="font-medium">{(post.likesCount || 0).toLocaleString()}</span>
                                    </span>
                                    <span className="flex items-center gap-1.5 text-green-500">
                                      <MessageCircleIcon className="h-4 w-4" />
                                      <span className="font-medium">{(post.commentsCount || 0).toLocaleString()}</span>
                                    </span>
                                    <span className="flex items-center gap-1.5 text-purple-500">
                                      <ShareIcon className="h-4 w-4" />
                                      <span className="font-medium">{(post.sharesCount || 0).toLocaleString()}</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="ml-4 flex-shrink-0 flex flex-col items-end gap-2">
                                <div className="text-xs font-semibold text-muted-foreground">Total</div>
                                <div className="text-lg font-bold text-primary">{postEngagement.toLocaleString()}</div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  className="h-8"
                                >
                                  <Link href={`/${username}/posts/${post.id}`}>
                                    View →
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Performing Posts</CardTitle>
                      <CardDescription>Your most engaging posts</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                        No posts available yet
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No content analytics data available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Enhanced Analytics Tab */}
          <TabsContent value="enhanced" className="mt-6">
            {enhancedAnalytics ? (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 lg:gap-6">
                  <Card className="relative overflow-hidden border-chart-1/20 bg-gradient-to-br from-chart-1/10 to-chart-1/5">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-chart-1/10 rounded-full blur-2xl" />
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUpIcon className="h-4 w-4 text-chart-1" />
                        Growth Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-chart-1">
                        {(enhancedAnalytics?.growthRate ?? 0).toFixed(2)}%
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="relative overflow-hidden border-chart-2/20 bg-gradient-to-br from-chart-2/10 to-chart-2/5">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-chart-2/10 rounded-full blur-2xl" />
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BarChartIcon className="h-4 w-4 text-chart-2" />
                        Engagement Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-chart-2">
                        {(enhancedAnalytics?.engagementRate ?? 0).toFixed(2)}%
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="relative overflow-hidden border-chart-3/20 bg-gradient-to-br from-chart-3/10 to-chart-3/5">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-chart-3/10 rounded-full blur-2xl" />
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <UsersIcon className="h-4 w-4 text-chart-3" />
                        Retention Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-chart-3">
                        {(enhancedAnalytics?.engagementMetrics?.followerRetentionRate ?? 0).toFixed(2)}%
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="relative overflow-hidden border-chart-4/20 bg-gradient-to-br from-chart-4/10 to-chart-4/5">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-chart-4/10 rounded-full blur-2xl" />
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <LineChartIcon className="h-4 w-4 text-chart-4" />
                        Avg Followers/Day
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-chart-4">
                        {(enhancedAnalytics?.engagementMetrics?.averageFollowersPerDay ?? 0).toFixed(1)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Peak Growth Period */}
                {enhancedAnalytics.peakGrowthPeriod && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Peak Growth Period</CardTitle>
                      <CardDescription>Your best performing period</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Period</span>
                          <span className="font-medium">
                            {new Date(enhancedAnalytics.peakGrowthPeriod.startDate).toLocaleDateString()} - {new Date(enhancedAnalytics.peakGrowthPeriod.endDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Followers Gained</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            +{enhancedAnalytics.peakGrowthPeriod.followersGained}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Growth Charts - Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  {/* Followers Growth Trend */}
                  {enhancedAnalytics?.followersGrowth && enhancedAnalytics.followersGrowth.length > 0 ? (
                    <Card className="border-yellow-500/20 bg-gradient-to-br from-background to-yellow-500/5 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-xl font-bold">Followers Growth Trend</CardTitle>
                            <CardDescription className="mt-1">Detailed growth over time</CardDescription>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                            <TrendingUpIcon className="h-6 w-6 text-yellow-500" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                          <LineChart
                            data={enhancedAnalytics.followersGrowth}
                            margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.1} />
                            <XAxis
                              dataKey="period"
                              className="text-xs"
                              tick={{ fill: '#ffffff', fontSize: 11 }}
                              stroke="#ffffff"
                              strokeWidth={1}
                            />
                            <YAxis
                              className="text-xs"
                              tick={{ fill: '#ffffff', fontSize: 11 }}
                              stroke="#ffffff"
                              strokeWidth={1}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                              }}
                              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="count"
                              stroke="#f59e0b"
                              strokeWidth={3}
                              dot={{ fill: '#f59e0b', r: 5 }}
                              activeDot={{ r: 8, fill: '#d97706' }}
                              name="Followers"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-yellow-500/20 bg-gradient-to-br from-background to-yellow-500/5">
                      <CardHeader>
                        <CardTitle>Followers Growth Trend</CardTitle>
                        <CardDescription>Detailed growth over time</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-12 text-muted-foreground">
                          No growth data available yet
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Following Growth Trend */}
                  {enhancedAnalytics?.followingGrowth && enhancedAnalytics.followingGrowth.length > 0 ? (
                    <Card className="border-pink-500/20 bg-gradient-to-br from-background to-pink-500/5 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-xl font-bold">Following Growth Trend</CardTitle>
                            <CardDescription className="mt-1">Following count over time</CardDescription>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                            <UserPlusIcon className="h-6 w-6 text-pink-500" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                          <AreaChart
                            data={enhancedAnalytics.followingGrowth}
                            margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="colorFollowing" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.9} />
                                <stop offset="50%" stopColor="#f472b6" stopOpacity={0.6} />
                                <stop offset="95%" stopColor="#fbcfe8" stopOpacity={0.2} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.1} />
                            <XAxis
                              dataKey="period"
                              className="text-xs"
                              tick={{ fill: '#ffffff', fontSize: 11 }}
                              stroke="#ffffff"
                              strokeWidth={1}
                            />
                            <YAxis
                              className="text-xs"
                              tick={{ fill: '#ffffff', fontSize: 11 }}
                              stroke="#ffffff"
                              strokeWidth={1}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                              }}
                              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                            />
                            <Area
                              type="monotone"
                              dataKey="count"
                              stroke="#ec4899"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#colorFollowing)"
                              dot={{ fill: '#ec4899', r: 4 }}
                              activeDot={{ r: 6, fill: '#db2777' }}
                              name="Following"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-pink-500/20 bg-gradient-to-br from-background to-pink-500/5">
                      <CardHeader>
                        <CardTitle>Following Growth Trend</CardTitle>
                        <CardDescription>Following count over time</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-12 text-muted-foreground">
                          No growth data available yet
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            ) : isLoadingEnhanced ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="animate-pulse text-muted-foreground">Loading enhanced analytics...</div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No enhanced analytics data available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Follow History Tab */}
          <TabsContent value="history" className="mt-6">
            {isLoadingHistory ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="animate-pulse text-muted-foreground">Loading history...</div>
                </CardContent>
              </Card>
            ) : followHistory && followHistory.data && followHistory.data.length > 0 ? (
              <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold">Follow History</CardTitle>
                      <CardDescription className="mt-1">Recent follow and unfollow activity</CardDescription>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <HistoryIcon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {followHistory.data.map((entry, index) => (
                      <div 
                        key={`${entry.targetUserId}-${entry.timestamp}-${index}`} 
                        className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-muted/50 to-muted/30 border border-border/50 hover:border-primary/30 hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            entry.type === 'follow' 
                              ? 'bg-green-500/20 text-green-500 ring-2 ring-green-500/30' 
                              : 'bg-red-500/20 text-red-500 ring-2 ring-red-500/30'
                          }`}>
                            {entry.type === 'follow' ? (
                              <UserPlusIcon className="h-5 w-5" />
                            ) : (
                              <UserMinusIcon className="h-5 w-5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-base">
                              {entry.type === 'follow' ? 'Followed' : 'Unfollowed'}{' '}
                              <Link 
                                href={`/${entry.targetUsername}`} 
                                className="text-primary hover:text-chart-1 transition-colors font-bold"
                              >
                                @{entry.targetUsername}
                              </Link>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {new Date(entry.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          entry.type === 'follow'
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-red-500/20 text-red-500'
                        }`}>
                          {entry.type === 'follow' ? 'Follow' : 'Unfollow'}
                        </div>
                      </div>
                    ))}
                  </div>
                  {followHistory.meta && followHistory.meta.total > followHistory.data.length && (
                    <div className="mt-4 text-center text-sm text-muted-foreground">
                      Showing {followHistory.data.length} of {followHistory.meta.total} entries
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
                <CardHeader>
                  <CardTitle>Follow History</CardTitle>
                  <CardDescription>Recent follow and unfollow activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <HistoryIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground text-lg font-medium mb-2">No follow history available</p>
                    <p className="text-sm text-muted-foreground">Your follow and unfollow activities will appear here</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

