'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/core/api/user';
import { postsService } from '@/core/api/posts';
import { Card, CardContent, CardHeader } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { Textarea } from '@/theme/ui/textarea';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import {
  HeartIcon,
  MessageCircleIcon,
  ShareIcon,
  BookmarkIcon,
  EyeIcon,
  ImageIcon,
  XIcon,
  GlobeIcon,
  LockIcon,
  MessageSquareIcon,
  TrashIcon,
} from 'lucide-react';
import { Checkbox } from '@/theme/ui/checkbox';
import { Label } from '@/theme/ui/label';
import type { Post, CreatePostRequest } from '@/core/api/posts';

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

export default function UserPostsPage() {
  const params = useParams();
  const username = params.username as string;
  const [page, setPage] = useState(1);
  const limit = 20;
  const queryClient = useQueryClient();
  const { user: currentUser, isAuthenticated } = useAuth();
  const [postContent, setPostContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [isDraft, setIsDraft] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user data
  const {
    data: user,
    isLoading: isLoadingUser,
    error: userError,
  } = useQuery({
    queryKey: ['user', 'profile', username],
    queryFn: () => userService.getByUsername(username),
    enabled: !!username,
  });

  // Fetch posts by user
  const {
    data: postsData,
    isLoading: isLoadingPosts,
    error: postsError,
    isFetching,
  } = useQuery({
    queryKey: ['posts', 'user', user?.id, page],
    queryFn: () => postsService.getByUser(user!.id, { page, limit }),
    enabled: !!user?.id,
  });

  // Create post mutation (text only)
  const createPostMutation = useMutation({
    mutationFn: (data: CreatePostRequest) => postsService.create(data),
    onSuccess: () => {
      resetForm();
      // Invalidate and refetch posts
      queryClient.invalidateQueries({ queryKey: ['posts', 'user', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  // Create post with files mutation
  const createPostWithFilesMutation = useMutation({
    mutationFn: (formData: FormData) => postsService.upload(formData),
    onSuccess: () => {
      resetForm();
      // Invalidate and refetch posts
      queryClient.invalidateQueries({ queryKey: ['posts', 'user', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const isOwnProfile = isAuthenticated && currentUser?.username === username;

  const resetForm = () => {
    setPostContent('');
    setIsCreating(false);
    setSelectedFiles([]);
    setFilePreviews([]);
    setIsPublic(true);
    setAllowComments(true);
    setIsDraft(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 10 files
    const filesToAdd = files.slice(0, 10 - selectedFiles.length);
    setSelectedFiles((prev) => [...prev, ...filesToAdd]);

    // Create previews
    filesToAdd.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Filter only image and video files
    const mediaFiles = files.filter(
      (file) => file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (mediaFiles.length === 0) return;

    // Limit to 10 files
    const filesToAdd = mediaFiles.slice(0, 10 - selectedFiles.length);
    setSelectedFiles((prev) => [...prev, ...filesToAdd]);

    // Create previews
    filesToAdd.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() || !isOwnProfile) return;

    // If there are files, use the upload endpoint
    if (selectedFiles.length > 0) {
      const formData = new FormData();
      formData.append('content', postContent.trim());
      formData.append('isPublic', String(isPublic));
      formData.append('allowComments', String(allowComments));
      if (isDraft) {
        formData.append('isDraft', 'true');
      }

      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      createPostWithFilesMutation.mutate(formData);
    } else {
      // Text-only post
      const postData: CreatePostRequest = {
        content: postContent.trim(),
        isPublic,
        allowComments,
        isDraft,
      };

      createPostMutation.mutate(postData);
    }
  };

  if (isLoadingUser || isLoadingPosts) {
    return (
      <div className="flex flex-1 flex-col max-w-4xl mx-auto w-full p-4 md:p-8">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (userError || !user) {
    return (
      <div className="flex flex-1 flex-col max-w-4xl mx-auto w-full p-4 md:p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              User not found
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const posts = postsData?.data || [];
  const meta = postsData?.meta;

  return (
      <div className="flex flex-1 flex-col max-w-4xl mx-auto w-full p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Posts by {user.displayName || user.username}
          </h1>
          <p className="text-muted-foreground">
            {meta?.total ? `${meta.total} post${meta.total !== 1 ? 's' : ''}` : 'No posts yet'}
          </p>
        </div>

        {/* Create Post Form - Only show if viewing own profile */}
        {isOwnProfile && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              {!isCreating ? (
                <Button
                  onClick={() => setIsCreating(true)}
                  className="w-full"
                  variant="outline"
                >
                  What's on your mind?
                </Button>
              ) : (
                <div
                  className={`space-y-4 ${
                    isDragging ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {/* Drag & Drop Info */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ImageIcon className="h-3 w-3" />
                    <span>You can drag and drop images or videos here</span>
                  </div>

                  <div
                    className={`relative border-2 border-dashed rounded-lg transition-colors ${
                      isDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent'
                    }`}
                  >
                    <Textarea
                      placeholder={
                        isDragging
                          ? 'Drop your media files here...'
                          : 'Share your thoughts...'
                      }
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      className="min-h-[120px]"
                      maxLength={10000}
                    />
                    {isDragging && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg pointer-events-none">
                        <div className="text-center">
                          <ImageIcon className="h-12 w-12 mx-auto mb-2 text-primary" />
                          <p className="text-sm font-medium text-primary">
                            Drop files to upload
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* File Previews */}
                  {filePreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {filePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                            <Image
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              width={200}
                              height={200}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveFile(index)}
                          >
                            <XIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* File Upload Button */}
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={
                        createPostMutation.isPending ||
                        createPostWithFilesMutation.isPending
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={
                        selectedFiles.length >= 10 ||
                        createPostMutation.isPending ||
                        createPostWithFilesMutation.isPending
                      }
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Add Media ({selectedFiles.length}/10)
                    </Button>
                  </div>

                  {/* Privacy Settings */}
                  <div className="flex flex-wrap items-center gap-4 pt-2 border-t">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isPublic"
                        checked={isPublic}
                        onCheckedChange={(checked) =>
                          setIsPublic(checked === true)
                        }
                        disabled={
                          createPostMutation.isPending ||
                          createPostWithFilesMutation.isPending
                        }
                      />
                      <Label
                        htmlFor="isPublic"
                        className="text-sm font-normal cursor-pointer flex items-center gap-1"
                      >
                        {isPublic ? (
                          <GlobeIcon className="h-3 w-3" />
                        ) : (
                          <LockIcon className="h-3 w-3" />
                        )}
                        {isPublic ? 'Public' : 'Private'}
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="allowComments"
                        checked={allowComments}
                        onCheckedChange={(checked) =>
                          setAllowComments(checked === true)
                        }
                        disabled={
                          createPostMutation.isPending ||
                          createPostWithFilesMutation.isPending
                        }
                      />
                      <Label
                        htmlFor="allowComments"
                        className="text-sm font-normal cursor-pointer flex items-center gap-1"
                      >
                        <MessageSquareIcon className="h-3 w-3" />
                        Allow Comments
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isDraft"
                        checked={isDraft}
                        onCheckedChange={(checked) => setIsDraft(checked === true)}
                        disabled={
                          createPostMutation.isPending ||
                          createPostWithFilesMutation.isPending
                        }
                      />
                      <Label
                        htmlFor="isDraft"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Save as Draft
                      </Label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {postContent.length}/10000
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={resetForm}
                        disabled={
                          createPostMutation.isPending ||
                          createPostWithFilesMutation.isPending
                        }
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreatePost}
                        disabled={
                          !postContent.trim() ||
                          createPostMutation.isPending ||
                          createPostWithFilesMutation.isPending
                        }
                      >
                        {(createPostMutation.isPending ||
                          createPostWithFilesMutation.isPending)
                          ? 'Posting...'
                          : isDraft
                            ? 'Save Draft'
                            : 'Post'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Posts List */}
        {postsError ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-red-500">
                Error loading posts. Please try again later.
              </p>
            </CardContent>
          </Card>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg mb-2">
                  No posts yet
                </p>
                <p className="text-muted-foreground text-sm">
                  {username === user.username
                    ? 'Start sharing your thoughts!'
                    : 'This user hasn\'t posted anything yet.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isFetching}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page === meta.totalPages || isFetching}
                >
                  Next
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
  const isOwnPost = currentUser?.id === post.userId;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      queryClient.setQueriesData({ queryKey: ['posts', 'user'] }, updatePostInCache);
      queryClient.setQueriesData({ queryKey: ['posts'] }, updatePostInCache);
      queryClient.setQueriesData({ queryKey: ['posts', 'feed'] }, updatePostInCache);

      // Invalidate posts queries to refresh data from server (ensures isLiked is correct)
      queryClient.invalidateQueries({ queryKey: ['posts', post.id] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'user'] });
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

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: () => postsService.delete(post.id),
    onSuccess: () => {
      // Invalidate all posts queries to refetch
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      // Also invalidate user-specific queries
      if (post.userId) {
        queryClient.invalidateQueries({ queryKey: ['posts', 'user', post.userId] });
        queryClient.invalidateQueries({ queryKey: ['posts', 'user', 'public', post.userId] });
      }
      setShowDeleteConfirm(false);
    },
  });

  const handleDelete = () => {
    if (showDeleteConfirm) {
      deletePostMutation.mutate();
    } else {
      setShowDeleteConfirm(true);
    }
  };

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
          <div className="flex items-center gap-2">
            {post.isPinned && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Pinned
              </span>
            )}
            {isOwnPost && (
              <div className="relative">
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deletePostMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={deletePostMutation.isPending}
                    >
                      {deletePostMutation.isPending ? 'Deleting...' : 'Confirm'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleDelete}
                    disabled={deletePostMutation.isPending}
                  >
                    <TrashIcon className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                )}
              </div>
            )}
          </div>
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
            onClick={handleLike}
            disabled={!isAuthenticated || likeMutation.isPending}
            className={`gap-2 transition-colors ${
              isLiked
                ? 'text-red-500 bg-red-500/10 hover:text-red-600 hover:bg-red-500/20'
                : 'text-muted-foreground hover:text-red-500 hover:bg-red-500/10'
            }`}
          >
            <HeartIcon className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            <span>{likesCount}</span>
          </Button>
          <Link href={`/${post.user?.username || ''}/posts/${post.id}`}>
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
            onClick={handleShare}
            disabled={!isAuthenticated || shareMutation.isPending}
            className="gap-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
          >
            <ShareIcon className="h-4 w-4" />
            <span>{post.sharesCount || 0}</span>
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

