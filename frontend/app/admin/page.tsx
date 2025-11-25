'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/core/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/theme/ui/card';
import { LoadingSpinner } from '@/theme/components/loading/LoadingSpinner';
import { ErrorState } from '@/theme/components/error/ErrorState';
import { 
  Shield, 
  Users, 
  Settings, 
  BarChart3, 
  AlertTriangle,
  UserPlus,
  FileText,
  Video,
  Activity,
  Server,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/theme/ui/button';
import { adminDashboardService } from '@/core/api/security/admin';
import { cn } from '@/lib/utils';

const ADMIN_ROLES = ['Administrator', 'Founder', 'Chief Executive'];

const isAdmin = (role: string | undefined): boolean => {
  if (!role) return false;
  return ADMIN_ROLES.includes(role);
};

function AdminDashboardPage() {
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

  // Fetch dashboard statistics
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: () => adminDashboardService.getStats(),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  // Fetch system health
  const { data: healthData, isLoading: isLoadingHealth } = useQuery({
    queryKey: ['admin', 'dashboard', 'health'],
    queryFn: () => adminDashboardService.getHealth(),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  // Fetch growth metrics
  const { data: growthData, isLoading: isLoadingGrowth } = useQuery({
    queryKey: ['admin', 'dashboard', 'growth'],
    queryFn: () => adminDashboardService.getGrowth(30),
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
          message="You must be logged in to access the admin dashboard"
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
          message="Administrator privileges required to access this page"
          onRetry={() => router.push('/')}
        />
      </div>
    );
  }

  const isLoading = isLoadingStats || isLoadingHealth || isLoadingGrowth;
  
  const totalUsers = statsData?.totalUsers || 0;
  const totalPosts = statsData?.totalPosts || 0;
  const totalVideos = statsData?.totalVideos || 0;
  const totalPhotos = statsData?.totalPhotos || 0;
  const totalContent = totalPosts + totalVideos + totalPhotos;

  // Calculate growth percentages from growth data
  const userGrowth = growthData?.userGrowth?.growthRate || 0;
  const postGrowth = growthData?.contentGrowth?.posts?.growthRate || 0;
  const videoGrowth = growthData?.contentGrowth?.videos?.growthRate || 0;
  const contentGrowth = growthData?.contentGrowth?.posts?.growthRate || 0;

  const statCards = [
    {
      title: 'Total Users',
      value: totalUsers.toLocaleString(),
      change: userGrowth,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
      borderColor: 'border-blue-500/20',
      href: '/admin/users',
    },
    {
      title: 'Total Posts',
      value: totalPosts.toLocaleString(),
      change: postGrowth,
      icon: FileText,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500/10 dark:bg-green-500/20',
      borderColor: 'border-green-500/20',
    },
    {
      title: 'Total Videos',
      value: totalVideos.toLocaleString(),
      change: videoGrowth,
      icon: Video,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-500/10 dark:bg-purple-500/20',
      borderColor: 'border-purple-500/20',
    },
    {
      title: 'Total Content',
      value: totalContent.toLocaleString(),
      change: contentGrowth,
      icon: Activity,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-500/10 dark:bg-orange-500/20',
      borderColor: 'border-orange-500/20',
    },
  ];

  const adminCards = [
    {
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: Users,
      href: '/admin/users',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
    },
    {
      title: 'Content Moderation',
      description: 'Manage content reports and moderate posts, videos, photos',
      icon: FileText,
      href: '/admin/content',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-500/10 dark:bg-orange-500/20',
    },
    {
      title: 'System Settings',
      description: 'Configure system-wide settings',
      icon: Settings,
      href: '/admin/settings',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-500/10 dark:bg-purple-500/20',
    },
    {
      title: 'Analytics',
      description: 'View system analytics and reports',
      icon: BarChart3,
      href: '/admin/analytics',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500/10 dark:bg-green-500/20',
    },
    {
      title: 'Security',
      description: 'Monitor security alerts and events',
      icon: Shield,
      href: '/admin/security',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-500/10 dark:bg-red-500/20',
    },
    {
      title: 'Tracking & Logs',
      description: 'Monitor platform activity and system logs',
      icon: Activity,
      href: '/admin/tracking',
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    },
  ];

  const systemStatus = [
    { 
      label: 'API Status', 
      status: healthData?.status === 'ok' ? 'operational' : 'error', 
      icon: Server 
    },
    { 
      label: 'Database', 
      status: healthData?.info?.database?.status === 'up' ? 'operational' : 'error', 
      icon: CheckCircle2 
    },
    { 
      label: 'Redis', 
      status: healthData?.info?.redis?.status === 'up' ? 'operational' : 'error', 
      icon: Activity 
    },
  ];

  return (
    <div className="flex flex-1 flex-col w-full p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Monitor and manage the Meta EN|IX platform
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/users">
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.change > 0;
          return (
            <Card 
              key={stat.title} 
              className={cn(
                "relative overflow-hidden border-2 transition-all duration-300 hover:shadow-lg",
                stat.borderColor
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                  <Icon className={cn("h-4 w-4", stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <div>
                    {isLoading ? (
                      <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                    ) : (
                      <div className="text-2xl font-bold">{stat.value}</div>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      {isPositive ? (
                        <ArrowUpRight className="h-3 w-3 text-green-600 dark:text-green-400" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-600 dark:text-red-400" />
                      )}
                      <span className={cn(
                        "text-xs font-medium",
                        isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {Math.abs(stat.change)}%
                      </span>
                      <span className="text-xs text-muted-foreground">vs last month</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Admin Management Cards */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Administration
              </CardTitle>
              <CardDescription>
                Manage platform settings and configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {adminCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Link key={card.href} href={card.href}>
                      <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/50">
                        <CardHeader>
                          <div className="flex items-center gap-4">
                            <div className={cn("p-3 rounded-lg", card.bgColor)}>
                              <Icon className={cn("h-5 w-5", card.color)} />
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-base">{card.title}</CardTitle>
                              <CardDescription className="text-xs mt-1">
                                {card.description}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest platform events and changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { action: 'New user registered', time: '2 minutes ago', icon: UserPlus },
                  { action: 'Post created', time: '15 minutes ago', icon: FileText },
                  { action: 'Video uploaded', time: '1 hour ago', icon: Video },
                  { action: 'System backup completed', time: '3 hours ago', icon: CheckCircle2 },
                ].map((activity, idx) => {
                  const Icon = activity.icon;
                  return (
                    <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="p-2 rounded-lg bg-background">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                System Status
              </CardTitle>
              <CardDescription>
                Current platform health
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {systemStatus.map((status) => {
                  const Icon = status.icon;
                  return (
                    <div key={status.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{status.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs text-muted-foreground capitalize">{status.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/admin/users">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/admin/analytics">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Analytics
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/status">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    System Status
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardPage;
