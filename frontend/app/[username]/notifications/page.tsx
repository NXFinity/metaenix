'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/core/hooks/useAuth';
import { useNotifications } from '@/core/hooks/useNotifications';
import { useAlerts } from '@/theme/components/alerts';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/theme/ui/tabs';
import {
  BellIcon,
  CheckIcon,
  CheckCheckIcon,
  TrashIcon,
  XIcon,
  UserPlusIcon,
  HeartIcon,
  MessageCircleIcon,
  ShareIcon,
  MailIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ArrowRightIcon,
} from 'lucide-react';
import { NotificationType } from '@/core/api/notifications';

// Notification type icons mapping
const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case NotificationType.FOLLOW:
      return <UserPlusIcon className="h-5 w-5 text-blue-500" />;
    case NotificationType.POST_LIKE:
      return <HeartIcon className="h-5 w-5 text-red-500" />;
    case NotificationType.POST_COMMENT:
    case NotificationType.COMMENT_REPLY:
      return <MessageCircleIcon className="h-5 w-5 text-green-500" />;
    case NotificationType.POST_SHARE:
      return <ShareIcon className="h-5 w-5 text-purple-500" />;
    case NotificationType.POST_MENTION:
      return <MailIcon className="h-5 w-5 text-orange-500" />;
    case NotificationType.SYSTEM:
    case NotificationType.WELCOME:
      return <SparklesIcon className="h-5 w-5 text-yellow-500" />;
    case NotificationType.VERIFICATION:
      return <ShieldCheckIcon className="h-5 w-5 text-indigo-500" />;
    default:
      return <BellIcon className="h-5 w-5 text-muted-foreground" />;
  }
};

// Format time ago helper
const formatTimeAgo = (date: string) => {
  const now = new Date();
  const notificationDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
};

// Inner component that only renders when auth is ready and user can access
function NotificationsPageContent() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const { user } = useAuth();
  const { showConfirm } = useAlerts();
  const [filter, setFilter] = useState<'all' | 'unread' | NotificationType>('all');
  const [page, setPage] = useState(1);

  // Create params - ONLY fetch ALL notifications, no filter params (filters applied client-side)
  const notificationsParams = useMemo(() => {
    return {
      page,
      limit: 20,
      // NO filter params - we fetch all notifications and filter client-side
    };
  }, [page]);

  // Hook - enabled when component renders (component only renders when ready)
  // Notifications come from WebSocket events, REST API is only for persisted history
  const {
    notifications: allNotifications,
    meta,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    isMarkingAsRead,
    isMarkingAllAsRead,
    isDeleting,
    isDeletingAllRead,
  } = useNotifications(notificationsParams, true); // Enabled - queries when ready

  // Filter notifications client-side (no database queries for filters)
  const notifications = useMemo(() => {
    if (!allNotifications || allNotifications.length === 0) return [];
    
    let filtered = allNotifications;
    
    // Apply filter
    if (filter === 'unread') {
      filtered = filtered.filter((n) => !n.isRead);
    } else if (filter !== 'all') {
      // Compare notification type - handle both enum and string values
      // filter is the NotificationType enum value (e.g., NotificationType.FOLLOW = 'follow')
      // n.type from API is a string (e.g., 'follow')
      // Convert both to strings for reliable comparison
      const filterType = String(filter);
      filtered = filtered.filter((n) => String(n.type) === filterType);
    }
    
    return filtered;
  }, [allNotifications, filter]);

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleDelete = (id: string) => {
    deleteNotification(id);
  };

  const handleDeleteAllRead = async () => {
    const confirmed = await showConfirm({
      title: 'Delete All Read Notifications',
      message: 'Are you sure you want to delete all read notifications? This action cannot be undone.',
      confirmLabel: 'Delete All',
      cancelLabel: 'Cancel',
      variant: 'destructive',
    });
    
    if (confirmed) {
      deleteAllRead();
    }
  };

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    // Mark as read when clicked
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? (
              <>
                <span className="font-semibold text-foreground">{unreadCount}</span> unread
                {unreadCount === 1 ? ' notification' : ' notifications'}
              </>
            ) : (
              'All caught up!'
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAllAsRead}
              variant="outline"
              size="sm"
            >
              <CheckCheckIcon className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
          {notifications.some((n) => n.isRead) && (
            <Button
              onClick={handleDeleteAllRead}
              disabled={isDeletingAllRead}
              variant="outline"
              size="sm"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={(value) => {
        setFilter(value as typeof filter);
        setPage(1);
      }} className="mb-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </TabsTrigger>
          <TabsTrigger value={NotificationType.FOLLOW}>Follows</TabsTrigger>
          <TabsTrigger value={NotificationType.POST_LIKE}>Likes</TabsTrigger>
          <TabsTrigger value={NotificationType.POST_COMMENT}>Comments</TabsTrigger>
          <TabsTrigger value={NotificationType.POST_SHARE}>Shares</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BellIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No notifications</h3>
            <p className="text-muted-foreground">
              {filter === 'unread'
                ? "You're all caught up! No unread notifications."
                : filter !== 'all'
                ? `No ${filter} notifications yet.`
                : "You don't have any notifications yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  !notification.isRead
                    ? 'border-l-4 border-l-primary bg-primary/5'
                    : 'opacity-75'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3
                            className={`font-semibold mb-1 ${
                              !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
                            }`}
                          >
                            {notification.title}
                          </h3>
                          {notification.message && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.message}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatTimeAgo(notification.dateCreated)}</span>
                            {!notification.isRead && (
                              <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-full">
                                New
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.id);
                              }}
                              disabled={isMarkingAsRead}
                              className="h-8 w-8 p-0"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(notification.id);
                            }}
                            disabled={isDeleting}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Action URL indicator */}
                      {notification.actionUrl && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                          <span>View</span>
                          <ArrowRightIcon className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Page {meta.page} of {meta.totalPages} ({meta.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!meta.hasPreviousPage || isLoading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={!meta.hasNextPage || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Wrapper component that handles auth checks BEFORE rendering content (prevents queries from running)
export default function NotificationsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const username = params.username as string;
  const { user, isAuthenticated, isInitializing } = useAuth();

  // Clear notification queries on mount
  useEffect(() => {
    queryClient.cancelQueries({ queryKey: ['notifications'] });
    queryClient.removeQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  // Check if user is viewing their own notifications
  const isOwnNotifications = isAuthenticated && user?.username === username;

  // Redirect and return null BEFORE any hooks that might trigger queries
  useEffect(() => {
    if (!isInitializing) {
      if (!isAuthenticated || !isOwnNotifications) {
        router.push(`/${username}`);
      }
    }
  }, [isInitializing, isAuthenticated, isOwnNotifications, username, router]);

  // Return null IMMEDIATELY if not ready - prevents ANY hooks from running in content component
  if (isInitializing || !isAuthenticated || !isOwnNotifications) {
    // Clear queries AGAIN before returning
    queryClient.cancelQueries({ queryKey: ['notifications'] });
    queryClient.removeQueries({ queryKey: ['notifications'] });
    return null;
  }

  // Only render content component when ALL checks pass - this ensures hooks with queries never run until ready
  return <NotificationsPageContent />;
}

