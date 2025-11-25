'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { notificationsService } from '@/core/api/users/notifications';
import type {
  Notification,
  GetNotificationsParams,
} from '@/core/api/users/notifications';
import { connectUserSocket } from '@/lib/websocket/client';
import type { Socket } from 'socket.io-client';

/**
 * Hook for managing notifications
 *
 * Provides:
 * - Notifications list with pagination
 * - Unread count
 * - Real-time updates via WebSocket
 * - Mark as read functionality
 * - Delete functionality
 */
export const useNotifications = (
  params?: GetNotificationsParams,
  enabled: boolean = true,
) => {
  const { user, isAuthenticated, isInitializing } = useAuth();
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // ONLY enable queries if ALL conditions are met AND params exist - be VERY strict
  const shouldEnableQueries = !isInitializing && isAuthenticated === true && enabled === true && params !== undefined;

  // Use ref to track current enabled state for interval callback (avoids stale closures)
  const shouldEnableQueriesRef = useRef(shouldEnableQueries);
  useEffect(() => {
    shouldEnableQueriesRef.current = shouldEnableQueries;
  }, [shouldEnableQueries]);

  // Aggressively cancel ALL notification queries if disabled
  useEffect(() => {
    if (!shouldEnableQueries) {
      // Cancel ALL notification-related queries immediately
      queryClient.cancelQueries({ queryKey: ['notifications'] });
      queryClient.removeQueries({ queryKey: ['notifications'] });
    }
  }, [shouldEnableQueries, queryClient]);

  // Query: Get notifications - only execute when explicitly enabled and all conditions pass
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => {
      // GUARD - if ANY condition fails, return empty without HTTP request
      if (isInitializing || !isAuthenticated || !enabled || !params) {
        queryClient.cancelQueries({ queryKey: ['notifications'] });
        return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      }
      // Make HTTP request only if ALL conditions pass
      return notificationsService.getAll(params);
    },
    enabled: shouldEnableQueries, // Only execute when all conditions are met
    staleTime: 30 * 1000,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Query: Get unread count - only execute when explicitly enabled and all conditions pass
  const {
    data: unreadCountData,
    refetch: refetchUnreadCount,
  } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      // GUARD - if ANY condition fails, return 0 without HTTP request
      if (isInitializing || !isAuthenticated || !enabled) {
        queryClient.cancelQueries({ queryKey: ['notifications', 'unread-count'] });
        return 0;
      }
      // Make HTTP request only if ALL conditions pass
      return notificationsService.getUnreadCount();
    },
    enabled: shouldEnableQueries, // Only execute when all conditions are met
    staleTime: 10 * 1000,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: shouldEnableQueries ? 60 * 1000 : false, // Poll every minute when enabled
  });

  // Update local unread count state
  useEffect(() => {
    if (unreadCountData !== undefined) {
      setUnreadCount(unreadCountData);
    }
  }, [unreadCountData]);

  // Listen for real-time notification events via WebSocket
  useEffect(() => {
    if (!isAuthenticated || !user?.websocketId || !enabled) {
      return;
    }

    const socket = connectUserSocket(user.websocketId);
    
    const handleNewNotification = (data: { type?: string; notification: Notification }) => {
      // Only increment if notification is unread
      if (data.notification && !data.notification.isRead) {
        // Optimistically increment the unread count
        queryClient.setQueryData<number>(['notifications', 'unread-count'], (oldCount) => {
          return (oldCount ?? 0) + 1;
        });
      }
      
      // Invalidate queries to refetch notifications and unread count
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      refetchUnreadCount();
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [isAuthenticated, user?.websocketId, enabled, queryClient, refetchUnreadCount]);

  // Mutation: Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: () => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      refetchUnreadCount();
    },
  });

  // Mutation: Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: (type?: string) =>
      notificationsService.markAllAsRead(type ? { type: type as any } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      refetchUnreadCount();
    },
  });

  // Mutation: Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: (id: string) => notificationsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      refetchUnreadCount();
    },
  });

  // Mutation: Delete all read
  const deleteAllReadMutation = useMutation({
    mutationFn: () => notificationsService.deleteAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    // Data
    notifications: notificationsData?.data || [],
    meta: notificationsData?.meta,
    unreadCount,
    isLoading,
    error,

    // Actions
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    deleteAllRead: deleteAllReadMutation.mutate,
    refetch,
    refetchUnreadCount,

    // Mutation states
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isDeleting: deleteNotificationMutation.isPending,
    isDeletingAllRead: deleteAllReadMutation.isPending,
  };
};

/**
 * Hook for getting unread count only
 * Lighter weight hook for components that only need the count
 */
export const useUnreadCount = () => {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  const { data, refetch } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsService.getUnreadCount(),
    enabled: isAuthenticated,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds to get updated count
  });

  // Listen for real-time notification events via WebSocket
  useEffect(() => {
    if (!isAuthenticated || !user?.websocketId) {
      return;
    }

    const socket = connectUserSocket(user.websocketId);
    
    const handleNewNotification = (data: { type?: string; notification?: Notification }) => {
      // Only increment if notification exists and is unread
      if (data.notification && !data.notification.isRead) {
        // Optimistically increment the unread count immediately
        queryClient.setQueryData<number>(['notifications', 'unread-count'], (oldCount) => {
          return (oldCount ?? 0) + 1;
        });
      }
      
      // Also invalidate and refetch to get the accurate count from the server
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      refetch();
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [isAuthenticated, user?.websocketId, queryClient, refetch]);

  return {
    unreadCount: data ?? 0,
    refetch,
  };
};

