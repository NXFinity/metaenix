'use client';

import { useParams, useRouter } from 'next/navigation';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { userService } from '@/core/api/user';
import { postsService } from '@/core/api/posts';
import { followsService } from '@/core/api/follows';
import { useAuth } from '@/core/hooks/useAuth';
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/theme/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/theme/ui/dialog';
import { PostCard } from '@/theme/components/posts/Posts';
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
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons';
import type { Post, Comment } from '@/core/api/posts';

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
    staleTime: 5 * 60 * 1000, // 5 minutes - cache user profile data
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
    },
  });

  // Check if viewing own profile
  const isOwnProfile = isAuthenticated && currentUser?.id === user?.id;

  // Fetch user's posts (only posts by this user, not feed)
  const {
    data: postsData,
    isLoading: isLoadingPosts,
  } = useQuery({
    queryKey: ['posts', 'user', user?.id],
    queryFn: () => postsService.getByUser(user!.id, { page: 1, limit: 100 }),
    enabled: !!user?.id,
  });

  // Fetch liked posts - only for own profile
  const {
    data: likedPostsData,
    isLoading: isLoadingLikedPosts,
  } = useQuery({
    queryKey: ['posts', 'liked', currentUser?.id],
    queryFn: () => postsService.getLikedPosts({ page: 1, limit: 100 }),
    enabled: !!currentUser?.id && isOwnProfile,
  });

  // Fetch shared posts - only for own profile
  const {
    data: sharedPostsData,
    isLoading: isLoadingSharedPosts,
  } = useQuery({
    queryKey: ['posts', 'shared', currentUser?.id],
    queryFn: () => postsService.getSharedPosts({ page: 1, limit: 100 }),
    enabled: !!currentUser?.id && isOwnProfile,
  });

  const isFollowing = followStatus?.isFollowing ?? false;
  const [activeTab, setActiveTab] = useState('posts');
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; postId: string; postType?: string } | null>(null);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  // Handle hash navigation to switch tabs
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'media' && activeTab !== 'media') {
        // Use setTimeout to avoid synchronous setState in effect
        setTimeout(() => {
          setActiveTab('media');
        }, 0);
      }
    }
  }, [activeTab]);

  // Delete media mutation
  const deleteMediaMutation = useMutation({
    mutationFn: async ({ postId, mediaUrl }: { postId: string; mediaUrl: string }) => {
      // Get the post to update
      const post = postsData?.data.find((p) => p.id === postId);
      if (!post) throw new Error('Post not found');

      const updateData: { mediaUrl?: string; mediaUrls?: string[] } = {};

      // Handle mediaUrl (single media)
      if (post.mediaUrl === mediaUrl) {
        updateData.mediaUrl = undefined;
      }

      // Handle mediaUrls (multiple media)
      if (post.mediaUrls && post.mediaUrls.length > 0) {
        const updatedMediaUrls = post.mediaUrls.filter((url) => url !== mediaUrl);
        if (updatedMediaUrls.length > 0) {
          updateData.mediaUrls = updatedMediaUrls;
        } else {
          // If no media URLs left, set to empty array
          updateData.mediaUrls = [];
        }
      }

      // Update the post
      return postsService.update(postId, updateData);
    },
    onSuccess: () => {
      // Invalidate posts queries to refetch
      queryClient.invalidateQueries({ queryKey: ['posts', 'user', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setSelectedMedia(null);
      setIsDeletingMedia(false);
      setShowDeleteConfirm(false);
    },
    onError: () => {
      setIsDeletingMedia(false);
    },
  });

  const handleDeleteMedia = () => {
    if (!selectedMedia) return;
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    setIsDeletingMedia(true);
    deleteMediaMutation.mutate({
      postId: selectedMedia.postId,
      mediaUrl: selectedMedia.url,
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

  // Handle private profile error - show immediately without waiting for other queries
  const httpError = error as { response?: { status?: number } } | null;
  const isForbidden = httpError?.response?.status === 403;
  
  if (error && isForbidden) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <div className="relative">
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-3xl blur-3xl animate-pulse" />
              
              {/* Main card */}
              <Card className="relative border-2 border-primary/30 bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-xl shadow-2xl overflow-hidden">
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
                
                <CardContent className="p-8 md:p-12">
                  <div className="flex flex-col items-center text-center space-y-8">
                    {/* Animated Lock Icon */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl animate-pulse" />
                      <div className="relative">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/40 via-primary/20 to-primary/10 border-4 border-primary/40 flex items-center justify-center shadow-lg backdrop-blur-sm">
                          <FontAwesomeIcon icon={faLock} size="4x" className="text-primary drop-shadow-lg" />
                        </div>
                      </div>
                    </div>

                    {/* Username and Title */}
                    <div className="space-y-3">
                      <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
                        @{username}
                      </h1>
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/50" />
                        <p className="text-xl md:text-2xl font-semibold text-primary">
                          Private Profile
                        </p>
                        <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/50" />
                      </div>
                    </div>

                    {/* Message and Actions */}
                    <div className="space-y-6 max-w-md">
                      <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                        This profile is private. Only friends of this user can view their profile.
                      </p>
                      
                      {!isAuthenticated ? (
                        <div className="pt-2">
                          <Link href="/login">
                            <Button 
                              size="lg" 
                              variant="default"
                              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 text-primary-foreground"
                            >
                              Sign in
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="pt-2">
                          <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                            <p className="text-sm text-muted-foreground leading-relaxed text-center">
                              This profile is only visible to friends. Friends functionality is coming soon.
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
      <div className="bg-gradient-to-b from-background via-background to-muted/30">
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl">
        {/* Profile Card */}
        <Card className="overflow-hidden relative shadow-2xl border-0 bg-card/50 backdrop-blur-sm !p-0">
          {/* Cover Image - Full Width Top Section */}
          {user.profile?.cover ? (
            <div className="relative w-full bg-muted overflow-hidden group" style={{ aspectRatio: '3/1' }}>
              <img
                src={user.profile.cover}
                alt={`${user.displayName || user.username}'s cover`}
                className="block w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/40 via-transparent to-transparent pointer-events-none z-10" />
            </div>
          ) : (
            <div className="relative w-full bg-gradient-to-br from-primary/20 via-secondary/20 to-primary/30" style={{ aspectRatio: '3/1' }} />
          )}

        {/* Profile Header Section */}
        <CardHeader className="relative z-10 pb-4">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-6">
            {/* Avatar - positioned over cover if cover exists */}
            <div
              className={`${
                user.profile?.cover
                  ? 'relative -mt-16 md:-mt-20 lg:-mt-24'
                  : 'mt-4'
              } w-24 h-24 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 border-4 border-background flex items-center justify-center overflow-hidden shadow-2xl ring-4 ring-primary/20 transition-transform hover:scale-105`}
            >
              {user.profile?.avatar ? (
                <Image
                  src={user.profile.avatar}
                  alt={user.displayName || user.username}
                  width={144}
                  height={144}
                  className="w-full h-full object-cover"
                  priority
                />
              ) : (
                <span className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary">
                  {(user.displayName || user.username)[0].toUpperCase()}
                </span>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 w-full pt-2 md:pt-0">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <CardTitle className="text-2xl md:text-3xl lg:text-4xl font-bold">
                {user.displayName || user.username}
              </CardTitle>
                    {user.isDeveloper && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary/20 text-primary border border-primary/30">
                        Developer
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm md:text-base mb-2">@{user.username}</p>
              {user.profile?.bio && (
                    <p className="text-sm md:text-base text-foreground/90 leading-relaxed max-w-2xl">
                      {user.profile.bio}
                    </p>
                  )}
                </div>
                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isOwnProfile ? (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/${username}/settings`}>
                          <SettingsIcon className="h-4 w-4 mr-2" />
                          Settings
                        </Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href={`/${username}/dashboard`}>
                          Dashboard
                        </Link>
                      </Button>
                    </>
                  ) : isAuthenticated ? (
                    <Button
                      variant={isFollowing ? 'outline' : 'default'}
                      size="sm"
                      onClick={handleFollow}
                      disabled={followMutation.isPending || unfollowMutation.isPending || isLoadingFollowStatus}
                      className="min-w-[100px]"
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
                    <Button size="sm" asChild>
                      <Link href="/login">Follow</Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10 pt-6">
          {/* Stats */}
          <div className="flex items-center gap-6 md:gap-12 mb-6 pb-6 border-b border-border/50">
            <Link 
              href={`/${username}/posts`}
              className="text-center hover:opacity-80 transition-opacity cursor-pointer group"
            >
              <div className="text-2xl md:text-3xl font-bold text-foreground group-hover:text-primary transition-colors">
                {postsData?.meta?.total ?? 0}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1 font-medium">Posts</div>
            </Link>
            <Link 
              href={`/${username}/followers`}
              className="text-center hover:opacity-80 transition-opacity cursor-pointer group"
            >
              <div className="text-2xl md:text-3xl font-bold text-foreground group-hover:text-primary transition-colors">
                {user.followersCount ?? 0}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1 font-medium">Followers</div>
            </Link>
            <Link 
              href={`/${username}/following`}
              className="text-center hover:opacity-80 transition-opacity cursor-pointer group"
            >
              <div className="text-2xl md:text-3xl font-bold text-foreground group-hover:text-primary transition-colors">
                {user.followingCount ?? 0}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1 font-medium">Following</div>
            </Link>
          </div>

          {/* Profile Details */}
          {(user.profile?.location || user.profile?.website || user.dateCreated) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-2">
            {user.profile?.location && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors border border-border/50">
                  <span className="text-lg">📍</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Location</div>
                    <div className="text-sm font-semibold text-foreground truncate">{user.profile.location}</div>
                  </div>
              </div>
            )}
            {user.profile?.website && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors border border-border/50">
                  <span className="text-lg">🔗</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Website</div>
                <a
                  href={user.profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                      className="text-sm font-semibold text-primary hover:underline truncate block"
                >
                      {user.profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
                  </div>
              </div>
            )}
            {user.dateCreated && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors border border-border/50">
                  <span className="text-lg">📅</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Joined</div>
                    <div className="text-sm font-semibold text-foreground">
                      {new Date(user.dateCreated).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <div className="mt-8 md:mt-12" id="media">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full h-auto p-1 bg-muted/50 ${isAuthenticated ? 'grid-cols-5' : 'grid-cols-2'}`}>
            <TabsTrigger value="posts" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Posts
            </TabsTrigger>
            {isAuthenticated && (
              <>
                <TabsTrigger value="comments" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  Comments
                </TabsTrigger>
                <TabsTrigger value="shares" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  Shares
                </TabsTrigger>
                <TabsTrigger value="likes" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  Likes
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="media" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Media
            </TabsTrigger>
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts" className="mt-6">
            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">Posts</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {postsData?.meta?.total ? `${postsData.meta.total} ${postsData.meta.total === 1 ? 'post' : 'posts'}` : 'No posts yet'}
                </p>
              </div>
              {postsData && postsData.data.length > 0 && (
                <Link href={`/${username}/posts`}>
                  <Button variant="outline" size="sm">
                    View all posts →
                  </Button>
                </Link>
              )}
            </div>
            {postsData && postsData.data.length > 0 ? (
              <div className="space-y-4 md:space-y-6">
                {postsData.data.slice(0, 5).map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="pt-12 pb-12">
                  <div className="text-center text-muted-foreground">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                      <MessageCircleIcon className="h-8 w-8 opacity-50" />
                    </div>
                    <p className="text-lg font-semibold mb-2">No posts yet</p>
                    <p className="text-sm mb-6 max-w-md mx-auto">
                      {isOwnProfile
                        ? 'Start sharing your thoughts and create your first post!'
                        : `${user.displayName || user.username} hasn't posted anything yet.`}
                    </p>
                    {isOwnProfile && (
                      <Button asChild>
                        <Link href={`/${username}/posts`}>Create Your First Post</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Comments Tab - Only visible when authenticated */}
          {isAuthenticated && (
            <TabsContent value="comments" className="mt-6">
              <CommentsTab userId={user?.id} username={username} />
            </TabsContent>
          )}

          {/* Shares Tab - Only visible when authenticated */}
          {isAuthenticated && (
            <TabsContent value="shares" className="mt-6">
              {isOwnProfile ? (
                isLoadingSharedPosts ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="animate-pulse">Loading shared posts...</div>
                    </CardContent>
                  </Card>
                ) : sharedPostsData && sharedPostsData.data.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground">Shares</h2>
                      <p className="text-sm text-muted-foreground">
                        {sharedPostsData.meta?.total ? `${sharedPostsData.meta.total} ${sharedPostsData.meta.total === 1 ? 'share' : 'shares'}` : 'No shares yet'}
                      </p>
                    </div>
                    {sharedPostsData.data.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8 text-muted-foreground">
                        <ShareIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg mb-2">No shared posts yet</p>
                        <p className="text-sm">Posts you share will appear here</p>
                      </div>
                    </CardContent>
                  </Card>
                )
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-muted-foreground">
                      <ShareIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg mb-2">Shares</p>
                      <p className="text-sm">Only you can see your shared posts</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* Likes Tab - Only visible when authenticated */}
          {isAuthenticated && (
            <TabsContent value="likes" className="mt-6">
              {isOwnProfile ? (
                isLoadingLikedPosts ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8 text-muted-foreground">
                        <div className="animate-pulse">Loading liked posts...</div>
                      </div>
                    </CardContent>
                  </Card>
                ) : likedPostsData && likedPostsData.data.length > 0 ? (
                  <div className="space-y-4 md:space-y-6">
                    {likedPostsData.data.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8 text-muted-foreground">
                        <HeartIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg mb-2">No liked posts yet</p>
                        <p className="text-sm">Posts you like will appear here</p>
                      </div>
                    </CardContent>
                  </Card>
                )
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-muted-foreground">
                      <HeartIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg mb-2">Likes</p>
                      <p className="text-sm">Only you can see your liked posts</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* Media Tab */}
          <TabsContent value="media" className="mt-6">
            {(() => {
              if (!postsData || postsData.data.length === 0) {
                return (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8 text-muted-foreground">
                        <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg mb-2">No media</p>
                        <p className="text-sm">
                          {isOwnProfile
                            ? 'Start sharing images and videos!'
                            : `${user.displayName || user.username} hasn't shared any media yet.`}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              // Collect all media URLs from all posts
              const allMedia: Array<{ url: string; postId: string; postType?: string }> = [];
              postsData.data.forEach((post) => {
                if (post.mediaUrl) {
                  allMedia.push({ url: post.mediaUrl, postId: post.id, postType: post.postType || undefined });
                }
                if (post.mediaUrls && post.mediaUrls.length > 0) {
                  post.mediaUrls.forEach((url) => {
                    allMedia.push({ url, postId: post.id, postType: post.postType || undefined });
                  });
                }
              });

              if (allMedia.length === 0) {
                return (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8 text-muted-foreground">
                        <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg mb-2">No media</p>
                        <p className="text-sm">
                          {isOwnProfile
                            ? 'Start sharing images and videos!'
                            : `${user.displayName || user.username} hasn't shared any media yet.`}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {allMedia.map((media, idx) => (
                      <button
                        key={`${media.postId}-${idx}`}
                        onClick={() => {
                          setSelectedMedia(media);
                          setImageDimensions(null);
                        }}
                        className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
                      >
                        <Image
                          src={media.url}
                          alt={`Media ${idx + 1}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </button>
                    ))}
                  </div>

                  {/* Media Modal */}
                  <Dialog 
                    open={!!selectedMedia} 
                    onOpenChange={(open) => {
                      if (!open) {
                        setSelectedMedia(null);
                        setShowDeleteConfirm(false);
                        setImageDimensions(null);
                      }
                    }}
                  >
                    <DialogContent className="max-w-4xl p-0">
                      {selectedMedia && (
                        <>
                          <DialogHeader className="p-6 pb-0">
                            <DialogTitle>Media</DialogTitle>
                          </DialogHeader>
                          <div 
                            className="relative w-full bg-muted flex items-center justify-center p-4"
                            style={{
                              minHeight: '400px',
                              maxHeight: '80vh',
                              aspectRatio: imageDimensions 
                                ? `${imageDimensions.width} / ${imageDimensions.height}` 
                                : undefined,
                            }}
                          >
                            {selectedMedia.postType === 'video' || selectedMedia.url.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                              <video
                                src={selectedMedia.url}
                                controls
                                className="max-w-full max-h-[80vh] w-auto h-auto"
                              />
                            ) : (
                              <img
                                src={selectedMedia.url}
                                alt="Media"
                                className="max-w-full max-h-[80vh] w-auto h-auto object-contain"
                                onLoad={(e) => {
                                  const img = e.currentTarget;
                                  setImageDimensions({
                                    width: img.naturalWidth,
                                    height: img.naturalHeight,
                                  });
                                }}
                              />
                            )}
                          </div>
                          {isOwnProfile && (() => {
                            const post = postsData?.data.find((p) => p.id === selectedMedia.postId);
                            const canDelete = post && post.userId === currentUser?.id;
                            return canDelete ? (
                              <div className="p-6 pt-4 flex justify-end gap-2">
                                {showDeleteConfirm ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      onClick={() => setShowDeleteConfirm(false)}
                                      disabled={isDeletingMedia}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={handleDeleteMedia}
                                      disabled={isDeletingMedia}
                                    >
                                      <TrashIcon className="h-4 w-4 mr-2" />
                                      {isDeletingMedia ? 'Deleting...' : 'Confirm Delete'}
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="destructive"
                                    onClick={handleDeleteMedia}
                                    disabled={isDeletingMedia}
                                  >
                                    <TrashIcon className="h-4 w-4 mr-2" />
                                    Delete Media
                                  </Button>
                                )}
                              </div>
                            ) : null;
                          })()}
                        </>
                      )}
                    </DialogContent>
                  </Dialog>
                </>
              );
            })()}
          </TabsContent>
        </Tabs>
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

  // Fetch comments for all posts (only for posts that have comments, paginate if needed)
  const commentsQueries = useQueries({
    queries: (postsData?.data || [])
      .filter((post: Post) => (post.commentsCount || 0) > 0) // Only fetch for posts with comments
      .map((post: Post) => ({
        queryKey: ['posts', post.id, 'comments', 'tab'],
        queryFn: async () => {
          // Fetch all comments by paginating (max limit is 100 per page)
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
        },
        enabled: !!post.id && !!postsData?.data && postsData.data.length > 0 && (post.commentsCount || 0) > 0,
      })),
  });

  // Flatten all parent comments (top-level only, no replies) from all posts into a single array
  const allComments = useMemo(() => {
    const comments: Comment[] = [];
    commentsQueries.forEach((query) => {
      if (query.data?.data) {
        // Only include top-level comments (no parentCommentId)
        query.data.data.forEach((comment: Comment) => {
          // Only add if it's a parent comment (no parentCommentId)
          if (!comment.parentCommentId) {
            comments.push(comment);
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
            queryClient.invalidateQueries({ queryKey: ['posts', comment.postId, 'comments'] });
          });
        }
      });
    },
  });

  const handleLikeComment = (commentId: string) => {
    if (!isAuthenticated || likeCommentMutation.isPending) return;
    likeCommentMutation.mutate(commentId);
  };

  const handleViewComment = (comment: Comment) => {
    const post = postsData?.data.find((p: Post) => p.id === comment.postId);
    if (post?.user?.username) {
      router.push(`/${post.user.username}/posts/comment/${comment.id}?postId=${post.id}`);
    }
  };

  // Get post info for each comment
  const getPostForComment = (comment: Comment) => {
    return postsData?.data.find((post: Post) => post.id === comment.postId);
  };

  if (isLoadingPosts || isLoadingComments) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin text-primary" />
            <p>Loading comments...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allComments.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircleIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No comments yet</p>
            <p className="text-sm">Comments made on {username}&apos;s posts will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Comments</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {allComments.length} {allComments.length === 1 ? 'comment' : 'comments'} on {username}&apos;s posts
          </p>
        </div>
      </div>

      <div className="space-y-4">
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


