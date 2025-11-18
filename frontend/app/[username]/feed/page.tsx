'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsService } from '@/core/api/posts';
import { userService } from '@/core/api/user';
import { Card, CardContent, CardHeader } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import { useParams } from 'next/navigation';
import {
  HeartIcon,
  MessageCircleIcon,
  ShareIcon,
  BookmarkIcon,
  EyeIcon,
} from 'lucide-react';
import type { Post } from '@/core/api/posts';

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

export default function UserFeedPage() {
  const params = useParams();
  const username = params.username as string;
  const { user: currentUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch user by username
  const {
    data: user,
    isLoading: isLoadingUser,
  } = useQuery({
    queryKey: ['user', 'profile', username],
    queryFn: () => userService.getByUsername(username),
    enabled: !!username,
  });

  // Fetch user's feed (timeline)
  const {
    data: feedData,
    isLoading: isLoadingFeed,
    error: feedError,
  } = useQuery({
    queryKey: ['posts', 'user', 'feed', user?.id, page],
    queryFn: () => postsService.getUserFeed(user!.id, { page, limit }),
    enabled: !!user?.id,
  });

  if (isLoadingUser || isLoadingFeed) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading feed...</p>
        </div>
      </div>
    );
  }

  if (feedError || !user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-red-500">Error loading feed. Please try again.</p>
        </div>
      </div>
    );
  }

  const posts = feedData?.data || [];
  const hasMore = feedData?.meta?.hasNextPage || false;

  return (
    <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {user.displayName || user.username}'s Timeline
          </h1>
          <p className="text-muted-foreground">
            Posts from users {user.displayName || user.username} follows and shared posts
          </p>
        </div>

        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                This user's timeline is empty.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}

            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={isLoadingFeed}
                >
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const { user: currentUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const author = post.user;
  const displayName = author?.displayName || author?.username || 'Unknown';
  const avatar = author?.profile?.avatar;
  const hasMedia = post.mediaUrl || (post.mediaUrls && post.mediaUrls.length > 0);
  // Initialize state from post data
  const postIsLiked = post.isLiked ?? false;
  const [isLiked, setIsLiked] = useState(postIsLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);

  // Sync state with post data when it changes (e.g., after refetch)
  useEffect(() => {
    const currentPostIsLiked = post.isLiked ?? false;
    const currentLikesCount = post.likesCount || 0;
    
    // Always sync with post data to ensure consistency
    setIsLiked(currentPostIsLiked);
    setLikesCount(currentLikesCount);
  }, [post.id, post.isLiked, post.likesCount]);

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
      queryClient.setQueriesData({ queryKey: ['posts', 'user', 'feed'] }, updatePostInCache);
      queryClient.setQueriesData({ queryKey: ['posts'] }, updatePostInCache);
      queryClient.setQueriesData({ queryKey: ['posts', 'user'] }, updatePostInCache);
      
      // Invalidate posts queries to refresh data from server (ensures isLiked is correct)
      queryClient.invalidateQueries({ queryKey: ['posts', post.id] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'user', 'feed'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'user'] });
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
      queryClient.invalidateQueries({ queryKey: ['posts', 'user', 'feed'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'shared'] });
    },
    onError: (error: any) => {
      console.error('Error sharing post:', error);
      // You can add a toast notification here if needed
    },
  });

  const handleShare = () => {
    if (!isAuthenticated || shareMutation.isPending) return;
    shareMutation.mutate();
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Link href={`/${author?.username || ''}`}>
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {avatar ? (
                  <Image
                    src={avatar}
                    alt={displayName}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">
                    {displayName[0].toUpperCase()}
                  </span>
                )}
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/${author?.username || ''}`}>
                <p className="font-semibold text-foreground hover:underline truncate">
                  {displayName}
                </p>
              </Link>
              <p className="text-sm text-muted-foreground">
                {formatTimeAgo(post.dateCreated)}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Post content */}
        {post.content && (
          <p className="text-foreground whitespace-pre-wrap break-words">
            {post.content}
          </p>
        )}

        {/* Media */}
        {hasMedia && (
          <div className="rounded-lg overflow-hidden">
            {post.mediaUrl && (
              <Image
                src={post.mediaUrl}
                alt="Post media"
                width={800}
                height={600}
                className="w-full h-auto object-contain rounded-lg"
              />
            )}
            {post.mediaUrls && post.mediaUrls.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {post.mediaUrls.slice(0, 4).map((url, idx) => (
                  <Image
                    key={idx}
                    src={url}
                    alt={`Post media ${idx + 1}`}
                    width={400}
                    height={300}
                    className="w-full h-auto object-cover rounded-lg"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Interactions */}
        <div className="flex items-center gap-6 pt-2 border-t">
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
            className="gap-2 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <MessageCircleIcon className="h-4 w-4" />
            <span className="font-medium">{post.commentsCount || 0}</span>
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
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <BookmarkIcon className="h-4 w-4" />
            <span>{post.bookmarksCount || 0}</span>
          </Button>
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <EyeIcon className="h-3 w-3" />
            <span>{post.viewsCount || 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

