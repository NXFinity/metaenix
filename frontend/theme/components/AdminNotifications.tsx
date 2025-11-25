'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import { useNotifications } from '@/core/hooks/useNotifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/theme/ui/dropdown-menu';
import { Button } from '@/theme/ui/button';
import { CheckIcon, Loader2Icon } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBullhorn } from '@fortawesome/free-solid-svg-icons';
import type { Notification } from '@/core/api/users/notifications';
import { NotificationType } from '@/core/api/users/notifications';

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

export function AdminNotifications() {
  const router = useRouter();
  const { user, isAuthenticated, isInitializing } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Memoize params to fetch only CONTENT_REPORT notifications
  const notificationsParams = useMemo(() => ({ 
    page: 1, 
    limit: 10,
    type: NotificationType.CONTENT_REPORT,
  }), []);

  // Only fetch notifications list when dropdown is open and user is authenticated admin
  const shouldFetchNotifications = useMemo(
    () => isMounted && isAuthenticated && !isInitializing && isOpen && user && isAdmin(user.role),
    [isMounted, isAuthenticated, isInitializing, isOpen, user]
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

  // Calculate unread count for admin notifications
  const unreadCount = useMemo(() => {
    if (!notifications || notifications.length === 0) return 0;
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

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
    // Redirect to admin client notifications page
    const adminClientUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';
    window.location.href = `${adminClientUrl}/admin/notifications`;
    setIsOpen(false);
  };

  // Don't render anything during SSR to avoid hydration mismatch
  if (!isMounted) return null;

  // Don't render if not authenticated or not admin
  if (!isAuthenticated || !user || !isAdmin(user.role)) return null;

  // If authenticated but user not loaded yet, show loading state
  if (isInitializing) {
    return (
      <Button variant="ghost" size="sm" className="relative" disabled>
        <FontAwesomeIcon icon={faBullhorn} className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 p-0"
          aria-label="Admin Notifications"
        >
          <FontAwesomeIcon icon={faBullhorn} className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[32rem] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Admin Notifications</span>
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
            <FontAwesomeIcon icon={faBullhorn} className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No admin notifications</p>
          </div>
        ) : (
          <>
            {recentNotifications.map((notification) => {
              const reportData = notification.metadata as {
                reportId?: string;
                resourceType?: string;
                resourceId?: string;
                reason?: string;
                reporterUsername?: string;
              } | null;

              return (
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
                          {reportData && (
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              {reportData.resourceType && (
                                <span className="text-xs px-1.5 py-0.5 bg-muted rounded capitalize">
                                  {reportData.resourceType}
                                </span>
                              )}
                              {reportData.reason && (
                                <span className="text-xs px-1.5 py-0.5 bg-muted rounded capitalize">
                                  {reportData.reason.replace(/_/g, ' ')}
                                </span>
                              )}
                            </div>
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
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleViewAll}
              className="cursor-pointer text-center justify-center font-medium"
            >
              View all admin notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

