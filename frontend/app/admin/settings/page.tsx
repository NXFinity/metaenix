'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSettingsService } from '@/core/api/security/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { Input } from '@/theme/ui/input';
import { Label } from '@/theme/ui/label';
import { LoadingSpinner } from '@/theme/components/loading/LoadingSpinner';
import { ErrorState } from '@/theme/components/error/ErrorState';
import { Settings, ArrowLeft as ArrowLeftIcon, Shield } from 'lucide-react';
import Link from 'next/link';

const ADMIN_ROLES = ['Administrator', 'Founder', 'Chief Executive'];

const isAdmin = (role: string | undefined): boolean => {
  if (!role) return false;
  return ADMIN_ROLES.includes(role);
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
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

  // Fetch settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminSettingsService.getSettings(),
    enabled: isAuthenticated && !!user && isAdmin(user.role),
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => adminSettingsService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
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
          message="You must be logged in to access the admin settings"
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
                  <Settings className="h-7 w-7 text-primary" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    System Settings
                  </h1>
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">Admin</span>
                  </div>
                </div>
                <p className="text-sm md:text-base text-muted-foreground">
                  Configure system-wide settings
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-6 py-6">
          <div className="space-y-4">
            <Card className="w-full">
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure general system settings</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSettings ? (
                <LoadingSpinner />
              ) : settings ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    updateSettingsMutation.mutate({
                      maxFileSize: Number(formData.get('maxFileSize')) * 1024 * 1024, // Convert MB to bytes
                      allowedFileTypes: formData.get('allowedFileTypes')?.toString().split(',').map(t => t.trim()).filter(t => t) || [],
                    });
                  }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                    <Input
                      id="maxFileSize"
                      name="maxFileSize"
                      type="number"
                      defaultValue={settings.maxFileSize ? Math.round(settings.maxFileSize / (1024 * 1024)) : 100}
                      min={1}
                      max={10000}
                    />
                    <p className="text-sm text-muted-foreground">
                      Maximum file size allowed for uploads in megabytes (current: {settings.maxFileSize ? `${Math.round(settings.maxFileSize / (1024 * 1024))} MB` : '100 MB'})
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="allowedFileTypes">Allowed File Types (MIME types)</Label>
                    <Input
                      id="allowedFileTypes"
                      name="allowedFileTypes"
                      type="text"
                      defaultValue={settings.allowedFileTypes?.join(', ') || ''}
                      placeholder="image/jpeg, image/png, image/gif, video/mp4"
                    />
                    <p className="text-sm text-muted-foreground">
                      Comma-separated list of allowed MIME types (e.g., image/jpeg, video/mp4)
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">Settings unavailable</p>
              )}
            </CardContent>
          </Card>
          </div>
      </div>
    </div>
  );
}

