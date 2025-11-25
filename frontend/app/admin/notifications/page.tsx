'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/core/hooks/useAuth';
import { useNotifications } from '@/core/hooks/useNotifications';
import { useAlerts } from '@/theme/components/alerts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { LoadingSpinner } from '@/theme/components/loading/LoadingSpinner';
import { ErrorState } from '@/theme/components/error/ErrorState';
import { Flag, CheckCircle, XCircle, Trash2, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { NotificationType } from '@/core/api/users/notifications';
import type { Notification } from '@/core/api/users/notifications';

const ADMIN_ROLES = ['Administrator', 'Founder', 'Chief Executive'];

const isAdmin = (role: string | undefined): boolean => {
  if (!role) return false;
  return ADMIN_ROLES.includes(role);
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
};

export default function AdminNotificationsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitializing } = useAuth();
  const { showAlert } = useAlerts();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

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

  // Fetch only CONTENT_REPORT notifications
  const notificationsParams = useMemo(() => {
    return {
      page,
      limit: 20,
      type: NotificationType.CONTENT_REPORT,
      ...(filter === 'unread' ? { isRead: false } : {}),
    };
  }, [page, filter]);

  const {
    notifications,
    meta,
    isLoading,
    markAsRead,
    deleteNotification,
    isMarkingAsRead,
    isDeleting,
  } = useNotifications(notificationsParams, isAuthenticated && !!user && isAdmin(user.role));

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    if (notification.actionUrl) {
      const normalizedUrl = notification.actionUrl.replace(/^\/data/, '');
      router.push(normalizedUrl);
    }
  };

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
          message="You must be logged in to access admin notifications"
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
              <h1 className="text-3xl font-bold tracking-tight">Admin Notifications</h1>
              <p className="text-muted-foreground mt-1">
                Content reports and administrative notifications
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Flag className="w-5 h-5" />
                Content Reports
              </CardTitle>
              <CardDescription>Review and manage content reports</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setFilter('all');
                  setPage(1);
                }}
              >
                All
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setFilter('unread');
                  setPage(1);
                }}
              >
                Unread
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((notification) => {
                const reportData = notification.metadata as {
                  reportId?: string;
                  resourceType?: string;
                  resourceId?: string;
                  reason?: string;
                  reporterUsername?: string;
                } | null;

                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      notification.isRead
                        ? 'bg-background hover:bg-muted/50'
                        : 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Flag className={`h-5 w-5 ${notification.isRead ? 'text-muted-foreground' : 'text-primary'}`} />
                          <h3 className={`font-semibold ${notification.isRead ? '' : 'text-primary'}`}>
                            {notification.title}
                          </h3>
                          {!notification.isRead && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                        {reportData && (
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                            {reportData.resourceType && (
                              <span className="px-2 py-1 bg-muted rounded capitalize">
                                {reportData.resourceType}
                              </span>
                            )}
                            {reportData.reason && (
                              <span className="px-2 py-1 bg-muted rounded capitalize">
                                {reportData.reason.replace(/_/g, ' ')}
                              </span>
                            )}
                            {reportData.reporterUsername && (
                              <span>Reported by: {reportData.reporterUsername}</span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{formatTimeAgo(notification.dateCreated)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            disabled={isMarkingAsRead}
                            aria-label="Mark as read"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          disabled={isDeleting}
                          aria-label="Delete notification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Pagination */}
              {meta && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {((meta.page - 1) * meta.limit) + 1} to{' '}
                    {Math.min(meta.page * meta.limit, meta.total)} of{' '}
                    {meta.total} notifications
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={!meta.hasPreviousPage || page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={!meta.hasNextPage}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Flag className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm font-medium text-muted-foreground mb-1">No notifications</p>
              <p className="text-xs text-muted-foreground">
                {filter === 'unread' 
                  ? 'You have no unread report notifications'
                  : 'You have no report notifications'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

