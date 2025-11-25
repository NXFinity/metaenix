'use client';

import { useParams, useRouter } from 'next/navigation';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { userService } from '@/core/api/users/user';
import { postsService } from '@/core/api/users/posts';
import { followsService } from '@/core/api/users/follows';
import { videosService } from '@/core/api/users/videos';
import { photosService } from '@/core/api/users/photos';
import { trackingService } from '@/core/api/data/tracking';
import { analyticsService } from '@/core/api/data/analytics';
import { useAuth } from '@/core/hooks/useAuth';
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Card, CardContent } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/theme/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/theme/ui/dialog';
import { PostCard } from '@/theme/components/posts/Posts';
import { VideoCard } from '@/theme/components/videos/VideoCard';
import {
  HeartIcon,
  MessageCircleIcon,
  ShareIcon,
  UserPlusIcon,
  UserMinusIcon,
  SettingsIcon,
  ImageIcon,
  TrashIcon,
  Loader2,
  VideoIcon,
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons';
import { faUsers } from '@fortawesome/free-solid-svg-icons';
import { faStar } from '@fortawesome/free-solid-svg-icons';
import {
  faTwitter,
  faInstagram,
  faFacebook,
  faYoutube,
  faDiscord,
  faTwitch,
} from '@fortawesome/free-brands-svg-icons';
import { cn } from '@/lib/utils';
import { getPhotoSlug } from '@/core/utils/slug';
import type { Post, Comment } from '@/core/api/users/posts';

// Date formatting helper
const formatTimeAgo = (date: string) => {
  const now = new Date();
  const postDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
};

function UserProfilePageContent() {
  const params = useParams();
  const username = params.username as string;
  const { user: currentUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user', 'profile', username],
    queryFn: () => userService.getByUsername(username),
    enabled: !!username,
    staleTime: 0, // Always consider stale to ensure fresh data
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    retry: (failureCount, error: unknown) => {
      // Don't retry on 403 (Forbidden) or 404 (Not Found) errors
      const httpError = error as { response?: { status?: number } };
      if (httpError?.response?.status === 403 || httpError?.response?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Fetch user analytics for accurate follower/following counts (public endpoint)
  const { data: userAnalytics } = useQuery({
    queryKey: ['userAnalytics', user?.id],
    queryFn: () => analyticsService.getUserAnalytics(user!.id),
    enabled: !!user?.id,
    staleTime: 60000, // Cache for 1 minute
  });

  // Check if current user is following this user
  const {
    data: followStatus,
    isLoading: isLoadingFollowStatus,
  } = useQuery({
    queryKey: ['follow', 'status', user?.id],
    queryFn: () => followsService.getFollowStatus(user!.id),
    enabled: !!user?.id && isAuthenticated && currentUser?.id !== user?.id,
  });

  // Follow/Unfollow mutation with optimistic updates
  const followMutation = useMutation({
    mutationFn: () => followsService.follow(user!.id),
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user', 'profile', username] });

      // Snapshot previous value
      const previousUser = queryClient.getQueryData(['user', 'profile', username]);

      // Optimistically update
      queryClient.setQueryData(['user', 'profile', username], (old: unknown) => {
        const userData = old as { followersCount?: number } | undefined;
        if (!userData) return old;
        return {
          ...userData,
          followersCount: (userData.followersCount || 0) + 1,
        };
      });

      return { previousUser };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousUser) {
        queryClient.setQueryData(['user', 'profile', username], context.previousUser);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow', 'status', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile', username] });
      queryClient.invalidateQueries({ queryKey: ['userAnalytics', user?.id] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => followsService.unfollow(user!.id),
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user', 'profile', username] });

      // Snapshot previous value
      const previousUser = queryClient.getQueryData(['user', 'profile', username]);

      // Optimistically update
      queryClient.setQueryData(['user', 'profile', username], (old: unknown) => {
        const userData = old as { followersCount?: number } | undefined;
        if (!userData) return old;
        return {
          ...userData,
          followersCount: Math.max(0, (userData.followersCount || 0) - 1),
        };
      });

      return { previousUser };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousUser) {
        queryClient.setQueryData(['user', 'profile', username], context.previousUser);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow', 'status', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile', username] });
      queryClient.invalidateQueries({ queryKey: ['userAnalytics', user?.id] });
    },
  });

  // Check if viewing own profile
  const isOwnProfile = isAuthenticated && currentUser?.id === user?.id;

  // Track if profile view has been tracked (prevents duplicate tracking)
  const hasTrackedProfileView = useRef(false);

  // Track profile view (only for other users' profiles)
  useEffect(() => {
    if (user?.id && !isOwnProfile && user.isPublic && !hasTrackedProfileView.current) {
      hasTrackedProfileView.current = true;
      trackingService.trackProfileView(user.id).catch(() => {
        // Silently fail view tracking
      });
    }
  }, [user?.id, isOwnProfile]);

  // Fetch user's posts (only posts by this user, not feed)
  // Public posts are visible to all, authenticated users see their own private posts too
  const {
    data: postsData,
    isLoading: isLoadingPosts,
  } = useQuery({
    queryKey: ['posts', 'user', user?.id],
    queryFn: () => postsService.getByUser(user!.id, { page: 1, limit: 100 }),
    enabled: !!user?.id,
    retry: (failureCount, error: unknown) => {
      // Don't retry on connection errors, 403 (Forbidden) or 404 (Not Found) errors
      const httpError = error as { code?: string; response?: { status?: number } };
      if (
        httpError?.code === 'ERR_CONNECTION_REFUSED' ||
        httpError?.code === 'ECONNREFUSED' ||
        httpError?.response?.status === 403 ||
        httpError?.response?.status === 404
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });


  // Fetch shared posts - only for own profile
  const {
    data: sharedPostsData,
    isLoading: isLoadingSharedPosts,
  } = useQuery({
    queryKey: ['posts', 'shared', currentUser?.id],
    queryFn: () => postsService.getSharedPosts({ page: 1, limit: 100 }),
    enabled: isOwnProfile && !!currentUser?.id,
  });

  // Fetch videos count
  const {
    data: videosData,
  } = useQuery({
    queryKey: ['videos', 'user', user?.id, 'count'],
    queryFn: () => videosService.getByUser(user!.id, { page: 1, limit: 1 }),
    enabled: !!user?.id,
    // Poll for status updates if there are processing videos
    refetchInterval: (query) => {
      const data = query.state.data as typeof videosData;
      if (data?.data) {
        const hasProcessingVideos = data.data.some((video) => video.status === 'processing');
        // Poll every 10 seconds if there are processing videos, otherwise don't poll
        return hasProcessingVideos ? 10000 : false;
      }
      return false;
    },
  });

  // Fetch videos for display in Videos tab
  const {
    data: videosListData,
    isLoading: isLoadingVideos,
  } = useQuery({
    queryKey: ['videos', 'user', user?.id, 'list'],
    queryFn: () => videosService.getByUser(user!.id, { page: 1, limit: 12 }),
    enabled: !!user?.id,
    // Poll for status updates if there are processing videos
    refetchInterval: (query) => {
      const data = query.state.data as typeof videosListData;
      if (data?.data) {
        const hasProcessingVideos = data.data.some((video) => video.status === 'processing');
        // Poll every 10 seconds if there are processing videos, otherwise don't poll
        return hasProcessingVideos ? 10000 : false;
      }
      return false;
    },
  });

  // Fetch photos for display in Photos tab
  const {
    data: photosData,
    isLoading: isLoadingPhotos,
  } = useQuery({
    queryKey: ['photos', 'user', user?.id, 'list'],
    queryFn: () => photosService.getByUser(user!.id, { page: 1, limit: 100 }),
    enabled: !!user?.id,
  });

  // Fetch analytics for all posts to get accurate comment counts for the tab
  const postAnalyticsQueries = useQueries({
    queries: (postsData?.data || []).map((post: Post) => ({
      queryKey: ['postAnalytics', post.id, 'tab-count'],
      queryFn: () => analyticsService.getPostAnalytics(post.id),
      enabled: !!post.id && !!postsData?.data && postsData.data.length > 0,
      staleTime: 30000, // Cache for 30 seconds
    })),
  });

  // Calculate total comments count from analytics
  const totalCommentsCount = useMemo(() => {
    return postAnalyticsQueries.reduce((sum, query) => {
      return sum + (query.data?.commentsCount || 0);
    }, 0);
  }, [postAnalyticsQueries]);

  const isFollowing = followStatus?.isFollowing ?? false;
  const [activeTab, setActiveTab] = useState('posts');
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; photoId?: string; postId?: string; postType?: string } | null>(null);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  // Handle hash navigation to switch tabs
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'photos' && activeTab !== 'photos') {
        // Use setTimeout to avoid synchronous setState in effect
        setTimeout(() => {
          setActiveTab('photos');
        }, 0);
      }
    }
  }, [activeTab]);

  // Delete photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async ({ photoId }: { photoId: string }) => {
      return photosService.delete(photoId);
    },
    onSuccess: () => {
      // Invalidate photos queries to refetch
      queryClient.invalidateQueries({ queryKey: ['photos', 'user', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      setSelectedPhoto(null);
      setIsDeletingMedia(false);
      setShowDeleteConfirm(false);
    },
    onError: () => {
      setIsDeletingMedia(false);
    },
  });

  const handleDeletePhoto = () => {
    if (!selectedPhoto || !selectedPhoto.photoId) return;
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    setIsDeletingMedia(true);
    deletePhotoMutation.mutate({
      photoId: selectedPhoto.photoId,
    });
  };

  const handleFollow = () => {
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  if (isLoading || isLoadingPosts) {
    return (
      <>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-32 bg-muted rounded-lg mb-4" />
            <div className="h-8 bg-muted rounded w-1/3 mb-2" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </div>
      </>
    );
  }

  // Check privacy settings from user data if available (same way as isPublic check)
  const isPrivate = user && user.isPublic === false;
  const isFollowerOnly = user?.privacy?.isFollowerOnly === true;
  const isSubscriberOnly = user?.privacy?.isSubscriberOnly === true;

  // Handle private/follower-only/subscriber-only profiles - show immediately without waiting for other queries
  const httpError = error as { response?: { status?: number; data?: { privacy?: { isFollowerOnly?: boolean; isSubscriberOnly?: boolean; isPrivate?: boolean } } } } | null;
  const isForbidden = httpError?.response?.status === 403;

  // Get privacy settings from error response if user data is not available (403 error)
  // Axios error structure: error.response.data contains the response body
  const errorIsFollowerOnly = httpError?.response?.data?.privacy?.isFollowerOnly === true;
  const errorIsSubscriberOnly = httpError?.response?.data?.privacy?.isSubscriberOnly === true;
  const errorIsPrivate = httpError?.response?.data?.privacy?.isPrivate === true;

  // Determine which privacy restriction applies (prioritize error response if available, otherwise use user data)
  const finalIsSubscriberOnly = isSubscriberOnly || errorIsSubscriberOnly;
  const finalIsFollowerOnly = isFollowerOnly || errorIsFollowerOnly;
  const finalIsPrivate = isPrivate || errorIsPrivate;

  // Show restricted profile card ONLY if:
  // 1. There's a 403 error (backend blocked access), OR
  // 2. User data exists AND profile is private (not follower/subscriber only - those would have been blocked by backend if not following/subscribed)
  // If we have user data for a follower-only or subscriber-only profile, it means backend allowed access (user is following/subscribed)
  const shouldShowRestrictedCard =
    (error && isForbidden) ||
    (user && finalIsPrivate && !isOwnProfile);

  if (shouldShowRestrictedCard) {
    // Determine which icon and message to show based on privacy settings
    let icon = faLock;
    let title = 'Private Profile';
    let message = 'This profile is private. Only friends of this user can view their profile.';
    let actionMessage = 'This profile is only visible to friends. Friends functionality is coming soon.';
    let cardColor = 'primary'; // primary color for private

    if (finalIsSubscriberOnly) {
      icon = faStar;
      title = 'Subscriber Only';
      message = 'This profile is only visible to subscribers. Subscribe to this user to view their profile.';
      actionMessage = 'This profile is only visible to subscribers. Subscription functionality is coming soon.';
      cardColor = 'pink';
    } else if (finalIsFollowerOnly) {
      icon = faUsers;
      title = 'Followers Only';
      message = 'This profile is only visible to followers. Follow this user to view their profile.';
      actionMessage = 'This profile is only visible to followers. Follow this user to view their profile.';
      cardColor = 'blue';
    }

    // Color classes based on card type
    const gradientBg = cardColor === 'pink'
      ? 'bg-gradient-to-br from-pink-500/20 via-pink-500/10 to-transparent'
      : cardColor === 'blue'
      ? 'bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-transparent'
      : 'bg-gradient-to-br from-primary/20 via-primary/10 to-transparent';

    const cardBorder = cardColor === 'pink'
      ? 'border-pink-500/30'
      : cardColor === 'blue'
      ? 'border-blue-500/30'
      : 'border-primary/30';

    const cardGradient = cardColor === 'pink'
      ? 'bg-gradient-to-br from-card/80 via-pink-500/5 to-card/40'
      : cardColor === 'blue'
      ? 'bg-gradient-to-br from-card/80 via-blue-500/5 to-card/40'
      : 'bg-gradient-to-br from-card/80 via-card/60 to-card/40';

    const accentLine = cardColor === 'pink'
      ? 'bg-gradient-to-r from-transparent via-pink-500 to-transparent'
      : cardColor === 'blue'
      ? 'bg-gradient-to-r from-transparent via-blue-500 to-transparent'
      : 'bg-gradient-to-r from-transparent via-primary to-transparent';

    const iconBg = cardColor === 'pink'
      ? 'bg-gradient-to-br from-pink-500/40 via-pink-500/20 to-pink-500/10 border-4 border-pink-500/40'
      : cardColor === 'blue'
      ? 'bg-gradient-to-br from-blue-500/40 via-blue-500/20 to-blue-500/10 border-4 border-blue-500/40'
      : 'bg-gradient-to-br from-primary/40 via-primary/20 to-primary/10 border-4 border-primary/40';

    const iconGlow = cardColor === 'pink'
      ? 'bg-pink-500/30'
      : cardColor === 'blue'
      ? 'bg-blue-500/30'
      : 'bg-primary/30';

    const iconText = cardColor === 'pink'
      ? 'text-pink-500'
      : cardColor === 'blue'
      ? 'text-blue-500'
      : 'text-primary';

    const titleGradient = cardColor === 'pink'
      ? 'bg-gradient-to-r from-foreground via-foreground to-pink-500'
      : cardColor === 'blue'
      ? 'bg-gradient-to-r from-foreground via-foreground to-blue-500'
      : 'bg-gradient-to-r from-foreground via-foreground to-primary';

    const titleText = cardColor === 'pink'
      ? 'text-pink-500'
      : cardColor === 'blue'
      ? 'text-blue-500'
      : 'text-primary';

    const dividerLine = cardColor === 'pink'
      ? 'bg-gradient-to-r from-transparent to-pink-500/50'
      : cardColor === 'blue'
      ? 'bg-gradient-to-r from-transparent to-blue-500/50'
      : 'bg-gradient-to-r from-transparent to-primary/50';

    const dividerLineReverse = cardColor === 'pink'
      ? 'bg-gradient-to-l from-transparent to-pink-500/50'
      : cardColor === 'blue'
      ? 'bg-gradient-to-l from-transparent to-blue-500/50'
      : 'bg-gradient-to-l from-transparent to-primary/50';

    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <div className="relative">
              {/* Animated background gradient */}
              <div className={cn("absolute inset-0 rounded-3xl blur-3xl animate-pulse", gradientBg)} />

              {/* Main card */}
              <Card className={cn("relative border-2 backdrop-blur-xl shadow-2xl overflow-hidden", cardBorder, cardGradient)}>
                {/* Top accent line */}
                <div className={cn("absolute top-0 left-0 right-0 h-1", accentLine)} />

                <CardContent className="p-8 md:p-12">
                  <div className="flex flex-col items-center text-center space-y-8">
                    {/* Animated Icon */}
                    <div className="relative">
                      <div className={cn("absolute inset-0 rounded-full blur-2xl animate-pulse", iconGlow)} />
                      <div className="relative">
                        <div className={cn("w-32 h-32 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm", iconBg)}>
                          <FontAwesomeIcon icon={icon} size="4x" className={cn("drop-shadow-lg", iconText)} />
                        </div>
                      </div>
                    </div>

                    {/* Username and Title */}
                    <div className="space-y-3">
                      <h1 className={cn("text-4xl md:text-5xl font-bold bg-clip-text text-transparent", titleGradient)}>
                        @{username}
                      </h1>
                      <div className="flex items-center justify-center gap-2">
                        <div className={cn("h-px w-12", dividerLine)} />
                        <p className={cn("text-xl md:text-2xl font-semibold", titleText)}>
                          {title}
                        </p>
                        <div className={cn("h-px w-12", dividerLineReverse)} />
                      </div>
                    </div>

                    {/* Message and Actions */}
                    <div className="space-y-6 max-w-md">
                      <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                        {message}
                      </p>

                      {!isAuthenticated ? (
                        <div className="pt-2">
                          <Link href="/login">
                            <Button
                              size="lg"
                              variant="default"
                              className={cn(
                                "w-full shadow-lg hover:shadow-xl transition-all duration-300 text-white",
                                cardColor === 'pink'
                                  ? "bg-gradient-to-r from-pink-500 to-pink-500/80 hover:from-pink-600 hover:to-pink-500/70"
                                  : cardColor === 'blue'
                                  ? "bg-gradient-to-r from-blue-500 to-blue-500/80 hover:from-blue-600 hover:to-blue-500/70"
                                  : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground"
                              )}
                            >
                              Sign in
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="pt-2">
                          <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                            <p className="text-sm text-muted-foreground leading-relaxed text-center">
                              {actionMessage}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {

    // Not found error
    return (
      <>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                User not found
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                User not found
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="bg-background relative">
        {/* Cover Image Background - Only affects this page content */}
        {user.profile?.cover && (
          <div
            className={cn(
              "fixed left-0 right-0 z-0 pointer-events-none overflow-hidden",
              isAuthenticated ? "top-16 lg:left-80" : "top-0"
            )}
            style={{ bottom: 0 }}
          >
            <img
              src={user.profile.cover}
              alt={`${user.displayName || user.username}'s cover`}
              className="absolute inset-0 w-full h-full object-cover block"
            />
            <div className="absolute inset-0 bg-background/70" />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
            {/* Left Sidebar - Profile Info - Fixed on large screens */}
            <aside className="w-full lg:w-[280px] lg:flex-shrink-0 lg:sticky lg:top-8 lg:self-start space-y-6 pb-8 lg:pb-0">
              {/* Avatar Section */}
              <div className="text-center lg:text-left">
                <div className="inline-block lg:block mb-4">
                  <div className="w-24 h-24 lg:w-[280px] lg:h-[280px] rounded-2xl bg-muted overflow-hidden">
                    {user.profile?.avatar ? (
                      <Image
                        src={user.profile.avatar}
                        alt={user.displayName || user.username}
                        width={280}
                        height={280}
                        className="w-full h-full object-cover"
                        priority
                        unoptimized={user.profile.avatar.startsWith('http')}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl lg:text-6xl font-semibold text-muted-foreground">
                          {(user.displayName || user.username)[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h1 className="h3 text-center lg:text-left mb-1">
                    {user.displayName || user.username}
                  </h1>
                  <p className="text-body-sm text-muted-foreground text-center lg:text-left mb-3">@{user.username}</p>

                  {/* Badges */}
                  {(user.isDeveloper) && (
                    <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap mb-4">
                      {user.isDeveloper && (
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-primary text-primary-foreground">
                          Developer
                        </span>
                      )}
                    </div>
                  )}

                  {/* Social Links */}
                  {(user.social && (
                    user.social.twitter || user.social.instagram || user.social.facebook ||
                    user.social.youtube || user.social.discord || user.social.twitch
                  )) && (
                    <div className="flex items-center justify-center lg:justify-start gap-4 mb-4">
                      {user.social.twitter && (
                        <a
                          href={user.social.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-110"
                          aria-label="Twitter / X"
                          title="Twitter / X"
                        >
                          <FontAwesomeIcon icon={faTwitter} className="h-5 w-5" />
                        </a>
                      )}
                      {user.social.instagram && (
                        <a
                          href={user.social.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-110"
                          aria-label="Instagram"
                          title="Instagram"
                        >
                          <FontAwesomeIcon icon={faInstagram} className="h-5 w-5" />
                        </a>
                      )}
                      {user.social.facebook && (
                        <a
                          href={user.social.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-110"
                          aria-label="Facebook"
                          title="Facebook"
                        >
                          <FontAwesomeIcon icon={faFacebook} className="h-5 w-5" />
                        </a>
                      )}
                      {user.social.youtube && (
                        <a
                          href={user.social.youtube}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-110"
                          aria-label="YouTube"
                          title="YouTube"
                        >
                          <FontAwesomeIcon icon={faYoutube} className="h-5 w-5" />
                        </a>
                      )}
                      {user.social.discord && (
                        <a
                          href={user.social.discord}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-110"
                          aria-label="Discord"
                          title="Discord"
                        >
                          <FontAwesomeIcon icon={faDiscord} className="h-5 w-5" />
                        </a>
                      )}
                      {user.social.twitch && (
                        <a
                          href={user.social.twitch}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-110"
                          aria-label="Twitch"
                          title="Twitch"
                        >
                          <FontAwesomeIcon icon={faTwitch} className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  )}

                  {user.profile?.bio && (
                    <p className="text-sm text-foreground leading-relaxed mb-4">
                      {user.profile.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {isOwnProfile ? (
                  <>
                    <Button variant="outline" className="w-full" size="sm" asChild>
                      <Link href={`/${username}/settings`}>
                        <SettingsIcon className="h-4 w-4 mr-2" />
                        Settings
                      </Link>
                    </Button>
                    <Button className="w-full" size="sm" asChild>
                      <Link href={`/${username}/dashboard`}>Dashboard</Link>
                    </Button>
                  </>
                ) : isAuthenticated ? (
                  <Button
                    variant={isFollowing ? 'outline' : 'default'}
                    className="w-full"
                    size="sm"
                    onClick={handleFollow}
                    disabled={followMutation.isPending || unfollowMutation.isPending || isLoadingFollowStatus}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinusIcon className="h-4 w-4 mr-2" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlusIcon className="h-4 w-4 mr-2" />
                        Follow
                      </>
                    )}
                  </Button>
                ) : (
                  <Button className="w-full" size="sm" asChild>
                    <Link href="/login">Follow</Link>
                  </Button>
                )}
              </div>

              {/* Stats */}
              <div className="space-y-3 border-t pt-6">
                <Link
                  href={`/${username}/posts`}
                  className="flex items-center justify-between hover:text-primary transition-colors group"
                >
                  <span className="text-sm text-muted-foreground">Posts</span>
                  <span className="text-base font-semibold text-foreground group-hover:text-primary">
                    {postsData?.meta?.total ?? 0}
                  </span>
                </Link>
                <Link
                  href={`/${username}/followers`}
                  className="flex items-center justify-between hover:text-primary transition-colors group"
                >
                  <span className="text-sm text-muted-foreground">Followers</span>
                  <span className="text-base font-semibold text-foreground group-hover:text-primary">
                    {userAnalytics?.followersCount ?? user.followersCount ?? 0}
                  </span>
                </Link>
                <Link
                  href={`/${username}/following`}
                  className="flex items-center justify-between hover:text-primary transition-colors group"
                >
                  <span className="text-sm text-muted-foreground">Following</span>
                  <span className="text-base font-semibold text-foreground group-hover:text-primary">
                    {userAnalytics?.followingCount ?? user.followingCount ?? 0}
                  </span>
                </Link>
                <Link
                  href={`/${username}/videos`}
                  className="flex items-center justify-between hover:text-primary transition-colors group"
                >
                  <span className="text-sm text-muted-foreground">Videos</span>
                  <span className="text-base font-semibold text-foreground group-hover:text-primary">
                    {videosData?.meta?.total ?? 0}
                  </span>
                </Link>
              </div>

              {/* Profile Details */}
              {(user.profile?.location || user.profile?.website || user.dateCreated) && (
                <div className="space-y-2 text-sm border-t pt-6">
                  {user.profile?.location && (
                    <div className="text-muted-foreground">{user.profile.location}</div>
                  )}
                  {user.profile?.website && (
                    <a
                      href={user.profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline block"
                    >
                      {user.profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  )}

                  {user.dateCreated && (
                    <div className="text-muted-foreground">
                      Joined {new Date(user.dateCreated).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                      })}
                    </div>
                  )}
                </div>
              )}
            </aside>

            {/* Right Content Area */}
            <div className="flex-1 min-w-0 w-full lg:min-w-0 lg:max-w-full overflow-x-hidden lg:overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:bg-transparent">
              {/* Content Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-full">
                <div className="border-b mb-6">
                  <TabsList className="h-auto p-0 bg-transparent w-full justify-start">
                    <TabsTrigger value="posts" className="px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none">
                      Posts {postsData?.meta?.total ? `(${postsData.meta.total})` : ''}
                    </TabsTrigger>
                    {isAuthenticated && (
                      <>
                        <TabsTrigger value="comments" className="px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none">
                          Comments {totalCommentsCount > 0 ? `(${totalCommentsCount})` : ''}
                        </TabsTrigger>
                        <TabsTrigger value="shares" className="px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none">
                          Shares {sharedPostsData?.meta?.total ? `(${sharedPostsData.meta.total})` : ''}
                        </TabsTrigger>
                      </>
                    )}
                    <TabsTrigger value="photos" className="px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none">
                      Photos {photosData?.meta?.total ? `(${photosData.meta.total})` : ''}
                    </TabsTrigger>
                    <TabsTrigger value="videos" className="px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none">
                      Videos {videosData?.meta?.total ? `(${videosData.meta.total})` : ''}
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Posts Tab */}
                <TabsContent value="posts" className="mt-0">
                  {postsData && postsData.data.length > 0 ? (
                    <div className="space-y-6">
                      {postsData.data
                        .sort((a, b) => {
                          // Pinned posts first
                          if (a.isPinned && !b.isPinned) return -1;
                          if (!a.isPinned && b.isPinned) return 1;
                          // Then by date (newest first)
                          return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
                        })
                        .slice(0, 10)
                        .map((post) => (
                          <PostCard key={post.id} post={post} />
                        ))}
                      {postsData.data.length > 10 && (
                        <div className="pt-6 text-center">
                          <Button variant="outline" asChild>
                            <Link href={`/${username}/posts`}>View all posts →</Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<MessageCircleIcon className="h-10 w-10 text-muted-foreground" />}
                      title="No posts yet"
                      description={
                        isOwnProfile
                          ? 'Start sharing your thoughts and upload your first post!'
                          : `${user.displayName || user.username} hasn't posted anything yet.`
                      }
                      action={
                        isOwnProfile
                          ? {
                              label: 'Create Your First Post',
                              onClick: () => router.push(`/${username}/posts`),
                            }
                          : undefined
                      }
                    />
                  )}
                </TabsContent>

                {/* Comments Tab - Only visible when authenticated */}
                {isAuthenticated && (
                  <TabsContent value="comments" className="mt-0">
                    <CommentsTab userId={user?.id} username={username} />
                  </TabsContent>
                )}

                {/* Shares Tab - Only visible when authenticated */}
                {isAuthenticated && (
                  <TabsContent value="shares" className="mt-0">
                    {isOwnProfile ? (
                      isLoadingSharedPosts ? (
                        <div className="py-20 text-center">
                          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
                          <p className="text-muted-foreground">Loading shared posts...</p>
                        </div>
                      ) : sharedPostsData && sharedPostsData.data.length > 0 ? (
                        <div className="space-y-6">
                          {sharedPostsData.data.map((post) => (
                            <PostCard key={post.id} post={post} />
                          ))}
                        </div>
                      ) : (
                        <div className="py-20 text-center">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                            <ShareIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <h3 className="text-xl font-semibold mb-2 text-foreground">No shared posts yet</h3>
                          <p className="text-muted-foreground">Posts you share will appear here</p>
                        </div>
                      )
                    ) : (
                      <div className="py-20 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                          <ShareIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-foreground">Shares</h3>
                        <p className="text-muted-foreground">Only you can see your shared posts</p>
                      </div>
                    )}
                  </TabsContent>
                )}

                {/* Photos Tab */}
                <TabsContent value="photos" className="mt-0">
                  {(() => {
                    if (isLoadingPhotos) {
                      return (
                        <div className="py-20 text-center">
                          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                          <p className="text-muted-foreground">Loading photos...</p>
                        </div>
                      );
                    }

                    if (!photosData || !photosData.data || photosData.data.length === 0) {
                      return (
                        <div className="py-20 text-center">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <h3 className="text-xl font-semibold mb-2 text-foreground">No photos</h3>
                          <p className="text-muted-foreground">
                            {isOwnProfile
                              ? 'Start uploading photos to share with your audience!'
                              : `${user.displayName || user.username} hasn't uploaded any photos yet.`}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-3 gap-2">
                        {photosData.data.map((photo) => (
                          <Link
                            key={photo.id}
                            href={`/${username}/photos/${getPhotoSlug(photo)}`}
                            className="relative aspect-square rounded overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <Image
                              src={photo.imageUrl}
                              alt={photo.title}
                              fill
                              sizes="(max-width: 640px) 33vw, (max-width: 1024px) 33vw, 33vw"
                              className="object-cover"
                            />
                          </Link>
                        ))}
                      </div>
                    );
                  })()}
                </TabsContent>

                {/* Videos Tab */}
                <TabsContent value="videos" className="mt-0">
                  {(() => {
                    if (isLoadingVideos) {
                      return (
                        <div className="py-20 text-center">
                          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
                          <p className="text-muted-foreground">Loading videos...</p>
                </div>
                      );
                    }

                    const videos = videosListData?.data || [];
                    const totalVideos = videosListData?.meta?.total || 0;

                    if (videos.length === 0) {
                      return (
                        <div className="py-20 text-center">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                            <VideoIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <h3 className="text-xl font-semibold mb-2 text-foreground">No videos</h3>
                          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                            {isOwnProfile
                              ? 'Start sharing your videos!'
                              : `${user.displayName || user.username} hasn't uploaded any videos yet.`}
                          </p>
                          {isOwnProfile && (
                            <Button asChild>
                              <Link href={`/${username}/videos`}>
                                <VideoIcon className="h-4 w-4 mr-2" />
                                Upload Your First Video
                              </Link>
                            </Button>
                          )}
                        </div>
                      );
                    }

                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                          {videos.map((video) => (
                            <VideoCard key={video.id} video={video} isOwnVideo={isOwnProfile} />
                          ))}
                        </div>
                        {totalVideos > videos.length && (
                          <div className="text-center">
                            <Button asChild variant="outline">
                              <Link href={`/${username}/videos`}>
                                <VideoIcon className="h-4 w-4 mr-2" />
                                View All {totalVideos} Videos
                              </Link>
                            </Button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}

// Comments Tab Component - Shows comments made on user's posts (only comments, not posts)
function CommentsTab({ userId, username }: { userId?: string; username: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  // Fetch user's posts
  const { data: postsData, isLoading: isLoadingPosts } = useQuery({
    queryKey: ['posts', 'user', userId],
    queryFn: () => postsService.getByUser(userId!, { page: 1, limit: 100 }),
    enabled: !!userId,
  });

  // Fetch comments for all posts (don't filter by analytics - fetch and filter by actual data)
  // This ensures we get comments even if analytics are stale or not calculated
  const commentsQueries = useQueries({
    queries: (postsData?.data || []).map((post: Post) => ({
      queryKey: ['posts', post.id, 'comments', 'tab'],
      queryFn: async () => {
        try {
          // Try to fetch comments - if there are none, the API will return empty array
          // Fetch first page to check if comments exist
          const firstPage = await postsService.getComments(post.id, { page: 1, limit: 1 });

          // If no comments on first page, return empty
          if (!firstPage.data || firstPage.data.length === 0) {
            return {
              data: [],
              meta: {
                page: 1,
                limit: 0,
                total: 0,
                totalPages: 0,
              },
            };
          }

          // If comments exist, fetch all comments by paginating
          const allComments: Comment[] = [];
          let page = 1;
          let hasMore = true;
          const limit = 100; // Maximum allowed by backend

          while (hasMore) {
            const response = await postsService.getComments(post.id, { page, limit });
            allComments.push(...response.data);

            // Check if there are more pages
            const totalPages = response.meta?.totalPages || 1;
            hasMore = response.data.length === limit && page < totalPages;
            page++;

            // Safety limit: don't fetch more than 10 pages (1000 comments max per post)
            if (page > 10) break;
          }

          return {
            data: allComments,
            meta: {
              page: 1,
              limit: allComments.length,
              total: allComments.length,
              totalPages: 1,
            },
          };
        } catch (error) {
          // If error (e.g., post doesn't exist or comments disabled), return empty
          return {
            data: [],
            meta: {
              page: 1,
              limit: 0,
              total: 0,
              totalPages: 0,
            },
          };
        }
      },
      enabled: !!post.id && !!postsData?.data && postsData.data.length > 0,
      retry: false, // Don't retry if comments are disabled or post doesn't exist
    })),
  });

  // Flatten all parent comments (top-level only, no replies) from all posts into a single array
  // Comments use resourceId and resourceType, not postId
  const allComments = useMemo(() => {
    const comments: Comment[] = [];
    commentsQueries.forEach((query) => {
      if (query.data?.data) {
        // Only include top-level comments (no parentCommentId)
        query.data.data.forEach((comment: Comment) => {
          // Only add if it's a parent comment (no parentCommentId) and it's for a post
          if (!comment.parentCommentId && comment.resourceType === 'post') {
            // Add postId for easier lookup (map resourceId to postId)
            const commentWithPostId = {
              ...comment,
              postId: comment.resourceId, // Map resourceId to postId for compatibility
            };
            comments.push(commentWithPostId);
          }
        });
      }
    });
    // Sort by date created (newest first)
    return comments.sort((a, b) =>
      new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
    );
  }, [commentsQueries]);

  const isLoadingComments = commentsQueries.some((query) => query.isLoading);

  // Like/Unlike comment mutation
  const likeCommentMutation = useMutation({
    mutationFn: (commentId: string) => {
      // Find comment to check if liked
      const comment = allComments.find((c) => c.id === commentId);
      if (comment?.isLiked) {
        return postsService.unlikeComment(commentId);
      } else {
        return postsService.likeComment(commentId);
      }
    },
    onSuccess: () => {
      // Invalidate all comment queries
      commentsQueries.forEach((query) => {
        if (query.data?.data) {
          query.data.data.forEach((comment: Comment) => {
            // Use resourceId (which is the postId) for comments
            const postId = comment.resourceId || (comment as any).postId;
            if (postId) {
              queryClient.invalidateQueries({ queryKey: ['posts', postId, 'comments'] });
              queryClient.invalidateQueries({ queryKey: ['posts', postId, 'comments', 'tab'] });
            }
          });
        }
      });
      // Also invalidate analytics to refresh comment counts
      postsData?.data.forEach((post: Post) => {
        queryClient.invalidateQueries({ queryKey: ['postAnalytics', post.id] });
      });
    },
  });

  const handleLikeComment = (commentId: string) => {
    if (!isAuthenticated || likeCommentMutation.isPending) return;
    likeCommentMutation.mutate(commentId);
  };

  const handleViewComment = (comment: Comment) => {
    // Comments use resourceId (which is the postId) instead of postId field
    const postId = comment.resourceId || (comment as any).postId;
    const post = postsData?.data.find((p: Post) => p.id === postId);
    if (post?.user?.username) {
      router.push(`/${post.user.username}/posts/comment/${comment.id}?postId=${post.id}`);
    }
  };

  // Get post info for each comment
  const getPostForComment = (comment: Comment) => {
    // Comments use resourceId (which is the postId) instead of postId field
    const postId = comment.resourceId || (comment as any).postId;
    return postsData?.data.find((post: Post) => post.id === postId);
  };

  if (isLoadingPosts || isLoadingComments) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading comments...</p>
      </div>
    );
  }

  if (allComments.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
          <MessageCircleIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2 text-foreground">No comments yet</h3>
        <p className="text-muted-foreground">Comments made on {username}&apos;s posts will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          {allComments.length} {allComments.length === 1 ? 'comment' : 'comments'} on {username}&apos;s posts
        </p>
      </div>

      <div className="space-y-6">
        {allComments.map((comment) => {
          const post = getPostForComment(comment);
          if (!post) return null;

          return (
            <Card key={comment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                {/* Post Context */}
                <div className="mb-4 pb-4 border-b border-border/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link
                      href={`/${username}/posts/${post.id}`}
                      className="hover:text-primary transition-colors"
                    >
                      <span className="font-medium">Post:</span> {post.content ? post.content.slice(0, 100) : 'View post'}
                      {post.content && post.content.length > 100 && '...'}
                    </Link>
                  </div>
                </div>

                {/* Comment Card */}
                <div className="flex gap-3">
                  <Link href={`/${comment.user?.username || ''}`} className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden">
                      {comment.user?.profile?.avatar ? (
                        <Image
                          src={comment.user.profile.avatar}
                          alt={comment.user.displayName || comment.user.username}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-bold text-primary">
                          {(comment.user?.displayName || comment.user?.username || 'U')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <Link href={`/${comment.user?.username || ''}`}>
                          <p className="text-sm font-semibold text-foreground hover:text-primary">
                            {comment.user?.displayName || comment.user?.username || 'Unknown'}
                          </p>
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(comment.dateCreated)}
                          {comment.isEdited && ' · Edited'}
                        </p>
                      </div>
                    </div>
                    <p
                      className="text-sm whitespace-pre-wrap break-words mb-2 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleViewComment(comment)}
                    >
                      {comment.content}
                    </p>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1 text-xs text-muted-foreground hover:text-red-500"
                        onClick={() => handleLikeComment(comment.id)}
                        disabled={!isAuthenticated || likeCommentMutation.isPending}
                      >
                        <HeartIcon
                          className={`h-3.5 w-3.5 mr-1 ${comment.isLiked ? 'fill-red-500 text-red-500' : ''}`}
                        />
                        <span>{comment.likesCount || 0}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function UserProfilePage() {
  return (
    <RouteErrorBoundary>
      <UserProfilePageContent />
    </RouteErrorBoundary>
  );
}


