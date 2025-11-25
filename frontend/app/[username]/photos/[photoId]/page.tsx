'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { photosService } from '@/core/api/users/photos';
import { trackingService } from '@/core/api/data/tracking';
import { userService } from '@/core/api/users/user';
import { analyticsService } from '@/core/api/data/analytics';
import { useQueryClient } from '@tanstack/react-query';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { Card, CardContent } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  Loader2,
  EyeIcon,
  GlobeIcon,
  LockIcon,
  UserIcon,
  HeartIcon,
  MessageCircleIcon,
  ShareIcon,
  ImageIcon,
  FlagIcon,
} from 'lucide-react';
import { formatTimeAgo } from '@/theme/components/videos/utils';
import { useAuth } from '@/core/hooks/useAuth';
import { PhotoComments } from '@/theme/components/photos/PhotoComments';
import { getPhotoSlug } from '@/core/utils/slug';
import { Reports } from '@/theme/components/social/Reports';

function PhotoDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const photoSlug = params.photoId as string; // This is a SLUG from the URL (for SEO)
  const username = params.username as string;
  const { isAuthenticated, user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const hasTrackedView = useRef(false);
  const hasInitializedLikeStatus = useRef(false);
  const hasInitializedAnalytics = useRef(false);
  const previousPhotoId = useRef<string | null>(null);
  const [currentPhotoId, setCurrentPhotoId] = useState<string | null>(null);

  // Fetch user to get their ID
  const { data: user } = useQuery({
    queryKey: ['user', 'profile', username],
    queryFn: () => userService.getByUsername(username),
    enabled: !!username,
  });

  // Find photo UUID from slug by checking React Query cache for user's photos
  const findPhotoIdFromSlug = (slug: string): string | null => {
    if (!user?.id) return null;
    
    // Check cache for user's photos - look for any cached photo list
    const cacheKeys = queryClient.getQueryCache().getAll();
    for (const query of cacheKeys) {
      const queryKey = query.queryKey;
      if (queryKey[0] === 'photos' && queryKey[1] === 'user' && queryKey[2] === user.id) {
        const cachedData = query.state.data as { data?: any[] } | undefined;
        if (cachedData?.data) {
          const foundPhoto = cachedData.data.find(
            (p: any) => getPhotoSlug(p) === slug
          );
          if (foundPhoto) return foundPhoto.id;
        }
      }
    }
    return null;
  };

  // Always fetch user's photos to resolve slug (needed on page refresh when cache is empty)
  // Note: Using limit 100 (max allowed by backend) - if user has more photos, we'll need to paginate
  const { data: userPhotosData, isLoading: isLoadingUserPhotos } = useQuery({
    queryKey: ['photos', 'user', user?.id, 'slug-resolve'],
    queryFn: () => photosService.getByUser(user!.id, { page: 1, limit: 100 }),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Get photo UUID from slug - check cache first, then use fetched data
  const resolvedPhotoId = useMemo(() => {
    // First try cache
    const cachedId = findPhotoIdFromSlug(photoSlug);
    if (cachedId) return cachedId;
    
    // If not in cache but we have fetched data, search in it
    if (userPhotosData?.data) {
      const foundPhoto = userPhotosData.data.find(
        (p) => getPhotoSlug(p) === photoSlug
      );
      if (foundPhoto) return foundPhoto.id;
    }
    
    return null;
  }, [photoSlug, user?.id, userPhotosData]);
  
  // Use currentPhotoId if set (from clicking related photo), otherwise use resolved ID
  const photoId = currentPhotoId || resolvedPhotoId;

  // Fetch photo by UUID (backend only accepts UUIDs, not slugs)
  // Wait for slug resolution to complete before fetching
  const { data: photo, isLoading, error } = useQuery({
    queryKey: ['photos', photoId],
    queryFn: () => photosService.getById(photoId!),
    enabled: !!photoId && !isLoadingUserPhotos, // Don't fetch until slug is resolved
  });

  // Reset currentPhotoId when slug changes (user navigated via URL)
  useEffect(() => {
    if (resolvedPhotoId && resolvedPhotoId !== currentPhotoId) {
      setCurrentPhotoId(null);
      hasTrackedView.current = false; // Reset view tracking for new photo
      // Reset initialization flags when photo changes
      hasInitializedLikeStatus.current = false;
      hasInitializedAnalytics.current = false;
    }
  }, [photoSlug, resolvedPhotoId]);

  // Fetch photo analytics for accurate counts
  // Force recalculation if analytics don't exist (for new photos)
  const { data: photoAnalytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['photoAnalytics', photo?.id],
    queryFn: async () => {
      try {
        return await analyticsService.getPhotoAnalytics(photo!.id, false);
      } catch (error: any) {
        // If analytics don't exist, force calculation
        if (error?.response?.status === 404) {
          return await analyticsService.getPhotoAnalytics(photo!.id, true);
        }
        throw error;
      }
    },
    enabled: !!photo?.id,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Check if photo is liked
  const { data: likeStatus } = useQuery({
    queryKey: ['photo', 'like', 'status', photo?.id],
    queryFn: () => photosService.checkLikeStatus(photo!.id),
    enabled: !!photo?.id && isAuthenticated,
  });

  // Check if photo is shared
  const { data: shareStatus } = useQuery({
    queryKey: ['photo', 'share', 'status', photo?.id],
    queryFn: () => photosService.checkShareStatus(photo!.id),
    enabled: !!photo?.id && isAuthenticated,
  });

  // Initialize state from photo data and analytics
  const [isLiked, setIsLiked] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [sharesCount, setSharesCount] = useState(0);
  const [showComments, setShowComments] = useState(false); // Comments closed by default

  // Declare share status initialization ref (needed before useEffect)
  const hasInitializedShareStatus = useRef(false);

  // Reset initialization flags when photo ID changes
  useEffect(() => {
    if (photo?.id && photo.id !== previousPhotoId.current) {
      // Photo changed, reset initialization flags
      hasInitializedLikeStatus.current = false;
      hasInitializedAnalytics.current = false;
      hasInitializedShareStatus.current = false;
      previousPhotoId.current = photo.id;
      // Reset counts to 0 initially
      setLikesCount(0);
      setCommentsCount(0);
      setSharesCount(0);
      setIsLiked(false);
      setIsShared(false);
    }
  }, [photo?.id]);

  // Sync state with like status when it becomes available
  useEffect(() => {
    if (likeStatus !== undefined && !hasInitializedLikeStatus.current) {
      setIsLiked(likeStatus.isLiked);
      hasInitializedLikeStatus.current = true;
    }
  }, [likeStatus]);

  // Sync state with share status when it becomes available
  useEffect(() => {
    if (shareStatus !== undefined && !hasInitializedShareStatus.current) {
      setIsShared(shareStatus.shared);
      hasInitializedShareStatus.current = true;
    }
  }, [shareStatus]);

  // Sync state with analytics when it becomes available
  useEffect(() => {
    if (!photo?.id) return;
    
    // Only initialize once per photo, and only when analytics are loaded (not loading)
    if (photoAnalytics !== undefined && !isLoadingAnalytics && !hasInitializedAnalytics.current) {
      // Use analytics if available
      setLikesCount(photoAnalytics.likesCount ?? 0);
      setCommentsCount(photoAnalytics.commentsCount ?? 0);
      setSharesCount(photoAnalytics.sharesCount ?? 0);
      hasInitializedAnalytics.current = true;
    }
  }, [photoAnalytics, photo?.id, isLoadingAnalytics]);

  // Fetch author profile for avatar and additional info
  const authorId = photo?.userId || photo?.user?.id;
  const { data: authorProfile } = useQuery({
    queryKey: ['user', 'profile', authorId],
    queryFn: () => userService.getById(authorId!),
    enabled: !!authorId && !photo?.user?.profile?.avatar,
  });

  // Fetch related photos (other photos by same user)
  const { data: relatedPhotosData } = useQuery({
    queryKey: ['photos', 'user', authorId, 'related', photo?.id],
    queryFn: () => photosService.getByUser(authorId!, { page: 1, limit: 6 }),
    enabled: !!authorId && !!photo,
  });

  // Filter out current photo from related photos
  const relatedPhotos = relatedPhotosData?.data?.filter((p) => p.id !== photo?.id).slice(0, 5) || [];

  // Track photo view when page loads (for both authenticated and unauthenticated users)
  useEffect(() => {
    if (photo && !hasTrackedView.current) {
      trackingService.trackPhotoView(photo.id).then(() => {
        // Invalidate photo queries to refresh view counts
        queryClient.invalidateQueries({ queryKey: ['photos'] });
        queryClient.invalidateQueries({ queryKey: ['photoAnalytics', photo.id] });
      }).catch(() => {
        // Silently fail view tracking
      });
      hasTrackedView.current = true;
    }
  }, [photo, queryClient]);

  // Verify username matches photo owner
  useEffect(() => {
    if (photo?.user?.username && photo.user.username !== username) {
      router.replace(`/${photo.user.username}/photos/${getPhotoSlug(photo)}`);
    }
  }, [photo, username, router]);

  // Like/Unlike mutation - must be before early returns
  const likeMutation = useMutation({
    mutationFn: async (shouldLike: boolean) => {
      if (!photo?.id) throw new Error('Photo ID not available');
      if (shouldLike) {
        return await photosService.like(photo.id);
      } else {
        return await photosService.unlike(photo.id);
      }
    },
    onSuccess: async (response) => {
      if (!photo?.id) return;
      
      // Update state immediately - this is the source of truth
      setIsLiked(response.liked);
      
      // Update like status cache immediately with the correct structure
      queryClient.setQueryData(['photo', 'like', 'status', photo.id], {
        isLiked: response.liked,
      });
      
      // Mark as initialized so useEffect doesn't overwrite
      hasInitializedLikeStatus.current = true;
      
      // Fetch updated analytics
      try {
        const analytics = await analyticsService.getPhotoAnalytics(photo.id, true);
        setLikesCount(analytics.likesCount);
        setCommentsCount(analytics.commentsCount);
        setSharesCount(analytics.sharesCount);
        queryClient.setQueryData(['photoAnalytics', photo.id], analytics);
      } catch (error) {
        // Fallback to optimistic update
        setLikesCount((prev) => (response.liked ? prev + 1 : Math.max(0, prev - 1)));
      }

      // Invalidate and refetch like status in background (don't await to avoid blocking)
      queryClient.invalidateQueries({ queryKey: ['photo', 'like', 'status', photo.id] });
      queryClient.refetchQueries({ queryKey: ['photo', 'like', 'status', photo.id] });
      
      // Invalidate other queries
      queryClient.invalidateQueries({ queryKey: ['photos', photo.id] });
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      queryClient.invalidateQueries({ queryKey: ['photos', 'user'] }); // Invalidate photos list to update cards
      queryClient.invalidateQueries({ queryKey: ['photos', 'user'] }); // Invalidate photos list to update cards
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
      if (!photo?.id) throw new Error('Photo ID not available');
      if (shouldShare) {
        return await photosService.share(photo.id);
      } else {
        return await photosService.unshare(photo.id);
      }
    },
    onSuccess: async (response, shouldShare) => {
      if (!photo?.id) return;
      
      // Update state immediately
      setIsShared(shouldShare);
      
      // Update share status cache immediately
      queryClient.setQueryData(['photo', 'share', 'status', photo.id], {
        shared: shouldShare,
      });
      
      // Mark as initialized so useEffect doesn't overwrite
      hasInitializedShareStatus.current = true;
      
      // Fetch updated analytics
      try {
        const analytics = await analyticsService.getPhotoAnalytics(photo.id, true);
        setSharesCount(analytics.sharesCount);
        setLikesCount(analytics.likesCount);
        setCommentsCount(analytics.commentsCount);
        queryClient.setQueryData(['photoAnalytics', photo.id], analytics);
      } catch (error) {
        // Fallback to optimistic update
        setSharesCount((prev) => (shouldShare ? prev + 1 : Math.max(0, prev - 1)));
      }
      
      queryClient.invalidateQueries({ queryKey: ['photos', photo.id] });
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      queryClient.invalidateQueries({ queryKey: ['photos', 'user'] }); // Invalidate photos list to update cards
      queryClient.invalidateQueries({ queryKey: ['photos', 'shared'] }); // Invalidate shared photos to update the column
      
      // Invalidate and refetch share status in background
      queryClient.invalidateQueries({ queryKey: ['photo', 'share', 'status', photo.id] });
      queryClient.refetchQueries({ queryKey: ['photo', 'share', 'status', photo.id] });
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
    if (photo?.id) {
      queryClient.invalidateQueries({ queryKey: ['photoAnalytics', photo.id] });
      queryClient.invalidateQueries({ queryKey: ['photos', 'user'] }); // Invalidate photos list to update cards
    }
    setCommentsCount((prev) => prev + 1);
  };

  // Early returns must come AFTER all hooks
  // Show loading while resolving slug or fetching photo
  if (isLoadingUserPhotos || (isLoading && photoId)) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading photo...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If we couldn't resolve the photoId from the slug (after loading user photos), show not found
  if (!photoId && !isLoadingUserPhotos && userPhotosData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Photo Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The photo you&apos;re looking for doesn&apos;t exist or may have been deleted.
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

  // Show error if we have a photoId but the fetch failed
  if (error || (!photo && photoId && !isLoading)) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Photo Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The photo you&apos;re looking for doesn&apos;t exist or may have been deleted.
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

  // Final safety check - if photo is still undefined, show loading or error
  if (!photo) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading photo...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use photo.user if available, otherwise fall back to username from URL
  const author = photo.user || authorProfile;
  const displayName = author?.displayName || author?.username || username || 'Unknown';
  const authorUsername = author?.username || username;
  const avatarUrl = author?.profile?.avatar || author?.user?.profile?.avatar;
  const isOwnPhoto = currentUser?.id === photo.userId;

  return (
    <div className="w-full bg-background pt-16">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Photo Display - Full width */}
          <div className="w-full bg-black rounded-lg overflow-hidden flex items-center justify-center min-h-[400px]">
            {photo.imageUrl ? (
              <Image
                src={photo.imageUrl}
                alt={photo.title}
                width={photo.width || 1200}
                height={photo.height || 800}
                className="w-full h-auto max-h-[80vh] object-contain"
                unoptimized
                priority
              />
            ) : (
              <div className="w-full h-96 flex items-center justify-center">
                <ImageIcon className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>
          
          {/* Photo Info Container with padding */}
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            {/* Photo Info */}
            <div className="mt-4 space-y-4">
            {/* Title */}
            <h1 className="text-xl font-semibold text-foreground leading-tight">
              {photo.title}
            </h1>

            {/* Action Bar */}
            <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-border/50">
              {/* Views and Date */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="font-medium">{(photoAnalytics?.viewsCount ?? photo.viewsCount ?? 0).toLocaleString()} views</span>
                <span>•</span>
                <span>{formatTimeAgo(photo.dateCreated)}</span>
                {photo.width > 0 && photo.height > 0 && (
                  <>
                    <span>•</span>
                    <span>{photo.width} × {photo.height}</span>
                  </>
                )}
              </div>

              {/* Interaction Buttons */}
              <div className="flex items-center gap-2" role="group" aria-label="Photo interactions">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  disabled={!isAuthenticated || likeMutation.isPending}
                  aria-label={isLiked ? `Unlike photo (${likesCount.toLocaleString()} likes)` : `Like photo (${likesCount.toLocaleString()} likes)`}
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
                  aria-label={isShared ? `Unshare photo (${sharesCount.toLocaleString()} shares)` : `Share photo (${sharesCount.toLocaleString()} shares)`}
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
                {isAuthenticated && !isOwnPhoto && (
                  <Reports
                    resourceType="photo"
                    resourceId={photo.id}
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 rounded-full text-foreground hover:bg-muted"
                        aria-label="Report photo"
                      >
                        <FlagIcon className="h-5 w-5" aria-hidden="true" />
                        <span>Report</span>
                      </Button>
                    }
                  />
                )}
              </div>
            </div>

            {/* Author Info */}
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

            {/* Description */}
            {photo.description && (
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {photo.description}
                </div>
              </div>
            )}

            {/* Tags */}
            {photo.tags && photo.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {photo.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center text-xs font-medium bg-muted text-muted-foreground px-2 py-1 rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Comments Section - Toggleable */}
            {showComments && photo?.id && (
              <div id="comments-section" className="pt-4">
                <PhotoComments 
                  photoId={photo.id} 
                  onCommentAdded={handleCommentAdded}
                />
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Sidebar - Related photos */}
        <div className="lg:w-96 flex-shrink-0 px-4 sm:px-6 lg:px-0 pt-6 lg:pt-0">
          {relatedPhotos.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold mb-4">More from {displayName}</h3>
              {relatedPhotos.map((relatedPhoto) => {
                const isActive = relatedPhoto.id === photo?.id;
                return (
                  <button
                    key={relatedPhoto.id}
                    onClick={() => {
                      // Update URL for SEO and browser history
                      const newSlug = getPhotoSlug(relatedPhoto);
                      router.push(`/${authorUsername}/photos/${newSlug}`, { scroll: false });
                      // Set photo ID directly to trigger immediate re-render
                      setCurrentPhotoId(relatedPhoto.id);
                      // Reset view tracking for new photo
                      hasTrackedView.current = false;
                      // Reset state
                      setIsLiked(false);
                      setLikesCount(0);
                      setCommentsCount(0);
                      setSharesCount(0);
                      setShowComments(false);
                      hasInitializedLikeStatus.current = false;
                      hasInitializedAnalytics.current = false;
                      previousPhotoId.current = null;
                      // Scroll to top smoothly
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`flex gap-3 group w-full text-left ${
                      isActive ? 'opacity-50 cursor-default' : 'hover:bg-muted/50 cursor-pointer'
                    } rounded-lg p-2 transition-colors`}
                    disabled={isActive}
                  >
                    {/* Thumbnail */}
                    <div className="relative flex-shrink-0 w-40 h-24 bg-muted rounded overflow-hidden">
                      {relatedPhoto.imageUrl ? (
                        <Image
                          src={relatedPhoto.imageUrl}
                          alt={relatedPhoto.title}
                          fill
                          className="object-cover"
                          sizes="160px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-1">
                        {relatedPhoto.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {displayName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {relatedPhoto.viewsCount.toLocaleString()} views • {formatTimeAgo(relatedPhoto.dateCreated)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

export default function PhotoDetailPage() {
  return (
    <RouteErrorBoundary>
      <PhotoDetailPageContent />
    </RouteErrorBoundary>
  );
}

