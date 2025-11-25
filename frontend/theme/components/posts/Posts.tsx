'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsService } from '@/core/api/users/posts';
import { trackingService } from '@/core/api/data/tracking';
import { analyticsService } from '@/core/api/data/analytics';
import { useAuth } from '@/core/hooks/useAuth';
import { useAlerts } from '@/theme/components/alerts';
import { Card, CardContent, CardHeader } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/theme/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/theme/ui/dialog';
import {
  HeartIcon,
  MessageCircleIcon,
  ShareIcon,
  BookmarkIcon,
  EyeIcon,
  Loader2,
  TrashIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLinkIcon,
  PinIcon,
  ArchiveIcon,
  FlagIcon,
  FolderPlusIcon,
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons';
import type { Post } from '@/core/api/users/posts';
import { Comments } from '../social/Comments';
import { Reports } from '../social/Reports';

// Date formatting helper
const formatTimeAgo = (date: string) => {
  const now = new Date();
  const dateObj = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
};

// Helper function to check if a URL is a video
const isVideoUrl = (url: string): boolean => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.quicktime'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some((ext) => lowerUrl.includes(ext));
};

export interface PostCardProps {
  post: Post;
  showFullContent?: boolean;
  onPostClick?: (post: Post) => void;
  onAddToCollection?: (post: Post) => void;
}

