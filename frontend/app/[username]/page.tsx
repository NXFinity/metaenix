'use client';

import { useParams } from 'next/navigation';
import { userService } from '@/core/api/user';
import { postsService } from '@/core/api/posts';
import { followsService } from '@/core/api/follows';
import { useAuth } from '@/core/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/theme/ui/tabs';
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
  UserPlusIcon,
  UserMinusIcon,
  SettingsIcon,
  ImageIcon,
  TrashIcon,
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

export default function UserProfilePage() {
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

  // Follow/Unfollow mutation
  const followMutation = useMutation({
    mutationFn: () => followsService.follow(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow', 'status', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile', username] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => followsService.unfollow(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow', 'status', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile', username] });
    },
  });

  // Check if viewing own profile
  const isOwnProfile = isAuthenticated && currentUser?.id === user?.id;

  // Fetch posts by user - fetch more for media tab
  // When viewing own profile, backend returns all posts (public + private)
  // When viewing others, backend returns only public posts
  const {
    data: postsData,
    isLoading: isLoadingPosts,
  } = useQuery({
    queryKey: ['posts', 'user', user?.id, isOwnProfile ? 'all' : 'public'],
    queryFn: () => postsService.getByUser(user!.id, { page: 1, limit: 100 }),
    enabled: !!user?.id,
  });
  const isFollowing = followStatus?.isFollowing ?? false;
  const [activeTab, setActiveTab] = useState('posts');
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; postId: string; postType?: string } | null>(null);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  // Handle hash navigation to switch tabs
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'media') {
      setActiveTab('media');
    }
  }, []);

  // Delete media mutation
  const deleteMediaMutation = useMutation({
    mutationFn: async ({ postId, mediaUrl }: { postId: string; mediaUrl: string }) => {
      // Get the post to update
      const post = postsData?.data.find((p) => p.id === postId);
      if (!post) throw new Error('Post not found');

      const updateData: { mediaUrl?: string | null; mediaUrls?: string[] } = {};

      // Handle mediaUrl (single media)
      if (post.mediaUrl === mediaUrl) {
        updateData.mediaUrl = null;
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
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-32 bg-muted rounded-lg mb-4" />
            <div className="h-8 bg-muted rounded w-1/3 mb-2" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                User not found
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <Card className="overflow-hidden relative shadow-xl border-2 !p-0">
          {/* Cover Image - Full Width Top Section */}
          {user.profile?.cover ? (
            <div className="relative w-full h-48 md:h-64 bg-muted overflow-hidden">
              <Image
                src={user.profile.cover}
                alt={`${user.displayName || user.username}'s cover`}
                fill
                className="object-cover"
                style={{ objectFit: 'cover', objectPosition: 'center' }}
                priority
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
            </div>
          ) : (
            <div className="relative w-full h-32 md:h-48 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10" />
          )}

        {/* Profile Header Section */}
        <CardHeader className="relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-6">
            {/* Avatar - positioned over cover if cover exists */}
            <div
              className={`${
                user.profile?.cover
                  ? 'relative -mt-16 md:-mt-20'
                  : 'mt-4'
              } w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border-4 border-background flex items-center justify-center overflow-hidden shadow-xl ring-4 ring-primary/10`}
            >
              {user.profile?.avatar ? (
                <Image
                  src={user.profile.avatar}
                  alt={user.displayName || user.username}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                  priority
                />
              ) : (
                <span className="text-3xl md:text-4xl font-bold text-muted-foreground">
                  {(user.displayName || user.username)[0].toUpperCase()}
                </span>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 w-full">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl md:text-3xl">
                    {user.displayName || user.username}
                  </CardTitle>
                  <p className="text-muted-foreground">@{user.username}</p>
                  {user.profile?.bio && (
                    <p className="mt-2 text-sm md:text-base">{user.profile.bio}</p>
                  )}
                </div>
                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {isOwnProfile ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/${username}/dashboard`}>
                        <SettingsIcon className="h-4 w-4 mr-2" />
                        Dashboard
                      </Link>
                    </Button>
                  ) : isAuthenticated ? (
                    <Button
                      variant={isFollowing ? 'outline' : 'default'}
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
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          {/* Stats */}
          <div className="flex items-center gap-8 mb-6 pb-6 border-b">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{postsData?.meta?.total ?? 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Posts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{user.followersCount ?? 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{user.followingCount ?? 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Following</div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
            {user.profile?.location && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-semibold text-muted-foreground">📍</span>
                <div>
                  <div className="text-xs text-muted-foreground">Location</div>
                  <div className="text-sm font-medium">{user.profile.location}</div>
                </div>
              </div>
            )}
            {user.profile?.website && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-semibold text-muted-foreground">🔗</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">Website</div>
                  <a
                    href={user.profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline truncate block"
                  >
                    {user.profile.website}
                  </a>
                </div>
              </div>
            )}
            {user.dateCreated && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-semibold text-muted-foreground">📅</span>
                <div>
                  <div className="text-xs text-muted-foreground">Joined</div>
                  <div className="text-sm font-medium">
                    {new Date(user.dateCreated).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <div className="mt-12" id="media">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="shares">Shares</TabsTrigger>
            <TabsTrigger value="likes">Likes</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts" className="mt-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Posts</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {postsData?.meta?.total ? `${postsData.meta.total} ${postsData.meta.total === 1 ? 'post' : 'posts'}` : 'No posts yet'}
                </p>
              </div>
              {postsData && postsData.data.length > 0 && (
                <Link href={`/${username}/posts`}>
                  <Button variant="outline" size="sm">
                    View all posts
                  </Button>
                </Link>
              )}
            </div>
            {postsData && postsData.data.length > 0 ? (
              <div className="space-y-4">
                {postsData.data.slice(0, 5).map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-lg mb-2">No posts yet</p>
                    <p className="text-sm">
                      {isOwnProfile
                        ? 'Start sharing your thoughts and create your first post!'
                        : `${user.displayName || user.username} hasn't posted anything yet.`}
                    </p>
                    {isOwnProfile && (
                      <Button className="mt-4" asChild>
                        <Link href={`/${username}/posts`}>Create Post</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircleIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">Comments</p>
                  <p className="text-sm">Comments will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shares Tab */}
          <TabsContent value="shares" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <ShareIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">Shares</p>
                  <p className="text-sm">Shared posts will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Likes Tab */}
          <TabsContent value="likes" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <HeartIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">Likes</p>
                  <p className="text-sm">Liked posts will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="mt-6">
            {postsData && postsData.data.length > 0 ? (
              (() => {
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

                return allMedia.length > 0 ? (
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
                ) : (
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
              })()
            ) : (
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
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const params = useParams();
  const username = params.username as string;
  const author = post.user;
  const displayName = author?.displayName || author?.username || 'Unknown';
  const avatar = author?.profile?.avatar;
  const hasMedia = post.mediaUrl || (post.mediaUrls && post.mediaUrls.length > 0);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
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
            <div>
              <Link href={`/${author?.username || ''}`}>
                <p className="font-semibold text-foreground hover:underline">
                  {displayName}
                </p>
              </Link>
              <p className="text-xs text-muted-foreground">
                {formatTimeAgo(post.dateCreated)}
                {post.isEdited && ' · Edited'}
              </p>
            </div>
          </div>
          {post.isPinned && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              Pinned
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Post Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap break-words">{post.content}</p>
        </div>

        {/* Media */}
        {post.mediaUrl && (
          <div className="rounded-lg overflow-hidden">
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
              <div key={idx} className="rounded-lg overflow-hidden">
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
        <div className="flex items-center gap-6 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <HeartIcon className="h-4 w-4" />
            <span>{post.likesCount}</span>
          </Button>
          <Link href={`/posts/${post.id}`}>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <MessageCircleIcon className="h-4 w-4" />
              <span>{post.commentsCount}</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ShareIcon className="h-4 w-4" />
            <span>{post.sharesCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <BookmarkIcon className="h-4 w-4" />
            <span>{post.bookmarksCount}</span>
          </Button>
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <EyeIcon className="h-3 w-3" />
            <span>{post.viewsCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


