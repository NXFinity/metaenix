'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/Theme/layout/MainLayout';
import { Heading, Text, Flex, Box, Card, Grid, Separator, Badge, Button } from '@radix-ui/themes';
import { useAuth } from '@/core/hooks/useAuth';
import { adminService } from '@/core/api/admin/admin.service';
import Link from 'next/link';
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

const ADMIN_ROLES = ['Administrator', 'Founder', 'Chief Executive'];

const isAdmin = (role: string | undefined): boolean => {
  if (!role) return false;
  return ADMIN_ROLES.includes(role);
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitializing } = useAuth();

  useEffect(() => {
    // Only redirect if we're sure the user is not authenticated (not just initializing)
    // Don't redirect during initial auth check to avoid interrupting session exchange
    if (!isInitializing && isAuthenticated === false) {
      router.push('/');
      return;
    }
    if (!isInitializing && isAuthenticated && user && !isAdmin(user.role)) {
      router.push('/');
      return;
    }
  }, [user, isAuthenticated, isInitializing, router]);

  // Fetch dashboard statistics
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: () => adminService.getStats(),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  // Fetch system health
  const { data: healthData, isLoading: isLoadingHealth } = useQuery({
    queryKey: ['admin', 'dashboard', 'health'],
    queryFn: () => adminService.getHealth(),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  // Fetch growth metrics
  const { data: growthData, isLoading: isLoadingGrowth } = useQuery({
    queryKey: ['admin', 'dashboard', 'growth'],
    queryFn: () => adminService.getGrowth(30),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  if (isInitializing) {
    return (
      <MainLayout>
        <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
          <Text size="3" color="gray">Loading...</Text>
        </Flex>
      </MainLayout>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <MainLayout>
        <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
          <Text size="3" color="gray">Please authenticate to access the admin dashboard.</Text>
        </Flex>
      </MainLayout>
    );
  }

  if (!isAdmin(user.role)) {
    return (
      <MainLayout>
        <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
          <Text size="3" color="red">Access Denied. Administrator privileges required.</Text>
        </Flex>
      </MainLayout>
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
      color: 'blue',
    },
    {
      title: 'Total Posts',
      value: totalPosts.toLocaleString(),
      change: postGrowth,
      icon: FileText,
      color: 'green',
    },
    {
      title: 'Total Videos',
      value: totalVideos.toLocaleString(),
      change: videoGrowth,
      icon: Video,
      color: 'purple',
    },
    {
      title: 'Total Content',
      value: totalContent.toLocaleString(),
      change: contentGrowth,
      icon: Activity,
      color: 'orange',
    },
  ];

  const adminCards = [
    {
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: Users,
      href: '/admin/users',
      color: 'blue',
    },
    {
      title: 'Content Moderation',
      description: 'Manage content reports and moderate posts, videos, photos',
      icon: FileText,
      href: '/admin/content',
      color: 'orange',
    },
    {
      title: 'System Settings',
      description: 'Configure system-wide settings',
      icon: Settings,
      href: '/admin/settings',
      color: 'purple',
    },
    {
      title: 'Analytics',
      description: 'View system analytics and reports',
      icon: BarChart3,
      href: '/admin/analytics',
      color: 'green',
    },
    {
      title: 'Security',
      description: 'Monitor security alerts and events',
      icon: Shield,
      href: '/admin/security',
      color: 'red',
    },
    {
      title: 'Tracking & Logs',
      description: 'Monitor platform activity and system logs',
      icon: Activity,
      href: '/admin/tracking',
      color: 'cyan',
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

  const recentActivities = [
    { action: 'New user registered', time: '2 minutes ago', icon: UserPlus },
    { action: 'Post created', time: '15 minutes ago', icon: FileText },
    { action: 'Video uploaded', time: '1 hour ago', icon: Video },
    { action: 'System backup completed', time: '3 hours ago', icon: CheckCircle2 },
  ];

  return (
    <MainLayout>
      <Box style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <Flex direction="column" gap="2" mb="6">
          <Flex align="center" justify="between">
            <Flex align="center" gap="3">
              <Box
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--accent-3)',
                  color: 'var(--accent-9)',
                }}
              >
                <Shield size={24} />
              </Box>
              <Flex direction="column" gap="1">
                <Heading size="9" weight="bold">Admin Dashboard</Heading>
                <Text size="3" color="gray">
                  Monitor and manage the Meta EN|IX platform
                </Text>
              </Flex>
            </Flex>
            <Button variant="soft" size="2" asChild>
              <Link href="/admin/users">
                <Users size={16} style={{ marginRight: '8px' }} />
                Manage Users
              </Link>
            </Button>
          </Flex>
        </Flex>

        {/* Statistics Cards */}
        <Grid columns={{ initial: '1', sm: '2', lg: '4' }} gap="4" mb="6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            const isPositive = stat.change > 0;
            return (
              <Card key={stat.title}>
                <Flex direction="column" gap="3" p="4">
                  <Flex align="center" justify="between">
                    <Box
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: `var(--${stat.color}-3)`,
                        color: `var(--${stat.color}-11)`,
                      }}
                    >
                      <Icon size={20} />
                    </Box>
                    {stat.change !== 0 && (
                      <Badge color={isPositive ? 'green' : 'red'}>
                        {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {Math.abs(stat.change).toFixed(1)}%
                      </Badge>
                    )}
                  </Flex>
                  {isLoading ? (
                    <Box style={{ height: '32px', width: '100px', backgroundColor: 'var(--gray-3)', borderRadius: '4px' }} />
                  ) : (
                    <Heading size="8" weight="bold">{stat.value}</Heading>
                  )}
                  <Text size="2" color="gray">{stat.title}</Text>
                </Flex>
              </Card>
            );
          })}
        </Grid>

        {/* Main Content Grid */}
        <Grid columns={{ initial: '1', lg: '3' }} gap="6">
          {/* Admin Management Cards */}
          <Box style={{ gridColumn: 'span 2' }}>
            <Flex direction="column" gap="6">
              <Card>
                <Flex direction="column" gap="4" p="5">
                  <Flex align="center" gap="2">
                    <Settings size={20} />
                    <Heading size="5" weight="bold">Administration</Heading>
                  </Flex>
                  <Text size="2" color="gray">
                    Manage platform settings and configurations
                  </Text>
                  <Grid columns={{ initial: '1', md: '2' }} gap="4">
                    {adminCards.map((card) => {
                      const Icon = card.icon;
                      return (
                        <Link key={card.href} href={card.href} style={{ textDecoration: 'none' }}>
                          <Card style={{ cursor: 'pointer' }}>
                            <Flex direction="column" gap="3" p="4">
                              <Flex align="center" gap="4">
                                <Box
                                  style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    backgroundColor: `var(--${card.color}-3)`,
                                    color: `var(--${card.color}-11)`,
                                  }}
                                >
                                  <Icon size={20} />
                                </Box>
                                <Flex direction="column" gap="1" style={{ flex: 1 }}>
                                  <Heading size="4" weight="bold">{card.title}</Heading>
                                  <Text size="1" color="gray">{card.description}</Text>
                                </Flex>
                              </Flex>
                            </Flex>
                          </Card>
                        </Link>
                      );
                    })}
                  </Grid>
                </Flex>
              </Card>

              {/* Recent Activity */}
              <Card>
                <Flex direction="column" gap="4" p="5">
                  <Flex align="center" gap="2">
                    <Activity size={20} />
                    <Heading size="5" weight="bold">Recent Activity</Heading>
                  </Flex>
                  <Text size="2" color="gray">
                    Latest platform events and changes
                  </Text>
                  <Flex direction="column" gap="3">
                    {recentActivities.map((activity, idx) => {
                      const Icon = activity.icon;
                      return (
                        <Flex key={idx} align="center" gap="4" p="3" style={{ borderRadius: '8px', backgroundColor: 'var(--gray-2)' }}>
                          <Box
                            style={{
                              padding: '8px',
                              borderRadius: '8px',
                              backgroundColor: 'var(--gray-3)',
                            }}
                          >
                            <Icon size={16} style={{ color: 'var(--gray-11)' }} />
                          </Box>
                          <Flex direction="column" gap="1" style={{ flex: 1 }}>
                            <Text size="2" weight="medium">{activity.action}</Text>
                            <Text size="1" color="gray">{activity.time}</Text>
                          </Flex>
                        </Flex>
                      );
                    })}
                  </Flex>
                </Flex>
              </Card>
            </Flex>
          </Box>

          {/* Sidebar */}
          <Flex direction="column" gap="6">
            {/* System Status */}
            <Card>
              <Flex direction="column" gap="4" p="5">
                <Flex align="center" gap="2">
                  <Server size={20} />
                  <Heading size="5" weight="bold">System Status</Heading>
                </Flex>
                <Text size="2" color="gray">
                  Current platform health
                </Text>
                <Flex direction="column" gap="3">
                  {systemStatus.map((status) => {
                    const Icon = status.icon;
                    return (
                      <Flex key={status.label} align="center" justify="between" p="3" style={{ borderRadius: '8px', backgroundColor: 'var(--gray-2)' }}>
                        <Flex align="center" gap="3">
                          <Icon size={16} style={{ color: 'var(--gray-11)' }} />
                          <Text size="2" weight="medium">{status.label}</Text>
                        </Flex>
                        <Flex align="center" gap="2">
                          <CheckCircle2 size={16} style={{ color: 'var(--green-9)' }} />
                          <Text size="1" color="gray" style={{ textTransform: 'capitalize' }}>{status.status}</Text>
                        </Flex>
                      </Flex>
                    );
                  })}
                </Flex>
              </Flex>
            </Card>

            {/* Quick Actions */}
            <Card>
              <Flex direction="column" gap="4" p="5">
                <Flex align="center" gap="2">
                  <Clock size={20} />
                  <Heading size="5" weight="bold">Quick Actions</Heading>
                </Flex>
                <Flex direction="column" gap="2">
                  <Button variant="soft" size="2" asChild style={{ width: '100%', justifyContent: 'flex-start' }}>
                    <Link href="/admin/users">
                      <Users size={16} style={{ marginRight: '8px' }} />
                      Manage Users
                    </Link>
                  </Button>
                  <Button variant="soft" size="2" asChild style={{ width: '100%', justifyContent: 'flex-start' }}>
                    <Link href="/admin/analytics">
                      <BarChart3 size={16} style={{ marginRight: '8px' }} />
                      View Analytics
                    </Link>
                  </Button>
                  <Button variant="soft" size="2" asChild style={{ width: '100%', justifyContent: 'flex-start' }}>
                    <Link href="/admin/security">
                      <AlertTriangle size={16} style={{ marginRight: '8px' }} />
                      Security
                    </Link>
                  </Button>
                </Flex>
              </Flex>
            </Card>
          </Flex>
        </Grid>
      </Box>
    </MainLayout>
  );
}
