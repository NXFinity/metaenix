'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { videosService } from '@/core/api/users/videos';
import { trackingService } from '@/core/api/data/tracking';
import { userService } from '@/core/api/users/user';
import { analyticsService } from '@/core/api/data/analytics';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { Card, CardContent } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { VideoPlayer } from '@/theme/components/videos/VideoPlayer';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  Loader2,
  UserIcon,
  PlayIcon,
  HeartIcon,
  MessageCircleIcon,
  ShareIcon,
  FlagIcon,
} from 'lucide-react';
import { formatTimeAgo, formatDuration } from '@/theme/components/videos/utils';
import { useAuth } from '@/core/hooks/useAuth';
import { VideoComments } from '@/theme/components/videos/VideoComments';
import { getVideoSlug } from '@/core/utils/slug';
import { Reports } from '@/theme/components/social/Reports';

function VideoDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const videoSlug = params.videoId as string; // This is a SLUG from the URL (for SEO)
  const username = params.username as string;
  const { isAuthenticated, user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const hasTrackedView = useRef(false);

  // Fetch user to get their ID
  const { data: user } = useQuery({
    queryKey: ['user', 'profile', username],
    queryFn: () => userService.getByUsername(username),
    enabled: !!username,
  });

  // Find video UUID from slug by checking React Query cache for user's videos
  // Only use cached data - don't fetch all videos just to find one
  const findVideoIdFromSlug = (slug: string): string | null => {
    if (!user?.id) return null;
    
    // Check cache for user's videos - look for any cached video list
    const cacheKeys = queryClient.getQueryCache().getAll();
    for (const query of cacheKeys) {
      const queryKey = query.queryKey;
      if (queryKey[0] === 'videos' && queryKey[1] === 'user' && queryKey[2] === user.id) {
        const cachedData = query.state.data as { data?: any[] } | undefined;
        if (cachedData?.data) {
          const foundVideo = cachedData.data.find(
            (v: any) => getVideoSlug(v) === slug
          );
          if (foundVideo) return foundVideo.id;
        }
      }
    }
    return null;
  };

  // Get video UUID from slug using cached data only
  const videoId = findVideoIdFromSlug(videoSlug);

  // Fetch video by UUID (backend only accepts UUIDs, not slugs)
  const { data: video, isLoading, error } = useQuery({
    queryKey: ['videos', videoId],
    queryFn: () => videosService.getById(videoId!),
    enabled: !!videoId,
  });

  // Fetch video analytics for accurate counts
  const { data: videoAnalytics } = useQuery({
    queryKey: ['videoAnalytics', video?.id],
    queryFn: () => analyticsService.getVideoAnalytics(video!.id),
    enabled: !!video?.id,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Check if video is liked
  const { data: likeStatus } = useQuery({
    queryKey: ['video', 'like', 'status', video?.id],
    queryFn: () => videosService.checkLikeStatus(video!.id),
    enabled: !!video?.id && isAuthenticated,
  });

  // Check if video is shared
  const { data: shareStatus } = useQuery({
    queryKey: ['video', 'share', 'status', video?.id],
    queryFn: () => videosService.checkShareStatus(video!.id),
    enabled: !!video?.id && isAuthenticated,
  });

  // Initialize state from video data and analytics
  const [isLiked, setIsLiked] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [sharesCount, setSharesCount] = useState(0);
  const [showComments, setShowComments] = useState(false); // Comments closed by default

  // Sync state with like status ONLY on initial load or when likeStatus changes from undefined to defined
  const hasInitializedLikeStatus = useRef(false);
  useEffect(() => {
    if (likeStatus !== undefined && !hasInitializedLikeStatus.current) {
      setIsLiked(likeStatus.isLiked);
      hasInitializedLikeStatus.current = true;
    }
  }, [likeStatus]);

  // Sync state with share status ONLY on initial load or when shareStatus changes from undefined to defined
  const hasInitializedShareStatus = useRef(false);
  useEffect(() => {
    if (shareStatus !== undefined && !hasInitializedShareStatus.current) {
      setIsShared(shareStatus.shared);
      hasInitializedShareStatus.current = true;
    }
  }, [shareStatus]);

  // Sync state with analytics ONLY on initial load
  const hasInitializedAnalytics = useRef(false);
  useEffect(() => {
    if (videoAnalytics !== undefined && !hasInitializedAnalytics.current) {
      setLikesCount(videoAnalytics.likesCount);
      setCommentsCount(videoAnalytics.commentsCount);
      setSharesCount(videoAnalytics.sharesCount);
      hasInitializedAnalytics.current = true;
    }
  }, [videoAnalytics]);

  // Fetch author profile for avatar and additional info
  const authorId = video?.userId || video?.user?.id;
  const { data: authorProfile } = useQuery({
    queryKey: ['user', 'profile', authorId],
    queryFn: () => userService.getById(authorId!),
    enabled: !!authorId && !video?.user?.profile?.avatar,
  });

  // Fetch related videos (other videos by same user)
  const { data: relatedVideosData } = useQuery({
    queryKey: ['videos', 'user', authorId, 'related', video?.id],
    queryFn: () => videosService.getByUser(authorId!, { page: 1, limit: 6 }),
    enabled: !!authorId && !!video,
  });

  // Filter out current video from related videos
  const relatedVideos = relatedVideosData?.data?.filter((v) => v.id !== video?.id).slice(0, 5) || [];

  // Track video view when page loads (for both authenticated and unauthenticated users)
  useEffect(() => {
    if (video && !hasTrackedView.current) {
      trackingService.trackVideoView(video.id).then(() => {
        // Invalidate video queries to refresh view counts
        queryClient.invalidateQueries({ queryKey: ['videos'] });
        queryClient.invalidateQueries({ queryKey: ['videoAnalytics', video.id] });
      }).catch(() => {
        // Silently fail view tracking
      });
      hasTrackedView.current = true;
    }
  }, [video, queryClient]);

  // Verify username matches video owner
  useEffect(() => {
    if (video?.user?.username && video.user.username !== username) {
      router.replace(`/${video.user.username}/videos/${getVideoSlug(video)}`);
    }
  }, [video, username, router]);

  // Like/Unlike mutation - must be before early returns
  const likeMutation = useMutation({
    mutationFn: async (shouldLike: boolean) => {
      if (!video?.id) throw new Error('Video ID not available');
      if (shouldLike) {
        return await videosService.like(video.id);
      } else {
        return await videosService.unlike(video.id);
      }
    },
    onSuccess: async (response) => {
      if (!video?.id) return;
      
      // Update state immediately - this is the source of truth
      setIsLiked(response.liked);
      
      // Update like status cache immediately with the correct structure
      queryClient.setQueryData(['video', 'like', 'status', video.id], {
        isLiked: response.liked,
      });
      
      // Mark as initialized so useEffect doesn't overwrite
      hasInitializedLikeStatus.current = true;
      
      // Fetch updated analytics
      try {
        const analytics = await analyticsService.getVideoAnalytics(video.id, true);
        setLikesCount(analytics.likesCount);
        setCommentsCount(analytics.commentsCount);
        setSharesCount(analytics.sharesCount);
        queryClient.setQueryData(['videoAnalytics', video.id], analytics);
      } catch (error) {
        // Fallback to optimistic update
        setLikesCount((prev) => (response.liked ? prev + 1 : Math.max(0, prev - 1)));
      }

      // Invalidate and refetch like status in background (don't await to avoid blocking)
      queryClient.invalidateQueries({ queryKey: ['video', 'like', 'status', video.id] });
      queryClient.refetchQueries({ queryKey: ['video', 'like', 'status', video.id] });
      
      // Invalidate other queries
      queryClient.invalidateQueries({ queryKey: ['videos', video.id] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
    onError: (error: any, shouldLike) => {
      // Handle errors gracefully
      if (error?.response?.status === 400 && error?.response?.data?.message === 'Already liked') {
        setIsLiked(true);
        return;
      }
      if (error?.response?.status === 404 && shouldLike === false) {
        setIsLiked(false);
        return;
      }
      setIsLiked(!shouldLike);
      setLikesCount((prev) => (shouldLike ? Math.max(0, prev - 1) : prev + 1));
    },
  });

  const handleLike = () => {
    if (!isAuthenticated || likeMutation.isPending) return;
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikesCount((prev) => (newLikedState ? prev + 1 : Math.max(0, prev - 1)));
    likeMutation.mutate(newLikedState);
  };

  // Share/Unshare mutation - must be before early returns
  const shareMutation = useMutation({
    mutationFn: async (shouldShare: boolean) => {
      if (!video?.id) throw new Error('Video ID not available');
      if (shouldShare) {
        return await videosService.share(video.id);
      } else {
        return await videosService.unshare(video.id);
      }
    },
    onSuccess: async (response, shouldShare) => {
      if (!video?.id) return;
      
      // Update state immediately
      setIsShared(shouldShare);
      
      // Update share status cache immediately
      queryClient.setQueryData(['video', 'share', 'status', video.id], {
        shared: shouldShare,
      });
      
      // Mark as initialized so useEffect doesn't overwrite
      hasInitializedShareStatus.current = true;
      
      // Fetch updated analytics
      try {
        const analytics = await analyticsService.getVideoAnalytics(video.id, true);
        setSharesCount(analytics.sharesCount);
        setLikesCount(analytics.likesCount);
        setCommentsCount(analytics.commentsCount);
        queryClient.setQueryData(['videoAnalytics', video.id], analytics);
      } catch (error) {
        // Fallback to optimistic update
        setSharesCount((prev) => (shouldShare ? prev + 1 : Math.max(0, prev - 1)));
      }
      
      queryClient.invalidateQueries({ queryKey: ['videos', video.id] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['videos', 'user'] }); // Invalidate videos list to update cards
      queryClient.invalidateQueries({ queryKey: ['videos', 'shared'] }); // Invalidate shared videos to update the column
      
      // Invalidate and refetch share status in background
      queryClient.invalidateQueries({ queryKey: ['video', 'share', 'status', video.id] });
      queryClient.refetchQueries({ queryKey: ['video', 'share', 'status', video.id] });
    },
    onError: (error: any, shouldShare) => {
      // Handle errors gracefully - revert optimistic update
      setIsShared(!shouldShare);
      setSharesCount((prev) => (shouldShare ? Math.max(0, prev - 1) : prev + 1));
    },
  });

  const handleShare = () => {
    if (!isAuthenticated || shareMutation.isPending) return;
    const newSharedState = !isShared;
    setIsShared(newSharedState);
    setSharesCount((prev) => (newSharedState ? prev + 1 : Math.max(0, prev - 1)));
    shareMutation.mutate(newSharedState);
  };

  const handleCommentAdded = () => {
    // Refetch analytics after comment is added
    if (video?.id) {
      queryClient.invalidateQueries({ queryKey: ['videoAnalytics', video.id] });
    }
    setCommentsCount((prev) => prev + 1);
  };

  // Early returns must come AFTER all hooks
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading video...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Video Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The video you&apos;re looking for doesn&apos;t exist or may have been deleted.
            </p>
            <Button onClick={() => router.back()}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use video.user if available, otherwise fall back to username from URL
  const author = video.user || authorProfile;
  const displayName = author?.displayName || author?.username || username || 'Unknown';
  const authorUsername = author?.username || username;
  const avatarUrl = author?.profile?.avatar || author?.user?.profile?.avatar;
  const isOwnVideo = currentUser?.id === video.userId;

  return (
    <div className="w-full bg-background pt-16">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content - YouTube style */}
        <div className="flex-1 min-w-0">
          {/* Video Player - Full width, edge-to-edge */}
          <div className="w-full bg-black rounded-lg overflow-hidden">
            <VideoPlayer video={video} autoplay />
          </div>
          
          {/* Video Info Container with padding */}
          <div className="px-4 sm:px-6 lg:px-8 py-6">

            {/* Video Info - Clean YouTube style */}
            <div className="mt-4 space-y-4">
            {/* Title */}
            <h1 className="text-xl font-semibold text-foreground leading-tight">
              {video.title}
            </h1>

            {/* Action Bar - YouTube style */}
            <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-border/50">
              {/* Views and Date */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="font-medium">{(videoAnalytics?.viewsCount ?? video.viewsCount ?? 0).toLocaleString()} views</span>
                <span>•</span>
                <span>{formatTimeAgo(video.dateCreated)}</span>
              </div>

              {/* Interaction Buttons */}
              <div className="flex items-center gap-2" role="group" aria-label="Video interactions">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  disabled={!isAuthenticated || likeMutation.isPending}
                  aria-label={isLiked ? `Unlike video (${likesCount.toLocaleString()} likes)` : `Like video (${likesCount.toLocaleString()} likes)`}
                  aria-pressed={isLiked}
                  className={`gap-2 rounded-full ${
                    isLiked
                      ? 'text-red-500 hover:bg-red-500/10'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <HeartIcon className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} aria-hidden="true" />
                  <span>{likesCount.toLocaleString()}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                  aria-label={`${showComments ? 'Hide' : 'Show'} comments (${commentsCount.toLocaleString()} comments)`}
                  aria-expanded={showComments}
                  className="gap-2 rounded-full text-foreground hover:bg-muted"
                >
                  <MessageCircleIcon className="h-5 w-5" aria-hidden="true" />
                  <span>{commentsCount.toLocaleString()}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  disabled={!isAuthenticated || shareMutation.isPending}
                  aria-label={isShared ? `Unshare video (${sharesCount.toLocaleString()} shares)` : `Share video (${sharesCount.toLocaleString()} shares)`}
                  aria-pressed={isShared}
                  className={`gap-2 rounded-full ${
                    isShared
                      ? 'text-primary hover:bg-primary/10'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <ShareIcon className={`h-5 w-5 ${isShared ? 'fill-current' : ''}`} aria-hidden="true" />
                  <span>{isShared ? 'Unshare' : 'Share'}</span>
                  {sharesCount > 0 && (
                    <span className="ml-1">({sharesCount.toLocaleString()})</span>
                  )}
                </Button>
                {isAuthenticated && !isOwnVideo && (
                  <Reports
                    resourceType="video"
                    resourceId={video.id}
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 rounded-full text-foreground hover:bg-muted"
                        aria-label="Report video"
                      >
                        <FlagIcon className="h-5 w-5" aria-hidden="true" />
                        <span>Report</span>
                      </Button>
                    }
                  />
                )}
              </div>
            </div>

            {/* Channel Info - YouTube style */}
            <div className="flex items-start gap-3 py-4 border-b border-border/50">
              <Link href={`/${authorUsername}`} className="flex-shrink-0">
                {avatarUrl ? (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden">
                    <Image
                      src={avatarUrl}
                      alt={displayName}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-primary" />
                  </div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/${authorUsername}`}>
                  <p className="font-semibold text-foreground hover:text-primary transition-colors">
                    {displayName}
                  </p>
                </Link>
                <p className="text-xs text-muted-foreground">@{authorUsername}</p>
              </div>
            </div>

            {/* Description - YouTube style */}
            {video.description && (
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {video.description}
                </div>
              </div>
            )}

            {/* Comments Section - Toggleable, YouTube style */}
            {showComments && video?.id && (
              <div id="comments-section" className="pt-4">
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-lg font-semibold">
                    {commentsCount.toLocaleString()} {commentsCount === 1 ? 'Comment' : 'Comments'}
                  </h2>
                </div>
                <VideoComments 
                  videoId={video.id} 
                  onCommentAdded={handleCommentAdded}
                />
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Sidebar - YouTube style related videos */}
        <div className="lg:w-96 flex-shrink-0 px-4 sm:px-6 lg:px-0 pt-6 lg:pt-0">
          {relatedVideos.length > 0 && (
            <div className="space-y-2">
              {relatedVideos.map((relatedVideo) => (
                <Link
                  key={relatedVideo.id}
                  href={`/${authorUsername}/videos/${getVideoSlug(relatedVideo)}`}
                  className="flex gap-3 group"
                >
                  {/* Thumbnail */}
                  <div className="relative flex-shrink-0 w-40 h-24 bg-muted rounded overflow-hidden">
                    {relatedVideo.thumbnailUrl ? (
                      <Image
                        src={relatedVideo.thumbnailUrl}
                        alt={relatedVideo.title}
                        fill
                        className="object-cover"
                        sizes="160px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <PlayIcon className="h-6 w-6 text-muted-foreground ml-1" />
                      </div>
                    )}
                    {relatedVideo.duration && (
                      <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">
                        {formatDuration(relatedVideo.duration)}
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-1">
                      {relatedVideo.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {displayName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {relatedVideo.viewsCount.toLocaleString()} views • {formatTimeAgo(relatedVideo.dateCreated)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

export default function VideoDetailPage() {
  return (
    <RouteErrorBoundary>
      <VideoDetailPageContent />
    </RouteErrorBoundary>
  );
}

