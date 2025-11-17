'use client';

import { MainLayout } from '@/theme/layout/MainLayout';
import { useAuth } from '@/core/hooks/useAuth';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { useQuery } from '@tanstack/react-query';
import { postsService } from '@/core/api/posts';
import { developerService } from '@/core/api/developer';
import Link from 'next/link';
import { CodeIcon, ExternalLinkIcon } from 'lucide-react';

export default function DashboardPage() {
  const { username } = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isInitializing, refetchUser, isLoadingUser } = useAuth();

  // Ensure user data is loaded - useAuth already fetches from /users/me
  // No need to refetch unless data is missing

  // Fetch posts count for dashboard
  const { data: postsData } = useQuery({
    queryKey: ['posts', 'user', user?.id, 'all'],
    queryFn: () => postsService.getByUser(user!.id, { page: 1, limit: 1 }),
    enabled: !!user?.id && isAuthenticated && user.username === username,
  });

  // Fetch developer applications
  const { data: applications } = useQuery({
    queryKey: ['developer', 'applications'],
    queryFn: () => developerService.getApplications(),
    enabled: !!user?.id && isAuthenticated && user.username === username && user.isDeveloper === true,
  });

  // Show loading while initializing auth
  if (isInitializing) {
    return (
      <MainLayout>
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </MainLayout>
    );
  }

  // Require authentication - redirect if not authenticated
  if (!isInitializing && !isAuthenticated) {
    router.push('/login');
    return null;
  }

  // If authenticated but wrong user, redirect to their own dashboard
  if (!isInitializing && isAuthenticated && user && user.username !== username) {
    router.push(`/${user.username}/dashboard`);
    return null;
  }

  // Show loading if still initializing, loading user, or user doesn't match
  if (isInitializing || isLoadingUser || !user || user.username !== username) {
    return (
      <MainLayout>
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex flex-1 flex-col max-w-7xl mx-auto w-full p-4 md:p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Welcome back, {user.displayName || user.username}!
            </h1>
            <p className="text-muted-foreground">
              Here's what's happening with your account
            </p>
          </div>
          <Button asChild>
            <Link href={`/${username}/posts`}>Create Post</Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Posts</CardDescription>
              <CardTitle className="text-2xl">{postsData?.meta?.total ?? 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <Link href={`/${username}`}>View Profile</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Followers</CardDescription>
              <CardTitle className="text-2xl">{user.followersCount ?? 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <Link href={`/${username}/followers`}>View Followers</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Following</CardDescription>
              <CardTitle className="text-2xl">{user.followingCount ?? 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <Link href={`/${username}/following`}>View Following</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Account Status</CardDescription>
              <CardTitle className="text-lg">
                {user.security?.isVerified ? (
                  <span className="text-green-600 dark:text-green-400">Verified</span>
                ) : (
                  <span className="text-yellow-600 dark:text-yellow-400">Unverified</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.security?.isVerified === false && (
                <Button variant="ghost" size="sm" className="w-full" asChild>
                  <Link href="/verify">Verify Email</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Get started with your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" asChild>
                  <Link href={`/${username}/posts`}>Create Post</Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/${username}`}>View Public Profile</Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/${username}/settings`}>Account Settings</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest posts and interactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <p>No recent activity</p>
                  <p className="text-sm mt-2">Start creating content to see your activity here</p>
                </div>
              </CardContent>
            </Card>

            {/* Developer Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Developer</CardTitle>
                    <CardDescription>
                      {user.isDeveloper
                        ? 'Manage your OAuth applications'
                        : 'Create and manage OAuth applications'}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/${username}/developer`}>
                      <CodeIcon className="h-4 w-4 mr-2" />
                      {user.isDeveloper ? 'Developer Portal' : 'Become Developer'}
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {user.isDeveloper ? (
                  applications && applications.length > 0 ? (
                    <div className="space-y-3">
                      {applications.slice(0, 2).map((app) => (
                        <div
                          key={app.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                        >
                          <div>
                            <p className="font-medium">{app.name}</p>
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
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-3">No applications yet</p>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/${username}/developer`}>
                          Create Application
                        </Link>
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">
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
          </div>

          {/* Right Column - Account Info */}
          <div className="space-y-6">
            {/* Account Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Account Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Username</p>
                  <p className="font-medium">{user.username}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Display Name</p>
                  <p className="font-medium">{user.displayName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                {user.profile?.bio && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Bio</p>
                    <p className="text-sm">{user.profile.bio}</p>
                  </div>
                )}
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/${username}/settings`}>Edit Profile</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Security Status */}
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Email Verified</span>
                  <span className={user.security?.isVerified ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
                    {user.security?.isVerified ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">2FA Enabled</span>
                  <span className={user.security?.isTwoFactorEnabled ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                    {user.security?.isTwoFactorEnabled ? 'Yes' : 'No'}
                  </span>
                </div>
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link href={`/${username}/settings?tab=security`}>Manage Security</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