export const PostCard = ({ post, showFullContent = true, onPostClick, onAddToCollection }: PostCardProps) => {
  const router = useRouter();
  const { user: currentUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { showConfirm, showError, showSuccess } = useAlerts();
  const author = post.user;
  const displayName = author?.displayName || author?.username || 'Unknown';
  const avatar = author?.profile?.avatar;
  const hasMedia = post.mediaUrl || (post.mediaUrls && post.mediaUrls.length > 0);

  // Initialize state from post data
  const postIsLiked = post.isLiked ?? false;
  const postIsBookmarked = post.isBookmarked ?? false;
  const [isLiked, setIsLiked] = useState(postIsLiked);
  const [isBookmarked, setIsBookmarked] = useState(postIsBookmarked);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [sharesCount, setSharesCount] = useState(post.sharesCount || 0);
  const [bookmarksCount, setBookmarksCount] = useState(post.bookmarksCount || 0);

  // Comments expand state
  const [showComments, setShowComments] = useState(false);

  // Media modal state
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);

  // Track if view has been tracked (prevents duplicate tracking)
  const hasTrackedView = useRef(false);

  // Fetch post analytics for accurate counts
  const { data: postAnalytics } = useQuery({
    queryKey: ['postAnalytics', post.id],
    queryFn: () => analyticsService.getPostAnalytics(post.id),
    enabled: !!post.id,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Track post view when component mounts (only for public, non-draft posts)
  useEffect(() => {
    // Only track views for public posts that are not drafts, and only once
    if (post.isPublic && !post.isDraft && !hasTrackedView.current) {
      hasTrackedView.current = true;
      // Track view asynchronously (don't block rendering)
      trackingService.trackPostView(post.id).catch(() => {
        // Silently fail view tracking - don't interrupt user experience
      });
    }
  }, [post.id, post.isPublic, post.isDraft]);

  // Sync state with analytics data (preferred) or post data (fallback)
  useEffect(() => {
    const currentPostIsLiked = post.isLiked ?? false;
    const currentPostIsBookmarked = post.isBookmarked ?? false;
    
    // Use analytics data if available, otherwise fall back to post data
    const currentLikesCount = postAnalytics?.likesCount ?? post.likesCount ?? 0;
    const currentCommentsCount = postAnalytics?.commentsCount ?? post.commentsCount ?? 0;
    const currentSharesCount = postAnalytics?.sharesCount ?? post.sharesCount ?? 0;
    const currentBookmarksCount = postAnalytics?.bookmarks ?? post.bookmarksCount ?? 0;

    // Always sync with post data to ensure consistency
    setIsLiked(currentPostIsLiked);
    setIsBookmarked(currentPostIsBookmarked);
    setLikesCount(currentLikesCount);
    setCommentsCount(currentCommentsCount);
    setSharesCount(currentSharesCount);
    setBookmarksCount(currentBookmarksCount);
  }, [post.id, post.isLiked, post.isBookmarked, post.likesCount, post.commentsCount, post.sharesCount, post.bookmarksCount, postAnalytics]);

  // Like/Unlike mutation
  const likeMutation = useMutation({
    mutationFn: async (shouldLike: boolean) => {
      if (shouldLike) {
        return await postsService.like(post.id);
      } else {
        return await postsService.unlike(post.id);
      }
    },
    onSuccess: async (response) => {
      // Update local state immediately
      setIsLiked(response.liked);
      
      // Fetch updated analytics to get accurate count
      try {
        const analytics = await analyticsService.getPostAnalytics(post.id, true);
        setLikesCount(analytics.likesCount);
        setCommentsCount(analytics.commentsCount);
        setSharesCount(analytics.sharesCount);
        
        // Update analytics cache
        queryClient.setQueryData(['postAnalytics', post.id], analytics);
      } catch (error) {
        // Fallback to optimistic update if analytics fetch fails
        setLikesCount((prev) => (response.liked ? prev + 1 : Math.max(0, prev - 1)));
      }

      // Update the post in cache optimistically for all relevant queries
      const updatePostInCache = (oldData: any) => {
        if (!oldData?.data) return oldData;
        return {
          ...oldData,
          data: oldData.data.map((p: any) =>
            p.id === post.id
              ? {
                  ...p,
                  isLiked: response.liked,
                }
              : p
          ),
        };
      };

      // Update single post cache
      queryClient.setQueryData(['posts', post.id], (oldPost: any) => {
        if (!oldPost) return oldPost;
        return {
          ...oldPost,
          isLiked: response.liked,
        };
      });

      // Update all post queries in cache immediately
      queryClient.setQueriesData({ queryKey: ['posts', 'user'] }, updatePostInCache);
      queryClient.setQueriesData({ queryKey: ['posts', 'liked'] }, updatePostInCache);
      queryClient.setQueriesData({ queryKey: ['posts', 'feed'] }, updatePostInCache);

      // Also update the specific user's posts cache if we know the author
      if (author?.id) {
        queryClient.setQueryData(['posts', 'user', author.id], updatePostInCache);
      }

      // Invalidate posts queries to refresh data from server (ensures isLiked is correct)
      queryClient.invalidateQueries({ queryKey: ['posts', post.id] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'liked'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'feed'] });
    },
    onError: (error: any, shouldLike) => {
      // Handle "Already liked" error gracefully - treat as success
      if (error?.response?.status === 400 && error?.response?.data?.message === 'Already liked') {
        // Post is already liked, sync state
        setIsLiked(true);
        // Don't revert count since it's already correct
        return;
      }

      // Handle "Like not found" error gracefully - treat as success for unlike
      if (error?.response?.status === 404 && shouldLike === false) {
        // Post is already unliked, sync state
        setIsLiked(false);
        // Don't revert count since it's already correct
        return;
      }

      // Revert optimistic update on other errors
      setIsLiked(!shouldLike);
      setLikesCount((prev) => (shouldLike ? Math.max(0, prev - 1) : prev + 1));
    },
  });

  const handleLike = () => {
    if (!isAuthenticated || likeMutation.isPending) return;
    // Optimistic update
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikesCount((prev) => (newLikedState ? prev + 1 : Math.max(0, prev - 1)));
    likeMutation.mutate(newLikedState);
  };

  // Share mutation
  const shareMutation = useMutation({
    mutationFn: () => postsService.share(post.id),
    onSuccess: async () => {
      // Fetch updated analytics to get accurate share count
      try {
        const analytics = await analyticsService.getPostAnalytics(post.id, true);
        setSharesCount(analytics.sharesCount);
        setLikesCount(analytics.likesCount);
        setCommentsCount(analytics.commentsCount);
        
        // Update analytics cache
        queryClient.setQueryData(['postAnalytics', post.id], analytics);
      } catch (error) {
        // Silently handle analytics fetch error
      }
      
      queryClient.invalidateQueries({ queryKey: ['posts', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'feed'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'shared'] });
    },
    onError: (error: any) => {
      // Error handling - could add toast notification here if needed
    },
  });

  const handleShare = () => {
    if (!isAuthenticated || shareMutation.isPending) return;
    shareMutation.mutate();
  };

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: async (shouldBookmark: boolean) => {
      if (shouldBookmark) {
        return await postsService.bookmark(post.id);
      } else {
        return await postsService.unbookmark(post.id);
      }
    },
    onSuccess: async (response) => {
      setIsBookmarked(response.bookmarked);
      // Fetch updated analytics to get accurate bookmark count
      try {
        const analytics = await analyticsService.getPostAnalytics(post.id, true);
        setBookmarksCount(analytics.bookmarks);
        queryClient.setQueryData(['postAnalytics', post.id], analytics);
      } catch (error) {
        // Fallback to optimistic update
        setBookmarksCount((prev) => (response.bookmarked ? prev + 1 : Math.max(0, prev - 1)));
      }
      queryClient.invalidateQueries({ queryKey: ['posts', 'bookmarks'] });
    },
    onError: (error: any) => {
      showError('Failed to bookmark post', error.response?.data?.message || 'An error occurred.');
    },
  });

  const handleBookmark = () => {
    if (!isAuthenticated || bookmarkMutation.isPending) return;
    const newBookmarkedState = !isBookmarked;
    setIsBookmarked(newBookmarkedState);
    setBookmarksCount((prev) => (newBookmarkedState ? prev + 1 : Math.max(0, prev - 1)));
    bookmarkMutation.mutate(newBookmarkedState);
  };

  // Pin mutation (for post owners)
  const pinMutation = useMutation({
    mutationFn: (isPinned: boolean) => postsService.pin(post.id, { isPinned }),
    onSuccess: () => {
      showSuccess('Post updated', post.isPinned ? 'Post unpinned' : 'Post pinned');
      queryClient.invalidateQueries({ queryKey: ['posts', post.id] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'user'] });
    },
    onError: (error: any) => {
      showError('Failed to update post', error.response?.data?.message || 'An error occurred.');
    },
  });

  const handlePin = () => {
    if (!isAuthenticated || pinMutation.isPending || currentUser?.id !== post.userId) return;
    pinMutation.mutate(!post.isPinned);
  };

  // Archive mutation (for post owners)
  const archiveMutation = useMutation({
    mutationFn: () => post.isArchived ? postsService.unarchive(post.id) : postsService.archive(post.id),
    onSuccess: () => {
      showSuccess('Post updated', post.isArchived ? 'Post unarchived' : 'Post archived');
      queryClient.invalidateQueries({ queryKey: ['posts', post.id] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'user'] });
    },
    onError: (error: any) => {
      showError('Failed to update post', error.response?.data?.message || 'An error occurred.');
    },
  });

  const handleArchive = async () => {
    if (!isAuthenticated || archiveMutation.isPending || currentUser?.id !== post.userId) return;
    const confirmed = await showConfirm({
      title: post.isArchived ? 'Unarchive Post' : 'Archive Post',
      message: post.isArchived 
        ? 'Are you sure you want to unarchive this post? It will be visible again on your profile.'
        : 'Are you sure you want to archive this post? It will be hidden from your profile but not deleted.',
      confirmLabel: post.isArchived ? 'Unarchive' : 'Archive',
      cancelLabel: 'Cancel',
    });
    if (confirmed) {
      archiveMutation.mutate();
    }
  };


  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: () => postsService.delete(post.id),
    onSuccess: () => {
      // Show success message
      showSuccess('Post deleted', 'The post has been successfully deleted.');

      // Remove post from all caches
      queryClient.removeQueries({ queryKey: ['posts', post.id] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'user', author?.id] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'feed'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'liked'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'shared'] });

      // Navigate away if we're on the post detail page
      const currentPath = window.location.pathname;
      if (currentPath.includes(`/posts/${post.id}`)) {
        router.push(`/${author?.username || ''}`);
      }
    },
    onError: (error: any) => {
      showError('Failed to delete post', error.response?.data?.message || 'An error occurred while deleting the post.');
    },
  });

  const handleDeletePost = async () => {
    if (!isAuthenticated || deletePostMutation.isPending) return;

    const confirmMessage = post.commentsCount > 0
      ? `Are you sure you want to delete this post? This will also delete all ${post.commentsCount} comment${post.commentsCount === 1 ? '' : 's'} and replies. This action cannot be undone.`
      : 'Are you sure you want to delete this post? This action cannot be undone.';

    const confirmed = await showConfirm({
      title: 'Delete Post',
      message: confirmMessage,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'destructive',
    });

    if (confirmed) {
      deletePostMutation.mutate();
    }
  };

  const handleOpenComments = () => {
    if (!post.allowComments) return;
    setShowComments((prev) => !prev);
  };

  const handlePostClick = () => {
    if (onPostClick) {
      onPostClick(post);
    } else {
      router.push(`/${author?.username || ''}/posts/${post.id}`);
    }
  };

  const handleMediaClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent post click
    setSelectedMediaIndex(index);
  };

  const handleCommentAdded = async () => {
    // Optimistic update - increment immediately for better UX
    setCommentsCount((prev) => prev + 1);
    
    // Invalidate analytics cache to force fresh fetch
    queryClient.invalidateQueries({ queryKey: ['postAnalytics', post.id] });
    
    // Fetch updated analytics to get accurate comment count
    // Add delay to allow backend analytics recalculation to complete (it runs in background)
    setTimeout(async () => {
      try {
        // Force recalculation by passing true
        const analytics = await analyticsService.getPostAnalytics(post.id, true);
        setCommentsCount(analytics.commentsCount);
        setLikesCount(analytics.likesCount);
        setSharesCount(analytics.sharesCount);
        
        // Update analytics cache
        queryClient.setQueryData(['postAnalytics', post.id], analytics);
      } catch (error) {
        // Silently handle analytics fetch error - keep the optimistic update
      }
    }, 1000); // 1 second delay to allow backend recalculation to complete
  };

  // Collect all unique media URLs for modal
  const allMediaUrls: string[] = [];
  if (post.mediaUrl) {
    allMediaUrls.push(post.mediaUrl);
  }
  if (post.mediaUrls && post.mediaUrls.length > 0) {
    post.mediaUrls.forEach(url => {
      if (url !== post.mediaUrl && !allMediaUrls.includes(url)) {
        allMediaUrls.push(url);
      }
    });
  }

  const currentMediaUrl = selectedMediaIndex !== null ? allMediaUrls[selectedMediaIndex] : null;
  const canNavigatePrev = selectedMediaIndex !== null && selectedMediaIndex > 0;
  const canNavigateNext = selectedMediaIndex !== null && selectedMediaIndex < allMediaUrls.length - 1;

  const handlePrevMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedMediaIndex !== null && selectedMediaIndex > 0) {
      setSelectedMediaIndex(selectedMediaIndex - 1);
    }
  };

  const handleNextMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedMediaIndex !== null && selectedMediaIndex < allMediaUrls.length - 1) {
      setSelectedMediaIndex(selectedMediaIndex + 1);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="w-full max-w-full min-w-0 hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
        <CardHeader className="pb-3 min-w-0 max-w-full overflow-hidden">
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Link href={`/${author?.username || ''}`} className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden ring-2 ring-border hover:ring-primary/50 transition-all">
                {avatar ? (
                  <Image
                    src={avatar}
                    alt={displayName}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-primary">
                    {displayName[0].toUpperCase()}
                  </span>
                )}
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link href={`/${author?.username || ''}`}>
                  <p className="font-semibold text-foreground hover:text-primary transition-colors truncate">
                    {displayName}
                  </p>
                </Link>
                {!post.isPublic && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center cursor-pointer">
                        <FontAwesomeIcon
                          icon={faLock}
                          className="h-3 w-3 text-muted-foreground"
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Private post</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatTimeAgo(post.dateCreated)}
                {post.isEdited && ' · Edited'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {post.isPinned && (
              <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                📌 Pinned
              </span>
            )}
            {isAuthenticated && currentUser?.id === post.userId && onAddToCollection && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCollection(post);
                    }}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                  >
                    <FolderPlusIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add to Collection</p>
                </TooltipContent>
              </Tooltip>
            )}
            {isAuthenticated && currentUser?.id === post.userId && (
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePin}
                      disabled={pinMutation.isPending}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                    >
                      {pinMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <PinIcon className={`h-4 w-4 ${post.isPinned ? 'fill-current' : ''}`} />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{post.isPinned ? 'Unpin post' : 'Pin post'}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleArchive}
                      disabled={archiveMutation.isPending}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10"
                    >
                      {archiveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArchiveIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{post.isArchived ? 'Unarchive post' : 'Archive post'}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeletePost}
                      disabled={deletePostMutation.isPending}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                    >
                      {deletePostMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <TrashIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete post</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
            {isAuthenticated && currentUser?.id !== post.userId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Reports
                      resourceType="post"
                      resourceId={post.id}
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                        >
                          <FlagIcon className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Report post</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 min-w-0 max-w-full overflow-hidden">
        {/* Post Content */}
        {post.content && (
          <div className="prose prose-sm dark:prose-invert max-w-none min-w-0 w-full overflow-wrap-anywhere [&_*]:max-w-full">
            <p className="whitespace-pre-wrap break-words overflow-wrap-anywhere min-w-0 w-full">{post.content}</p>
          </div>
        )}


        {/* Media */}
        {allMediaUrls.length > 0 && (() => {
          // Single media item - show large
          if (allMediaUrls.length === 1) {
            const url = allMediaUrls[0];
            const isVideo = isVideoUrl(url) || post.postType === 'video';
            return (
              <div className="rounded-lg overflow-hidden cursor-pointer w-full min-w-0 max-w-full relative" onClick={(e) => handleMediaClick(0, e)}>
                {isVideo ? (
                  <>
                    <video
                      src={url}
                      controls
                      className="w-full h-auto max-h-[600px] object-contain max-w-full min-w-0"
                      playsInline
                      style={{ maxWidth: '100%', width: '100%' }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </>
                ) : (
                  <Image
                    src={url}
                    alt="Post media"
                    width={800}
                    height={600}
                    className="w-full h-auto max-w-full min-w-0 object-contain"
                    style={{ maxWidth: '100%', width: '100%' }}
                  />
                )}
              </div>
            );
          }

          // Multiple media items - show in grid
          // Determine grid columns based on count
          const gridCols = allMediaUrls.length === 2 ? 'grid-cols-2' :
                          allMediaUrls.length === 3 ? 'grid-cols-2' :
                          'grid-cols-2';

          return (
            <div className={`grid ${gridCols} gap-2 w-full max-w-full min-w-0`}>
              {allMediaUrls.map((url, idx) => {
                const isVideo = isVideoUrl(url) || post.postType === 'video' || post.postType === 'mixed';
                return (
                  <div key={idx} className="rounded-lg overflow-hidden cursor-pointer w-full max-w-full min-w-0 relative" onClick={(e) => handleMediaClick(idx, e)}>
                    {isVideo ? (
                      <>
                        <video
                          src={url}
                          controls
                          className="w-full h-auto max-h-[400px] object-cover max-w-full min-w-0"
                          playsInline
                          style={{ maxWidth: '100%', width: '100%' }}
                        >
                          Your browser does not support the video tag.
                        </video>
                      </>
                    ) : (
                    <Image
                      src={url}
                      alt={`Post media ${idx + 1}`}
                      width={400}
                      height={400}
                      className="w-full h-auto max-w-full min-w-0 object-cover"
                      style={{ maxWidth: '100%', width: '100%' }}
                    />
                  )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Link Preview */}
        {post.linkUrl && (
          <div className="border border-border/50 rounded-lg overflow-hidden hover:border-primary/30 transition-all hover:shadow-md bg-card">
            <Link
              href={post.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              {post.linkImage && (
                <div className="relative w-full h-56 bg-muted overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.linkImage}
                    alt={post.linkTitle || 'Link preview'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className={`p-4 space-y-2 ${!post.linkImage ? 'pt-4' : ''}`}>
                {post.linkTitle && (
                  <div className="flex items-start gap-2">
                    <h3 className="font-semibold text-foreground text-base leading-tight group-hover:text-primary transition-colors flex-1">
                      {post.linkTitle}
                    </h3>
                    <ExternalLinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
                  </div>
                )}
                {post.linkDescription && (
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {post.linkDescription}
                  </p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground font-medium truncate">
                    {(() => {
                      try {
                        const hostname = new URL(post.linkUrl).hostname.replace('www.', '');
                        return hostname;
                      } catch {
                        return post.linkUrl;
                      }
                    })()}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.hashtags.map((tag, idx) => (
              <Link
                key={idx}
                href={`/search?q=${encodeURIComponent(tag)}`}
                className="text-sm text-primary hover:underline"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Interactions */}
        <div className="flex items-center gap-4 md:gap-6 pt-3 border-t border-border/50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                disabled={!isAuthenticated || likeMutation.isPending}
                className={`gap-2 transition-colors ${
                  isLiked
                    ? 'text-red-500 bg-red-500/10 hover:text-red-600 hover:bg-red-500/20'
                    : 'text-muted-foreground hover:text-red-500 hover:bg-red-500/10'
                }`}
              >
                <HeartIcon className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                <span className="font-medium">{likesCount}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isLiked ? 'Unlike' : 'Like'}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenComments}
                disabled={post.allowComments === false}
                className="gap-2 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <MessageCircleIcon className="h-4 w-4" />
                <span className="font-medium">{commentsCount}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Comments</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                disabled={!isAuthenticated || shareMutation.isPending}
                className="gap-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
              >
                <ShareIcon className="h-4 w-4" />
                <span className="font-medium">{sharesCount}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Share</p>
            </TooltipContent>
          </Tooltip>
          {isAuthenticated && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBookmark}
                  disabled={bookmarkMutation.isPending}
                  className={`gap-2 transition-colors ${
                    isBookmarked
                      ? 'text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20'
                      : 'text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10'
                  }`}
                >
                  <BookmarkIcon className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                  <span className="font-medium">{bookmarksCount || 0}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isBookmarked ? 'Remove bookmark' : 'Bookmark'}</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md cursor-default">
                <EyeIcon className="h-3.5 w-3.5" />
                <span className="font-medium">{post.viewsCount || 0}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Views</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardContent>

      {/* Comments Section - Expandable */}
      {showComments && post.allowComments !== false && (
        <CardContent className="border-t border-border/50 pt-4">
          <Comments
            postId={post.id}
            allowComments={post.allowComments}
            onCommentAdded={handleCommentAdded}
          />
        </CardContent>
      )}
      </Card>

      {/* Media Modal */}
      <Dialog
        open={selectedMediaIndex !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMediaIndex(null);
          }
        }}
      >
        <DialogContent className="max-w-5xl p-0 gap-0">
          {currentMediaUrl && (
            <>
              <DialogHeader className="p-4 pb-2">
                <DialogTitle className="text-sm text-muted-foreground">
                  {allMediaUrls.length > 1 && selectedMediaIndex !== null && (
                    <span>{selectedMediaIndex + 1} / {allMediaUrls.length}</span>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="relative w-full bg-black/50 flex items-center justify-center p-4 min-h-[400px] max-h-[85vh]">
                {/* Previous Button */}
                {allMediaUrls.length > 1 && canNavigatePrev && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 z-10 h-10 w-10 rounded-full bg-background/80 hover:bg-background"
                    onClick={handlePrevMedia}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                )}

                {/* Media Content */}
                <div className="flex items-center justify-center w-full h-full">
                  {isVideoUrl(currentMediaUrl) || post.postType === 'video' || post.postType === 'mixed' ? (
                    <video
                      src={currentMediaUrl}
                      controls
                      className="max-w-full max-h-[85vh] w-auto h-auto"
                      playsInline
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <Image
                      src={currentMediaUrl}
                      alt={`Post media ${selectedMediaIndex !== null ? selectedMediaIndex + 1 : ''}`}
                      width={1200}
                      height={1200}
                      className="max-w-full max-h-[85vh] w-auto h-auto object-contain"
                    />
                  )}
                </div>

                {/* Next Button */}
                {allMediaUrls.length > 1 && canNavigateNext && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 z-10 h-10 w-10 rounded-full bg-background/80 hover:bg-background"
                    onClick={handleNextMedia}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

