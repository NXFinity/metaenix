'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import { useNotifications, useUnreadCount } from '@/core/hooks/useNotifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/theme/ui/dropdown-menu';
import { Button } from '@/theme/ui/button';
import { BellIcon, CheckIcon, Loader2Icon } from 'lucide-react';
import type { Notification } from '@/core/api/users/notifications';

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

export function NotificationsMenu() {
  const router = useRouter();
  const { user, isAuthenticated, isInitializing } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Always fetch unread count when authenticated (for badge display)
  const { unreadCount } = useUnreadCount();

  // Memoize params to prevent unnecessary re-renders - always pass params to avoid hook issues
  const notificationsParams = useMemo(() => ({ page: 1, limit: 10 }), []);

  // Only fetch notifications list when dropdown is open and user is authenticated
  const shouldFetchNotifications = useMemo(
    () => isMounted && isAuthenticated && !isInitializing && isOpen,
    [isMounted, isAuthenticated, isInitializing, isOpen]
  );

  // Always pass params to avoid hook issues, but control with enabled flag
  const {
    notifications,
    isLoading,
    markAsRead,
    isMarkingAsRead,
  } = useNotifications(
    notificationsParams,
    shouldFetchNotifications
  );

  // Get recent notifications (limit to 5 for dropdown display)
  const recentNotifications = useMemo(() => {
    if (!notifications || notifications.length === 0) return [];
    return notifications.slice(0, 5);
  }, [notifications]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    if (notification.actionUrl) {
      // Normalize action URL (remove /data/ prefix if present)
      const normalizedUrl = notification.actionUrl.replace(/^\/data/, '');
      router.push(normalizedUrl);
      setIsOpen(false);
    }
  };

  const handleViewAll = () => {
    if (user?.username) {
      router.push(`/${user.username}/notifications`);
      setIsOpen(false);
    }
  };

  // Don't render anything during SSR to avoid hydration mismatch
  if (!isMounted) return null;

  // Don't render if not authenticated
  if (!isAuthenticated) return null;

  // If authenticated but user not loaded yet, show loading state
  if (!user && (isInitializing || isAuthenticated)) {
    return (
      <Button variant="ghost" size="sm" className="relative" disabled>
        <BellIcon className="h-5 w-5" />
      </Button>
    );
  }

  // If no user after initialization, don't render
  if (!user) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 p-0"
          aria-label="Notifications"
        >
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[32rem] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {unreadCount} unread
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BellIcon className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          <>
            {recentNotifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start p-3 cursor-pointer hover:bg-accent"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      {!notification.isRead && (
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${!notification.isRead ? 'font-semibold' : ''}`}>
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimeAgo(notification.dateCreated)}
                        </p>
                      </div>
                    </div>
                  </div>
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      disabled={isMarkingAsRead}
                      aria-label="Mark as read"
                    >
                      <CheckIcon className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleViewAll}
              className="cursor-pointer text-center justify-center font-medium"
            >
              View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

