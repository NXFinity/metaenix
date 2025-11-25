'use client';

import { useAuth } from '@/core/hooks/useAuth';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/core/api/data/analytics';
import { followsService } from '@/core/api/users/follows';
import { photosService } from '@/core/api/users/photos';
import { videosService } from '@/core/api/users/videos';
import { Button } from '@/theme/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/theme/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/theme/ui/tabs';
import {
  ArrowLeftIcon,
  BarChart3Icon,
  TrendingUpIcon,
  FileTextIcon,
  VideoIcon,
  ImageIcon,
  GlobeIcon,
  EyeIcon,
  HeartIcon,
  MessageCircleIcon,
  ShareIcon,
  UsersIcon,
  ClockIcon,
  MapPinIcon,
  Loader2,
  UserPlusIcon,
  UserMinusIcon,
  DownloadIcon,
  UserCheckIcon,
} from 'lucide-react';
import Link from 'next/link';

// Helper function to format watch time
const formatWatchTime = (seconds: number): string => {
  if (!seconds || seconds === 0) return '0h';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
};

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

  // Fetch analytics data
  const { data: userAnalytics, isLoading: isLoadingUserAnalytics } = useQuery({
    queryKey: ['userAnalytics', user?.id],
    queryFn: () => analyticsService.getUserAnalytics(user!.id),
    enabled: !!user?.id && (activeTab === 'overview' || activeTab === 'follows'),
  });

  const { data: aggregateAnalytics, isLoading: isLoadingAggregate } = useQuery({
    queryKey: ['aggregateAnalytics', user?.id],
    queryFn: () => analyticsService.getAggregateAnalytics(user!.id),
    enabled: !!user?.id && activeTab === 'overview',
  });

  const { data: postAnalytics, isLoading: isLoadingPostAnalytics } = useQuery({
    queryKey: ['userPostAnalytics', user?.id],
    queryFn: () => analyticsService.getUserPostAnalytics(user!.id),
    enabled: !!user?.id && activeTab === 'posts',
  });

  const { data: videoAnalytics, isLoading: isLoadingVideoAnalytics } = useQuery({
    queryKey: ['userVideoAnalytics', user?.id],
    queryFn: () => analyticsService.getUserVideoAnalytics(user!.id),
    enabled: !!user?.id && activeTab === 'videos',
  });

  const { data: photoAnalytics, isLoading: isLoadingPhotoAnalytics } = useQuery({
    queryKey: ['userPhotoAnalytics', user?.id],
    queryFn: () => analyticsService.getUserPhotoAnalytics(user!.id),
    enabled: !!user?.id && activeTab === 'photos',
  });

  // Fetch photos count for display
  const { data: photosData } = useQuery({
    queryKey: ['photos', 'user', user?.id, 'count'],
    queryFn: () => photosService.getByUser(user!.id, { page: 1, limit: 1 }),
    enabled: !!user?.id && activeTab === 'photos',
  });

  const { data: geographicAnalytics, isLoading: isLoadingGeographic } = useQuery({
    queryKey: ['geographicAnalytics', user?.id],
    queryFn: () => analyticsService.getGeographicAnalytics(user!.id),
    enabled: !!user?.id && activeTab === 'geographic',
  });

  // Follow analytics queries
  const { data: followStats, isLoading: isLoadingFollowStats } = useQuery({
    queryKey: ['followStats', user?.id],
    queryFn: () => followsService.getStats(user!.id),
    enabled: !!user?.id && activeTab === 'follows',
  });

  const { data: followAnalytics, isLoading: isLoadingFollowAnalytics } = useQuery({
    queryKey: ['followAnalytics', user?.id],
    queryFn: () => followsService.getAnalytics(user!.id),
    enabled: !!user?.id && activeTab === 'follows',
  });

  const { data: enhancedFollowAnalytics, isLoading: isLoadingEnhancedFollowAnalytics } = useQuery({
    queryKey: ['enhancedFollowAnalytics', user?.id],
    queryFn: () => followsService.getEnhancedAnalytics(user!.id),
    enabled: !!user?.id && activeTab === 'follows',
  });

  const { data: followHistory, isLoading: isLoadingFollowHistory } = useQuery({
    queryKey: ['followHistory', user?.id],
    queryFn: () => followsService.getHistory(user!.id, { page: 1, limit: 50 }),
    enabled: !!user?.id && activeTab === 'follows',
  });

  // Shared content queries
  const { data: sharedPhotosData, isLoading: isLoadingSharedPhotos } = useQuery({
    queryKey: ['photos', 'shared', user?.id, 'analytics'],
    queryFn: () => photosService.getSharedPhotos({ page: 1, limit: 1 }),
    enabled: !!user?.id && (activeTab === 'shared' || activeTab === 'overview'),
  });

  const { data: sharedVideosData, isLoading: isLoadingSharedVideos } = useQuery({
    queryKey: ['videos', 'shared', user?.id, 'analytics'],
    queryFn: () => videosService.getSharedVideos({ page: 1, limit: 1 }),
    enabled: !!user?.id && (activeTab === 'shared' || activeTab === 'overview'),
  });

  // Export handlers
  const handleExportFollowers = async (format: 'csv' | 'json') => {
    if (!user?.id) return;
    try {
      const data = await followsService.exportFollowers(user.id, format);
      const blob = format === 'json' ? new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }) : data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `followers.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export followers:', error);
    }
  };

  const handleExportFollowing = async (format: 'csv' | 'json') => {
    if (!user?.id) return;
    try {
      const data = await followsService.exportFollowing(user.id, format);
      const blob = format === 'json' ? new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }) : data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `following.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export following:', error);
    }
  };

  if (isInitializing || !user || user.username !== username) {
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
    <div className="w-full">
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
              <Link href={`/${username}/dashboard`}>
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div className="h-10 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-2xl" />
                <div className="relative p-3 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/20 shadow-lg">
                  <BarChart3Icon className="h-7 w-7 text-primary" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    Analytics
                  </h1>
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                    <TrendingUpIcon className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">Live</span>
                  </div>
                </div>
                <p className="text-sm md:text-base text-muted-foreground">
                  Track your performance and engagement metrics in real-time
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Content */}
      <div className="w-full px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start border-b border-border/50 bg-transparent p-0 h-auto mb-6">
            <TabsTrigger 
              value="overview" 
              className="px-4 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent"
            >
              <BarChart3Icon className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="posts" 
              className="px-4 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent"
            >
              <FileTextIcon className="h-4 w-4 mr-2" />
              Posts
            </TabsTrigger>
            <TabsTrigger 
              value="videos" 
              className="px-4 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent"
            >
              <VideoIcon className="h-4 w-4 mr-2" />
              Videos
            </TabsTrigger>
            <TabsTrigger 
              value="photos" 
              className="px-4 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent"
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Photos
            </TabsTrigger>
            <TabsTrigger 
              value="geographic" 
              className="px-4 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent"
            >
              <GlobeIcon className="h-4 w-4 mr-2" />
              Geographic
            </TabsTrigger>
            <TabsTrigger 
              value="follows" 
              className="px-4 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent"
            >
              <UsersIcon className="h-4 w-4 mr-2" />
              Follows
            </TabsTrigger>
            <TabsTrigger 
              value="shared" 
              className="px-4 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent"
            >
              <ShareIcon className="h-4 w-4 mr-2" />
              Shared Content
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0 space-y-6">
            {isLoadingUserAnalytics || isLoadingAggregate || isLoadingSharedPhotos || isLoadingSharedVideos ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <EyeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Total Views</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {aggregateAnalytics?.totalViews?.toLocaleString() ?? userAnalytics?.viewsCount?.toLocaleString() ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                          <UsersIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Followers</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {userAnalytics?.followersCount?.toLocaleString() ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <HeartIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Total Likes</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {userAnalytics?.likesReceivedCount?.toLocaleString() ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-orange-500/10">
                          <MessageCircleIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Total Comments</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {userAnalytics?.commentsCount?.toLocaleString() ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {/* Engagement & Sharing Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-teal-500/10">
                          <ShareIcon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Shares Received</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {userAnalytics?.sharesReceivedCount?.toLocaleString() ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-cyan-500/10">
                          <ImageIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Shared Photos</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {sharedPhotosData?.meta?.total?.toLocaleString() ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    {sharedPhotosData?.meta?.total && sharedPhotosData.meta.total > 0 && (
                      <CardContent>
                        <Button variant="ghost" size="sm" className="w-full" asChild>
                          <Link href={`/${username}/photos/shared`}>
                            View Shared Photos
                          </Link>
                        </Button>
                      </CardContent>
                    )}
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-orange-500/10">
                          <VideoIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Shared Videos</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {sharedVideosData?.meta?.total?.toLocaleString() ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    {sharedVideosData?.meta?.total && sharedVideosData.meta.total > 0 && (
                      <CardContent>
                        <Button variant="ghost" size="sm" className="w-full" asChild>
                          <Link href={`/${username}/videos/shared`}>
                            View Shared Videos
                          </Link>
                        </Button>
                      </CardContent>
                    )}
                  </Card>
                </div>

                {/* Views Over Time Chart Area */}
                <Card>
                  <CardHeader>
                    <CardTitle>Views Over Time</CardTitle>
                    <CardDescription>Track your view trends across all content</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {aggregateAnalytics?.viewsOverTime && aggregateAnalytics.viewsOverTime.length > 0 ? (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        Chart placeholder - {aggregateAnalytics.viewsOverTime.length} data points available
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        No view data available yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Resource Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Profile Views</CardTitle>
                      <CardDescription>Total profile views</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {aggregateAnalytics?.viewsByResourceType?.profile?.toLocaleString() ?? 0}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Post Views</CardTitle>
                      <CardDescription>Total post views</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {aggregateAnalytics?.viewsByResourceType?.post?.toLocaleString() ?? 0}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Video Views</CardTitle>
                      <CardDescription>Total video views</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {aggregateAnalytics?.viewsByResourceType?.video?.toLocaleString() ?? 0}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Photo Views</CardTitle>
                      <CardDescription>Total photo views</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {aggregateAnalytics?.viewsByResourceType?.photo?.toLocaleString() ?? 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts" className="mt-0 space-y-6">
            {isLoadingPostAnalytics ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Posts Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <FileTextIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Total Posts</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {userAnalytics?.postsCount?.toLocaleString() ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-red-500/10">
                          <HeartIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Total Likes</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {userAnalytics?.likesReceivedCount?.toLocaleString() ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <MessageCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Total Comments</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {userAnalytics?.commentsCount?.toLocaleString() ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                          <ShareIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Total Shares</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {userAnalytics?.sharesReceivedCount?.toLocaleString() ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {/* Posts Performance Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Post Performance</CardTitle>
                    <CardDescription>Engagement metrics for your posts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {postAnalytics?.viewsOverTime && postAnalytics.viewsOverTime.length > 0 ? (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        Chart placeholder - {postAnalytics.viewsOverTime.length} data points available
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        No post performance data available yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Post Analytics Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Total Post Views</CardTitle>
                      <CardDescription>Total views across all posts</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {postAnalytics?.totalViews?.toLocaleString() ?? 0}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Top Countries</CardTitle>
                      <CardDescription>Countries viewing your posts</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {postAnalytics?.topCountries?.length ?? 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Performing Posts */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Posts</CardTitle>
                    <CardDescription>Your most engaging posts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {postAnalytics?.topCountries && postAnalytics.topCountries.length > 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Post list will be implemented here
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No post data available yet
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos" className="mt-0 space-y-6">
            {isLoadingVideoAnalytics ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Videos Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <VideoIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Total Videos</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {userAnalytics?.videosCount?.toLocaleString() ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-red-500/10">
                          <EyeIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Total Views</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {videoAnalytics?.totalViews?.toLocaleString() ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <HeartIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Total Likes</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {userAnalytics?.likesReceivedCount?.toLocaleString() ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                          <TrendingUpIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Top Countries</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {videoAnalytics?.topCountries?.length ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {/* Video Performance Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Video Performance</CardTitle>
                    <CardDescription>Views and engagement metrics for your videos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {videoAnalytics?.viewsOverTime && videoAnalytics.viewsOverTime.length > 0 ? (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        Chart placeholder - {videoAnalytics.viewsOverTime.length} data points available
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        No video performance data available yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Watch Time Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Total Views</CardTitle>
                      <CardDescription>Total views across all videos</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {videoAnalytics?.totalViews?.toLocaleString() ?? 0}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Top Countries</CardTitle>
                      <CardDescription>Countries viewing your videos</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {videoAnalytics?.topCountries?.length ?? 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Performing Videos */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Videos</CardTitle>
                    <CardDescription>Your most viewed and engaged videos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {videoAnalytics?.topCountries && videoAnalytics.topCountries.length > 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Video list will be implemented here
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No video data available yet
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos" className="mt-0 space-y-6">
            {isLoadingPhotoAnalytics ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Photos Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Total Photos</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {photosData?.meta?.total?.toLocaleString() ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-red-500/10">
                          <EyeIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Total Views</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {photoAnalytics?.totalViews?.toLocaleString() ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <HeartIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Total Likes</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {userAnalytics?.likesReceivedCount?.toLocaleString() ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                          <TrendingUpIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Top Countries</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {photoAnalytics?.topCountries?.length ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {/* Photo Performance Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Photo Performance</CardTitle>
                    <CardDescription>Views and engagement metrics for your photos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {photoAnalytics?.viewsOverTime && photoAnalytics.viewsOverTime.length > 0 ? (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        Chart placeholder - {photoAnalytics.viewsOverTime.length} data points available
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        No photo performance data available yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Photo Analytics Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Total Photo Views</CardTitle>
                      <CardDescription>Total views across all photos</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {photoAnalytics?.totalViews?.toLocaleString() ?? 0}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Top Countries</CardTitle>
                      <CardDescription>Countries viewing your photos</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {photoAnalytics?.topCountries?.length ?? 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Performing Photos */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Photos</CardTitle>
                    <CardDescription>Your most viewed and engaged photos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {photoAnalytics?.topCountries && photoAnalytics.topCountries.length > 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Photo list will be implemented here
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No photo data available yet
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Geographic Tab */}
          <TabsContent value="geographic" className="mt-0 space-y-6">
            {isLoadingGeographic ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Geographic Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Geographic Distribution</CardTitle>
                    <CardDescription>View distribution by country</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {geographicAnalytics?.topCountries && geographicAnalytics.topCountries.length > 0 ? (
                      <div className="h-96 flex items-center justify-center text-muted-foreground">
                        Map placeholder - {geographicAnalytics.topCountries.length} countries with data
                      </div>
                    ) : (
                      <div className="h-96 flex items-center justify-center text-muted-foreground">
                        No geographic data available yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Top Countries */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Countries</CardTitle>
                    <CardDescription>Countries with the most views</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {geographicAnalytics?.topCountries && geographicAnalytics.topCountries.length > 0 ? (
                        <div className="space-y-3">
                          {geographicAnalytics.topCountries.slice(0, 10).map((country, index) => (
                            <div
                              key={country.countryCode}
                              className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="font-medium">{country.countryName}</div>
                                  <div className="text-sm text-muted-foreground">{country.countryCode}</div>
                                </div>
                              </div>
                              <div className="text-lg font-semibold">
                                {country.count.toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No country data available yet
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Geographic Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Total Countries</CardTitle>
                      </div>
                      <CardDescription>Number of countries with views</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {geographicAnalytics?.topCountries?.length ?? 0}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <GlobeIcon className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Top Country</CardTitle>
                      </div>
                      <CardDescription>Country with most views</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {geographicAnalytics?.topCountries && geographicAnalytics.topCountries.length > 0
                          ? geographicAnalytics.topCountries[0].countryName
                          : '-'}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <EyeIcon className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Total Views</CardTitle>
                      </div>
                      <CardDescription>Total views from all countries</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {geographicAnalytics?.totalViews?.toLocaleString() ?? 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Follows Tab */}
          <TabsContent value="follows" className="mt-0 space-y-6">
            {isLoadingUserAnalytics || isLoadingFollowStats || isLoadingFollowAnalytics || isLoadingEnhancedFollowAnalytics ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Follow Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <UsersIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Followers</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {userAnalytics?.followersCount?.toLocaleString() ?? followStats?.followersCount?.toLocaleString() ?? followAnalytics?.totalFollowers?.toLocaleString() ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                          <UserCheckIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Following</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {userAnalytics?.followingCount?.toLocaleString() ?? followStats?.followingCount?.toLocaleString() ?? followAnalytics?.totalFollowing?.toLocaleString() ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <UserPlusIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Mutual Followers</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {followStats?.mutualFollowersCount?.toLocaleString() ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {/* Enhanced Analytics Metrics */}
                {enhancedFollowAnalytics && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Growth Rate</CardTitle>
                        <CardDescription>Follower growth percentage</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {enhancedFollowAnalytics.growthRate?.toFixed(1) ?? 0}%
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Engagement Rate</CardTitle>
                        <CardDescription>Follower engagement percentage</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {enhancedFollowAnalytics.engagementRate?.toFixed(1) ?? 0}%
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Retention Rate</CardTitle>
                        <CardDescription>Follower retention percentage</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {enhancedFollowAnalytics.followerRetentionRate?.toFixed(1) ?? 0}%
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Avg Followers/Day</CardTitle>
                        <CardDescription>Average daily follower growth</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {enhancedFollowAnalytics.averageFollowersPerDay?.toFixed(1) ?? 0}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Growth Trends */}
                {followAnalytics && (followAnalytics.followersGrowth?.length > 0 || followAnalytics.followingGrowth?.length > 0) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Growth Trends</CardTitle>
                      <CardDescription>Follower and following growth over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        Chart placeholder - {followAnalytics.followersGrowth?.length ?? 0} data points available
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Top Followers */}
                {followAnalytics?.topFollowers && followAnalytics.topFollowers.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Followers</CardTitle>
                      <CardDescription>Your most influential followers</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {followAnalytics.topFollowers.slice(0, 10).map((follower, index) => (
                          <div
                            key={follower.userId}
                            className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                                {index + 1}
                              </div>
                              <div>
                                <div className="font-medium">{follower.displayName}</div>
                                <div className="text-sm text-muted-foreground">@{follower.username}</div>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {follower.followersCount?.toLocaleString() ?? 0} followers
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Export Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Export Data</CardTitle>
                    <CardDescription>Download your followers and following lists</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="font-medium">Export Followers</div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportFollowers('csv')}
                            className="flex-1"
                          >
                            <DownloadIcon className="h-4 w-4 mr-2" />
                            CSV
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportFollowers('json')}
                            className="flex-1"
                          >
                            <DownloadIcon className="h-4 w-4 mr-2" />
                            JSON
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="font-medium">Export Following</div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportFollowing('csv')}
                            className="flex-1"
                          >
                            <DownloadIcon className="h-4 w-4 mr-2" />
                            CSV
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportFollowing('json')}
                            className="flex-1"
                          >
                            <DownloadIcon className="h-4 w-4 mr-2" />
                            JSON
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Follow History */}
                {isLoadingFollowHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Follow History</CardTitle>
                      <CardDescription>Recent follow and unfollow activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {followHistory?.data && followHistory.data.length > 0 ? (
                          followHistory.data.map((entry, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {entry.type === 'follow' ? (
                                  <UserPlusIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                                ) : (
                                  <UserMinusIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                                )}
                                <div>
                                  <div className="font-medium">
                                    {entry.type === 'follow' ? 'Followed' : 'Unfollowed'} @{entry.targetUsername}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {new Date(entry.timestamp).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                              <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                                entry.type === 'follow'
                                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
                              }`}>
                                {entry.type === 'follow' ? 'Follow' : 'Unfollow'}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No follow history available yet
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Shared Content Tab */}
          <TabsContent value="shared" className="mt-0 space-y-6">
            {isLoadingSharedPhotos || isLoadingSharedVideos ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Shared Content Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-cyan-500/10">
                          <ImageIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Shared Photos</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {sharedPhotosData?.meta?.total?.toLocaleString() ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button variant="ghost" size="sm" className="w-full" asChild>
                        <Link href={`/${username}/photos/shared`}>
                          View Shared Photos
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-orange-500/10">
                          <VideoIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                      </div>
                      <CardDescription className="text-xs uppercase tracking-wide">Shared Videos</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl mt-1">
                        <span className="text-foreground">
                          {sharedVideosData?.meta?.total?.toLocaleString() ?? 0}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button variant="ghost" size="sm" className="w-full" asChild>
                        <Link href={`/${username}/videos/shared`}>
                          View Shared Videos
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Shared Content Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Shared Content Summary</CardTitle>
                    <CardDescription>Overview of content you've shared from other users</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                            <span className="text-sm font-medium text-muted-foreground">Total Shared Photos</span>
                          </div>
                        </div>
                        <div className="text-3xl font-bold text-foreground">
                          {sharedPhotosData?.meta?.total?.toLocaleString() ?? 0}
                        </div>
                        {sharedPhotosData?.meta?.total && sharedPhotosData.meta.total > 0 && (
                          <div className="mt-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/${username}/photos/shared`}>
                                View All Shared Photos
                              </Link>
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <VideoIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            <span className="text-sm font-medium text-muted-foreground">Total Shared Videos</span>
                          </div>
                        </div>
                        <div className="text-3xl font-bold text-foreground">
                          {sharedVideosData?.meta?.total?.toLocaleString() ?? 0}
                        </div>
                        {sharedVideosData?.meta?.total && sharedVideosData.meta.total > 0 && (
                          <div className="mt-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/${username}/videos/shared`}>
                                View All Shared Videos
                              </Link>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Shared Content Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Shared Content Activity</CardTitle>
                    <CardDescription>Your sharing activity and engagement</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(sharedPhotosData?.meta?.total ?? 0) === 0 && (sharedVideosData?.meta?.total ?? 0) === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <ShareIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No shared content yet</p>
                        <p className="text-sm mb-4">Start sharing photos and videos from other users to see analytics here</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium mb-1">Total Shared Items</p>
                              <p className="text-sm text-muted-foreground">
                                Combined count of all shared photos and videos
                              </p>
                            </div>
                            <div className="text-2xl font-bold">
                              {((sharedPhotosData?.meta?.total ?? 0) + (sharedVideosData?.meta?.total ?? 0)).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3 rounded-lg border border-border/50">
                            <div className="text-sm text-muted-foreground mb-1">Photos Shared</div>
                            <div className="text-xl font-semibold">
                              {sharedPhotosData?.meta?.total?.toLocaleString() ?? 0}
                            </div>
                          </div>
                          <div className="p-3 rounded-lg border border-border/50">
                            <div className="text-sm text-muted-foreground mb-1">Videos Shared</div>
                            <div className="text-xl font-semibold">
                              {sharedVideosData?.meta?.total?.toLocaleString() ?? 0}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
