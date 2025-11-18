'use client';

import { useAuth } from '@/core/hooks/useAuth';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/theme/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { followsService } from '@/core/api/follows';
import { ArrowLeftIcon, TrendingUpIcon, UsersIcon, UserPlusIcon, UserMinusIcon, HistoryIcon, BarChartIcon, LineChartIcon } from 'lucide-react';
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
    <div className="flex flex-1 flex-col max-w-6xl mx-auto w-full p-4 md:p-8">
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <BarChartIcon className="h-4 w-4 mr-2" />
              Overview
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
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <UsersIcon className="h-5 w-5 text-primary" />
                        Total Followers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-primary">{followAnalytics.totalFollowers}</div>
                    </CardContent>
                  </Card>
                  <Card className="relative overflow-hidden border-chart-2/20 bg-gradient-to-br from-chart-2/10 to-chart-2/5">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-chart-2/10 rounded-full blur-3xl" />
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <UserPlusIcon className="h-5 w-5 text-chart-2" />
                        Total Following
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-chart-2">{followAnalytics.totalFollowing}</div>
                    </CardContent>
                  </Card>
                  <Card className="relative overflow-hidden border-chart-3/20 bg-gradient-to-br from-chart-3/10 to-chart-3/5">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-chart-3/10 rounded-full blur-3xl" />
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUpIcon className="h-5 w-5 text-chart-3" />
                        Top Followers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-chart-3">{followAnalytics.topFollowers?.length || 0}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Growth Charts */}
                {followAnalytics?.followersGrowth && followAnalytics.followersGrowth.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Followers Growth</CardTitle>
                      <CardDescription>Follower count over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart
                          data={followAnalytics.followersGrowth}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                              <stop offset="50%" stopColor="#60a5fa" stopOpacity={0.6} />
                              <stop offset="95%" stopColor="#93c5fd" stopOpacity={0.2} />
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
                              borderRadius: '6px',
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
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
                  <Card>
                    <CardHeader>
                      <CardTitle>Followers Growth</CardTitle>
                      <CardDescription>Follower count over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                        No growth data available yet
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Following Growth Chart */}
                {followAnalytics?.followingGrowth && followAnalytics.followingGrowth.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Following Growth</CardTitle>
                      <CardDescription>Following count over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                          data={followAnalytics.followingGrowth}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
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
                              borderRadius: '6px',
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="count"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ fill: '#10b981', r: 5 }}
                            activeDot={{ r: 8, fill: '#059669' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Following Growth</CardTitle>
                      <CardDescription>Following count over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                        No growth data available yet
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Top Followers */}
                {followAnalytics?.topFollowers && followAnalytics.topFollowers.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Followers</CardTitle>
                      <CardDescription>Your most influential followers</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-6">
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart
                            data={followAnalytics.topFollowers.slice(0, 10).map((f) => ({
                              name: f.displayName.length > 15 ? f.displayName.substring(0, 15) + '...' : f.displayName,
                              followers: f.followersCount,
                            }))}
                            margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.2} />
                            <XAxis
                              dataKey="name"
                              angle={-45}
                              textAnchor="end"
                              height={80}
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
                                borderRadius: '6px',
                              }}
                              labelStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Bar 
                              dataKey="followers" 
                              fill="#8b5cf6" 
                              radius={[4, 4, 0, 0]}
                              stroke="#7c3aed"
                              strokeWidth={1}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-3">
                        {followAnalytics.topFollowers.map((follower, index) => (
                          <div 
                            key={follower.userId} 
                            className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-muted/50 to-muted/30 border border-border/50 hover:border-primary/30 hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 transition-all duration-200"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                index === 0 ? 'bg-chart-1/20' : 
                                index === 1 ? 'bg-chart-2/20' : 
                                index === 2 ? 'bg-chart-3/20' : 'bg-primary/10'
                              }`}>
                                <UsersIcon className={`h-5 w-5 ${
                                  index === 0 ? 'text-chart-1' : 
                                  index === 1 ? 'text-chart-2' : 
                                  index === 2 ? 'text-chart-3' : 'text-primary'
                                }`} />
                              </div>
                              <div>
                                <div className="font-medium">{follower.displayName}</div>
                                <div className="text-sm text-muted-foreground">@{follower.username}</div>
                              </div>
                            </div>
                            <div className="text-sm font-medium text-primary">
                              {follower.followersCount} followers
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
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

          {/* Enhanced Analytics Tab */}
          <TabsContent value="enhanced" className="mt-6">
            {enhancedAnalytics ? (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                {/* Growth Charts */}
                {enhancedAnalytics?.followersGrowth && enhancedAnalytics.followersGrowth.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Followers Growth Trend</CardTitle>
                      <CardDescription>Detailed growth over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={350}>
                        <LineChart
                          data={enhancedAnalytics.followersGrowth}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
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
                              borderRadius: '6px',
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
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
                  <Card>
                    <CardHeader>
                      <CardTitle>Followers Growth Trend</CardTitle>
                      <CardDescription>Detailed growth over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                        No growth data available yet
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Following Growth Chart */}
                {enhancedAnalytics?.followingGrowth && enhancedAnalytics.followingGrowth.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Following Growth Trend</CardTitle>
                      <CardDescription>Following count over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={350}>
                        <AreaChart
                          data={enhancedAnalytics.followingGrowth}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorFollowing" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ec4899" stopOpacity={0.9} />
                              <stop offset="50%" stopColor="#f472b6" stopOpacity={0.6} />
                              <stop offset="95%" stopColor="#fbcfe8" stopOpacity={0.2} />
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
                              borderRadius: '6px',
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
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
                  <Card>
                    <CardHeader>
                      <CardTitle>Following Growth Trend</CardTitle>
                      <CardDescription>Following count over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                        No growth data available yet
                      </div>
                    </CardContent>
                  </Card>
                )}
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
            {followHistory && followHistory.data.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Follow History</CardTitle>
                  <CardDescription>Recent follow and unfollow activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {followHistory.data.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-muted/50 to-muted/30 border border-border/50 hover:border-primary/30 hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 transition-all duration-200">
                        <div className="flex items-center gap-3">
                          {entry.action === 'follow' ? (
                            <UserPlusIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <UserMinusIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                          )}
                          <div>
                            <div className="font-medium">
                              {entry.action === 'follow' ? 'Followed' : 'Unfollowed'}{' '}
                              {entry.following ? (
                                <Link href={`/${entry.following.username}`} className="text-primary hover:text-chart-1 transition-colors">
                                  @{entry.following.username}
                                </Link>
                              ) : (
                                'user'
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(entry.dateCreated).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : isLoadingHistory ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="animate-pulse text-muted-foreground">Loading history...</div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No follow history available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
  );
}

