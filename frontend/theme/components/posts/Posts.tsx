'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsService } from '@/core/api/posts';
import { useAuth } from '@/core/hooks/useAuth';
import { useAlerts } from '@/theme/components/alerts';
import { Card, CardContent, CardHeader } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import {
  HeartIcon,
  MessageCircleIcon,
  ShareIcon,
  BookmarkIcon,
  EyeIcon,
  Loader2,
  TrashIcon,
} from 'lucide-react';
import type { Post } from '@/core/api/posts';
import { Comments } from './Comments';

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

export interface PostCardProps {
  post: Post;
  showFullContent?: boolean;
  onPostClick?: (post: Post) => void;
}

export const PostCard = ({ post, showFullContent = true, onPostClick }: PostCardProps) => {
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
  const [isLiked, setIsLiked] = useState(postIsLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  
  // Comments expand state
  const [showComments, setShowComments] = useState(false);

  // Track post view when component mounts (only for public, non-draft posts)
  useEffect(() => {
    // Only track views for public posts that are not drafts
    if (post.isPublic && !post.isDraft) {
      // Track view asynchronously (don't block rendering)
      postsService.trackView(post.id).catch(() => {
        // Silently fail view tracking - don't interrupt user experience
      });
    }
  }, [post.id, post.isPublic, post.isDraft]);

  // Sync state with post data when it changes (e.g., after refetch)
  useEffect(() => {
    const currentPostIsLiked = post.isLiked ?? false;
    const currentLikesCount = post.likesCount || 0;
    const currentCommentsCount = post.commentsCount || 0;
    
    // Always sync with post data to ensure consistency
    setIsLiked(currentPostIsLiked);
    setLikesCount(currentLikesCount);
    setCommentsCount(currentCommentsCount);
  }, [post.id, post.isLiked, post.likesCount, post.commentsCount]);

  // Like/Unlike mutation
  const likeMutation = useMutation({
    mutationFn: async (shouldLike: boolean) => {
      if (shouldLike) {
        return await postsService.like(post.id);
      } else {
        return await postsService.unlike(post.id);
      }
    },
    onSuccess: (response) => {
      // Update local state immediately
      setIsLiked(response.liked);
      setLikesCount((prev) => (response.liked ? prev + 1 : Math.max(0, prev - 1)));
      
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
                  likesCount: response.liked 
                    ? (p.likesCount || 0) + 1 
                    : Math.max(0, (p.likesCount || 0) - 1) 
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
          likesCount: response.liked
            ? (oldPost.likesCount || 0) + 1
            : Math.max(0, (oldPost.likesCount || 0) - 1),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'feed'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'shared'] });
    },
    onError: (error: any) => {
      console.error('Error sharing post:', error);
    },
  });

  const handleShare = () => {
    if (!isAuthenticated || shareMutation.isPending) return;
    shareMutation.mutate();
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
      console.error('Error deleting post:', error);
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

  const handleCommentAdded = () => {
    setCommentsCount((prev) => prev + 1);
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
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
              <Link href={`/${author?.username || ''}`}>
                <p className="font-semibold text-foreground hover:text-primary transition-colors truncate">
                  {displayName}
                </p>
              </Link>
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
            {isAuthenticated && currentUser?.id === post.userId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeletePost}
                disabled={deletePostMutation.isPending}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                title="Delete post"
              >
                {deletePostMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TrashIcon className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Post Content */}
        {post.content && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap break-words">{post.content}</p>
          </div>
        )}

        {/* Media */}
        {post.mediaUrl && (
          <div className="rounded-lg overflow-hidden cursor-pointer" onClick={handlePostClick}>
            <Image
              src={post.mediaUrl}
              alt="Post media"
              width={800}
              height={600}
              className="w-full h-auto object-contain"
            />
          </div>
        )}

        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {post.mediaUrls.slice(0, 4).map((url, idx) => (
              <div key={idx} className="rounded-lg overflow-hidden cursor-pointer" onClick={handlePostClick}>
                <Image
                  src={url}
                  alt={`Post media ${idx + 1}`}
                  width={400}
                  height={300}
                  className="w-full h-auto object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Link Preview */}
        {post.linkUrl && (
          <Link
            href={post.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors"
          >
            {post.linkImage && (
              <div className="mb-3 rounded overflow-hidden">
                <Image
                  src={post.linkImage}
                  alt={post.linkTitle || 'Link preview'}
                  width={600}
                  height={315}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}
            {post.linkTitle && (
              <p className="font-semibold text-foreground mb-1">
                {post.linkTitle}
              </p>
            )}
            {post.linkDescription && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {post.linkDescription}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {new URL(post.linkUrl).hostname}
            </p>
          </Link>
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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            disabled={!isAuthenticated || shareMutation.isPending}
            className="gap-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
          >
            <ShareIcon className="h-4 w-4" />
            <span className="font-medium">{post.sharesCount || 0}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10 transition-colors"
          >
            <BookmarkIcon className="h-4 w-4" />
            <span className="font-medium">{post.bookmarksCount || 0}</span>
          </Button>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
            <EyeIcon className="h-3.5 w-3.5" />
            <span className="font-medium">{post.viewsCount || 0}</span>
          </div>
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
  );
};

