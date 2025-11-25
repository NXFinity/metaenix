'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { adminTrackingService } from '@/core/api/security/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { LoadingSpinner } from '@/theme/components/loading/LoadingSpinner';
import { ErrorState } from '@/theme/components/error/ErrorState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/theme/ui/tabs';
import { Activity, BarChart3, ChevronLeft, ChevronRight, ArrowLeft as ArrowLeftIcon, Shield } from 'lucide-react';
import Link from 'next/link';

const ADMIN_ROLES = ['Administrator', 'Founder', 'Chief Executive'];

const isAdmin = (role: string | undefined): boolean => {
  if (!role) return false;
  return ADMIN_ROLES.includes(role);
};

export default function AdminTrackingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitializing } = useAuth();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

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

  // Fetch activity
  const { data: activity, isLoading: isLoadingActivity } = useQuery({
    queryKey: ['admin', 'tracking', 'activity', page, limit],
    queryFn: () => adminTrackingService.getActivity({ page, limit, days: 7 }),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  // Fetch stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['admin', 'tracking', 'stats'],
    queryFn: () => adminTrackingService.getStats(),
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
          message="You must be logged in to access the admin tracking"
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
                  <Activity className="h-7 w-7 text-primary" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    Tracking & Logs
                  </h1>
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">Admin</span>
                  </div>
                </div>
                <p className="text-sm md:text-base text-muted-foreground">
                  Monitor platform activity, statistics, and system logs
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-6 py-6">
        <Tabs defaultValue="activity" className="w-full space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

          <TabsContent value="activity" className="space-y-4">
            <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Platform Activity
              </CardTitle>
              <CardDescription>Recent platform activity and events</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingActivity ? (
                <LoadingSpinner />
              ) : activity && activity.data && activity.data.length > 0 ? (
                <div className="space-y-4">
                  {activity.data.map((item, idx) => (
                    <div key={item.timestamp || idx} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium capitalize">{item.type}</p>
                            {item.resourceType && (
                              <span className="text-xs px-2 py-1 rounded bg-muted">
                                {item.resourceType}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{item.action}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {item.username && <span>User: {item.username}</span>}
                            {item.userId && <span>ID: {item.userId.substring(0, 8)}...</span>}
                            {item.resourceId && (
                              <span>Resource: {item.resourceId.substring(0, 8)}...</span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {activity.meta && (
                    <div className="flex items-center justify-between pt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {((activity.meta.page - 1) * activity.meta.limit) + 1} to{' '}
                        {Math.min(activity.meta.page * activity.meta.limit, activity.meta.total)} of{' '}
                        {activity.meta.total} activities
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={!activity.meta.hasPreviousPage || page === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => p + 1)}
                          disabled={!activity.meta.hasNextPage}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No activity</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Platform Statistics
              </CardTitle>
              <CardDescription>Platform-wide statistics and metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <LoadingSpinner />
              ) : stats ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>Total Users</CardDescription>
                        <CardTitle className="text-3xl">{stats.totalUsers || 0}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{stats.newUsersToday || 0}</span> new today
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>Total Posts</CardDescription>
                        <CardTitle className="text-3xl">{stats.totalPosts || 0}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{stats.newPostsToday || 0}</span> new today
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>Total Videos</CardDescription>
                        <CardTitle className="text-3xl">{stats.totalVideos || 0}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{stats.newVideosToday || 0}</span> new today
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>Total Photos</CardDescription>
                        <CardTitle className="text-3xl">{stats.totalPhotos || 0}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{stats.newPhotosToday || 0}</span> new today
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No statistics available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

