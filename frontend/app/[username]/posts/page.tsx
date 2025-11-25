'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/core/api/users/user';
import { postsService } from '@/core/api/users/posts';
import { analyticsService } from '@/core/api/data/analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { Textarea } from '@/theme/ui/textarea';
import { PostSkeleton } from '@/theme/components/loading/PostSkeleton';
import { LoadingSpinner } from '@/theme/components/loading/LoadingSpinner';
import { ErrorState } from '@/theme/components/error/ErrorState';
import { EmptyState } from '@/theme/components/empty/EmptyState';
import { PostCard } from '@/theme/components/posts/Posts';
import { FileTextIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/theme/ui/dialog';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef, useEffect, useMemo } from 'react';
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
  ChevronLeft,
  ChevronRight,
  VideoIcon,
  UploadIcon,
  SearchIcon,
  FilterIcon,
  FolderIcon,
  FolderPlusIcon,
  PlusIcon,
  CheckIcon,
} from 'lucide-react';
import { Checkbox } from '@/theme/ui/checkbox';
import { Label } from '@/theme/ui/label';
import { Progress } from '@/theme/ui/progress';
import { Input } from '@/theme/ui/input';
import type { Post, CreatePostRequest, Collection } from '@/core/api/users/posts';
import { videosService } from '@/core/api/users/videos';
import { useRouter } from 'next/navigation';

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

// Helper function to check if a URL is a video
const isVideoUrl = (url: string): boolean => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.quicktime'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some((ext) => lowerUrl.includes(ext));
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
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [isDraft, setIsDraft] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showVideoSelect, setShowVideoSelect] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'text' | 'image' | 'video' | 'document' | 'mixed' | null>(null);
  const [selectedPostForCollection, setSelectedPostForCollection] = useState<Post | null>(null);
  const [isAddToCollectionDialogOpen, setIsAddToCollectionDialogOpen] = useState(false);

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

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      const wasSearchActive = debouncedSearchQuery.trim().length > 0;
      const willBeSearchActive = searchQuery.trim().length > 0;
      
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // Reset to first page when search changes
      
      // Clear filter when search becomes active (transitions from empty to non-empty)
      if (!wasSearchActive && willBeSearchActive && filterType !== null) {
        setFilterType(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearchQuery, filterType]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [filterType]);

  // Determine which query to use
  const isSearchActive = debouncedSearchQuery.trim().length > 0;
  const isFilterActive = filterType !== null;
  const useSearchOrFilter = isSearchActive || isFilterActive;

  // Fetch posts by user (default)
  const {
    data: postsData,
    isLoading: isLoadingPosts,
    error: postsError,
    isFetching,
  } = useQuery({
    queryKey: ['posts', 'user', user?.id, page, isSearchActive ? debouncedSearchQuery : null, isFilterActive ? filterType : null],
    queryFn: async () => {
      if (isSearchActive) {
        return await postsService.search(debouncedSearchQuery, { page, limit });
      } else if (isFilterActive) {
        return await postsService.filter(filterType!, { page, limit });
      } else {
        return await postsService.getByUser(user!.id, { page, limit });
      }
    },
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

  // Sort posts: pinned posts first, then by date (newest first)
  // Must be after useQuery but before early returns
  const posts = useMemo(() => {
    const allPosts = postsData?.data || [];
    return [...allPosts].sort((a, b) => {
      // Pinned posts first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // Then by date (newest first)
      return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
    });
  }, [postsData?.data]);
  const meta = postsData?.meta;

  // Helper functions - must be before early returns
  const handleClearSearch = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
  };

  const handleClearFilter = () => {
    setFilterType(null);
  };

  // Check if viewing own profile
  const isOwnProfile = isAuthenticated && currentUser?.username === username;

  // Fetch collections
  const {
    data: collectionsData,
    isLoading: isLoadingCollections,
  } = useQuery({
    queryKey: ['collections', user?.id],
    queryFn: () => postsService.getCollections({ page: 1, limit: 50 }),
    enabled: !!user?.id && isOwnProfile,
  });

  // Add post to collection mutation
  const addToCollectionMutation = useMutation({
    mutationFn: ({ collectionId, postId }: { collectionId: string; postId: string }) =>
      postsService.addToCollection(collectionId, postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['collectionPosts'] });
      setIsAddToCollectionDialogOpen(false);
      setSelectedPostForCollection(null);
    },
  });

  // Remove post from collection mutation
  const removeFromCollectionMutation = useMutation({
    mutationFn: ({ collectionId, postId }: { collectionId: string; postId: string }) =>
      postsService.removeFromCollection(collectionId, postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['collectionPosts'] });
    },
  });

  const handleAddToCollection = (collectionId: string) => {
    if (!selectedPostForCollection) return;
    addToCollectionMutation.mutate({
      collectionId,
      postId: selectedPostForCollection.id,
    });
  };

  const handleRemoveFromCollection = (collectionId: string) => {
    if (!selectedPostForCollection) return;
    removeFromCollectionMutation.mutate({
      collectionId,
      postId: selectedPostForCollection.id,
    });
  };

  const postTypes: Array<{ value: 'text' | 'image' | 'video' | 'document' | 'mixed'; label: string }> = [
    { value: 'text', label: 'Text' },
    { value: 'image', label: 'Image' },
    { value: 'video', label: 'Video' },
    { value: 'document', label: 'Document' },
    { value: 'mixed', label: 'Mixed' },
  ];

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
    mutationFn: (formData: FormData) => {
      setIsUploading(true);
      setUploadProgress(0);
      return postsService.upload(
        formData,
        (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded / progressEvent.total) * 100
            );
            setUploadProgress(progress);
            // If we reach 100%, we're still uploading (processing on server)
            // Keep showing progress but indicate it's processing
            if (progress >= 100) {
              setUploadProgress(100);
            }
          }
        },
      );
    },
    onSuccess: (postResponse) => {
      // Reset form after successful upload
      resetForm();
      // Invalidate and refetch posts
      queryClient.invalidateQueries({ queryKey: ['posts', 'user', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      // Invalidate videos to refresh thumbnails
      queryClient.invalidateQueries({ queryKey: ['videos', 'user', user?.id] });
    },
    onError: () => {
      setUploadProgress(0);
      setIsUploading(false);
    },
    onSettled: () => {
      // Reset progress state after mutation completes (success or error)
      setUploadProgress(0);
      setIsUploading(false);
    },
  });

  const resetForm = () => {
    setPostContent('');
    setIsCreating(false);
    setSelectedFiles([]);
    setFilePreviews([]);
    setSelectedVideoIds([]);
    setIsPublic(true);
    setAllowComments(true);
    setIsDraft(false);
    setUploadProgress(0);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Filter only image files (videos use VideoUpload component)
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length === 0) return;

    // Limit to 10 files
    const filesToAdd = imageFiles.slice(0, 10 - selectedFiles.length);
    setSelectedFiles((prev) => [...prev, ...filesToAdd]);

    // Create previews for images
    filesToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveVideo = (videoId: string) => {
    setSelectedVideoIds((prev) => prev.filter((id) => id !== videoId));
  };

  // Fetch user's videos for selection
  const {
    data: userVideosData,
    isLoading: isLoadingUserVideos,
  } = useQuery({
    queryKey: ['videos', 'user', user?.id, 'select'],
    queryFn: () => videosService.getByUser(user!.id, { page: 1, limit: 100, sortBy: 'dateCreated', sortOrder: 'DESC' }),
    enabled: !!user?.id && showVideoSelect,
  });

  const userVideos = userVideosData?.data || [];

  const handleSelectVideo = (videoId: string) => {
    if (!selectedVideoIds.includes(videoId)) {
      setSelectedVideoIds((prev) => [...prev, videoId]);
    }
    setShowVideoSelect(false);
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

    // Filter only image files (videos use VideoUpload component)
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length === 0) return;

    // Limit to 10 files
    const filesToAdd = imageFiles.slice(0, 10 - selectedFiles.length);
    setSelectedFiles((prev) => [...prev, ...filesToAdd]);

    // Create previews for images
    filesToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Extract URL from content
  const extractUrlFromContent = (content: string): string | null => {
    const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
    const matches = content.match(urlRegex);
    if (matches && matches.length > 0) {
      try {
        // Validate URL and clean it (remove trailing punctuation)
        let url = matches[0];
        // Remove common trailing punctuation
        url = url.replace(/[.,;:!?]+$/, '');
        new URL(url);
        return url;
      } catch {
        return null;
      }
    }
    return null;
  };

  const handleCreatePost = async () => {
    if (!isOwnProfile) return;

    const content = postContent.trim();
    const hasContent = content.length > 0;
    const hasFiles = selectedFiles.length > 0;
    const hasVideos = selectedVideoIds.length > 0;

    // Require either content, files, or videos
    if (!hasContent && !hasFiles && !hasVideos) {
      return;
    }

    const detectedUrl = extractUrlFromContent(content);

    // If there are files or videos, use the appropriate endpoint
    if (hasFiles || hasVideos) {
      if (hasFiles) {
        // Has images - use upload endpoint
        const formData = new FormData();
        if (hasContent) {
          formData.append('content', content);
        } else {
          formData.append('content', '');
        }
        formData.append('isPublic', String(isPublic));
        formData.append('allowComments', String(allowComments));
        if (isDraft) {
          formData.append('isDraft', 'true');
        }
        if (detectedUrl) {
          formData.append('linkUrl', detectedUrl);
        }
        if (hasVideos) {
          selectedVideoIds.forEach((videoId) => {
            formData.append('videoIds', videoId);
          });
        }

        selectedFiles.forEach((file) => {
          formData.append('files', file);
        });

        createPostWithFilesMutation.mutate(formData);
      } else {
        // Only videos, no images - use regular upload endpoint
        const postData: CreatePostRequest = {
          content: hasContent ? content : '',
          isPublic,
          allowComments,
          isDraft,
          videoIds: selectedVideoIds,
        };

        if (detectedUrl) {
          postData.linkUrl = detectedUrl;
        }

        createPostMutation.mutate(postData);
      }
    } else {
      // Text-only post
      const postData: CreatePostRequest = {
        content,
        isPublic,
        allowComments,
        isDraft,
      };

      if (detectedUrl) {
        postData.linkUrl = detectedUrl;
      }

      createPostMutation.mutate(postData);
    }
  };

  if (isLoadingUser || isLoadingPosts) {
    return (
      <div className="flex flex-1 flex-col max-w-4xl mx-auto w-full p-4 md:p-8">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (userError || !user) {
    return (
      <div className="flex flex-1 flex-col max-w-4xl mx-auto w-full p-4 md:p-8">
        <ErrorState
          title="User not found"
          message="The user you're looking for doesn't exist or has been removed."
        />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-1 flex-col max-w-[1600px] mx-auto w-full p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Posts by {user.displayName || user.username}
          </h1>
          <p className="text-muted-foreground">
            {meta?.total ? `${meta.total} post${meta.total !== 1 ? 's' : ''}` : 'No posts yet'}
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
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
                    <span>You can drag and drop images here</span>
                  </div>

                  <div
                    className={`relative border-2 border-dashed rounded-lg transition-colors ${
                      isDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent'
                    }`}
                  >
                    <Textarea
                      id="post-content"
                      placeholder={
                        isDragging
                          ? 'Drop your media files here...'
                          : 'Share your thoughts...'
                      }
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      className="min-h-[120px]"
                      maxLength={10000}
                      aria-label="Post content"
                      aria-describedby="post-content-help"
                    />
                    <div id="post-content-help" className="sr-only">
                      Enter your post content. Maximum 10,000 characters.
                    </div>
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

                  {/* Upload Progress */}
                  {(isUploading || createPostWithFilesMutation.isPending) && uploadProgress >= 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {uploadProgress >= 100 ? 'Processing...' : 'Uploading...'}
                        </span>
                        <span className="text-muted-foreground">
                          {uploadProgress >= 100 ? 'Processing' : `${uploadProgress}%`}
                        </span>
                      </div>
                      <Progress
                        value={uploadProgress >= 100 ? 100 : uploadProgress}
                        className="h-2"
                      />
                    </div>
                  )}

                  {/* File Previews */}
                  {filePreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {filePreviews.map((preview, index) => {
                        const file = selectedFiles[index];
                        const isVideo = file?.type.startsWith('video/');
                        return (
                          <div key={index} className="relative group">
                            <div className="aspect-square rounded-lg overflow-hidden bg-muted relative">
                              <Image
                                src={preview}
                                alt={`Preview ${index + 1}`}
                                width={200}
                                height={200}
                                className="w-full h-full object-cover"
                              />
                              {isVideo && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                                    <svg
                                      className="w-6 h-6 text-black ml-1"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveFile(index)}
                              aria-label={`Remove file ${index + 1}`}
                            >
                              <XIcon className="h-3 w-3" aria-hidden="true" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* File Upload Button */}
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
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
                      Add Images ({selectedFiles.length}/10)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowVideoSelect(true)}
                      disabled={
                        createPostMutation.isPending ||
                        createPostWithFilesMutation.isPending
                      }
                    >
                      <VideoIcon className="h-4 w-4 mr-2" />
                      Add Video
                    </Button>
                  </div>

                  {/* Selected Videos */}
                  {selectedVideoIds.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        Selected Videos ({selectedVideoIds.length})
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {selectedVideoIds.map((videoId) => {
                          const video = userVideos.find((v) => v.id === videoId);
                          return (
                            <div
                              key={videoId}
                              className="relative group bg-muted rounded-lg overflow-hidden"
                            >
                              {video?.thumbnailUrl ? (
                                <div className="aspect-video relative">
                                  <Image
                                    src={video.thumbnailUrl}
                                    alt={video.title || 'Video thumbnail'}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 50vw, 33vw"
                                  />
                                </div>
                              ) : (
                                <div className="aspect-video flex items-center justify-center bg-muted">
                                  <VideoIcon className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                              <div className="p-2">
                                <p className="text-xs font-medium text-foreground line-clamp-1">
                                  {video?.title || `Video ${videoId.substring(0, 8)}...`}
                                </p>
                              </div>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemoveVideo(videoId)}
                                aria-label={`Remove video: ${video?.title || 'Video'}`}
                              >
                                <XIcon className="h-3 w-3" aria-hidden="true" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

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
                          (!postContent.trim() && selectedFiles.length === 0 && selectedVideoIds.length === 0) ||
                          createPostMutation.isPending ||
                          createPostWithFilesMutation.isPending ||
                          isUploading
                        }
                      >
                        {isUploading
                          ? uploadProgress >= 100
                            ? 'Processing...'
                            : `Uploading... ${uploadProgress}%`
                          : (createPostMutation.isPending ||
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

        {/* Video Select Dialog */}
        <Dialog open={showVideoSelect} onOpenChange={setShowVideoSelect}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Video to Post</DialogTitle>
              <DialogDescription>
                Upload a new video or select from your existing videos to add to your post.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Upload New Video Button */}
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <VideoIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a new video with compression
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    setShowVideoSelect(false);
                    router.push(`/${username}/videos/upload`);
                  }}
                >
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Upload New Video
                </Button>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or choose from your videos
                  </span>
                </div>
              </div>

              {/* User's Videos List */}
              {isLoadingUserVideos ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading videos...
                </div>
              ) : userVideos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <VideoIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No videos yet. Upload your first video!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {userVideos
                    .filter((video) => video.status === 'ready' && video.videoUrl)
                    .map((video) => (
                      <div
                        key={video.id}
                        className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                          selectedVideoIds.includes(video.id)
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => handleSelectVideo(video.id)}
                      >
                        {video.thumbnailUrl ? (
                          <div className="aspect-video relative">
                            <Image
                              src={video.thumbnailUrl}
                              alt={video.title}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, 33vw"
                            />
                          </div>
                        ) : (
                          <div className="aspect-video flex items-center justify-center bg-muted">
                            <VideoIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="p-2 bg-background">
                          <p className="text-xs font-medium text-foreground line-clamp-2">
                            {video.title}
                          </p>
                          {selectedVideoIds.includes(video.id) && (
                            <div className="mt-1 text-xs text-primary font-medium">
                              ✓ Selected
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

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
          <EmptyState
            icon={<MessageSquareIcon className="h-12 w-12 text-muted-foreground" />}
            title={isSearchActive || isFilterActive ? "No posts found" : "No posts yet"}
            description={
              isSearchActive
                ? `No posts match your search "${debouncedSearchQuery}". Try different keywords.`
                : isFilterActive
                ? `No ${postTypes.find(t => t.value === filterType)?.label.toLowerCase()} posts found.`
                : isOwnProfile
                ? "Start sharing your thoughts and upload your first post!"
                : `${user.displayName || user.username} hasn't posted anything yet.`
            }
            action={
              isOwnProfile && !isSearchActive && !isFilterActive
                ? {
                    label: 'Create Your First Post',
                    onClick: () => setIsCreating(true),
                  }
                : undefined
            }
          />
        ) : (
          <div className="space-y-6">
            {/* Results Summary */}
            {(isSearchActive || isFilterActive) && meta && (
              <div className="text-sm text-muted-foreground px-2">
                Found {meta.total} {meta.total === 1 ? 'post' : 'posts'}
                {isSearchActive && ` matching "${debouncedSearchQuery}"`}
                {isFilterActive && ` of type ${postTypes.find(t => t.value === filterType)?.label}`}
              </div>
            )}

            {/* Posts List */}
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onAddToCollection={isOwnProfile ? (post) => {
                    setSelectedPostForCollection(post);
                    setIsAddToCollectionDialogOpen(true);
                  } : undefined}
                />
              ))}
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isFetching}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Page
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {meta.page}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    of {meta.totalPages}
                  </span>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page === meta.totalPages || isFetching}
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
          </div>

          {/* Right Column - Search and Filter (1/3 width) */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <SearchIcon className="h-5 w-5 text-primary flex-shrink-0" />
                    <h2 className="text-lg font-semibold leading-none">Search & Filter</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Search all public posts across the platform, or filter by post type
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Search Input */}
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type="text"
                        placeholder="Search all public posts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-10 h-11 text-base"
                        aria-label="Search all public posts"
                      />
                      {searchQuery && (
                        <button
                          onClick={handleClearSearch}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Clear search"
                          type="button"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Filter Buttons */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FilterIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground font-medium">Filter by type:</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {postTypes.map((type) => (
                          <Button
                            key={type.value}
                            variant={filterType === type.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilterType(filterType === type.value ? null : type.value)}
                            aria-label={`Filter by ${type.label} posts`}
                            aria-pressed={filterType === type.value}
                            disabled={isSearchActive}
                            className="w-full justify-start"
                          >
                            {type.label}
                          </Button>
                        ))}
                      </div>
                      {filterType && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearFilter}
                          className="w-full"
                          aria-label="Clear filter"
                          disabled={isSearchActive}
                        >
                          Clear filter
                        </Button>
                      )}
                      {isSearchActive && (
                        <p className="text-xs text-muted-foreground">
                          (Filter disabled while searching)
                        </p>
                      )}
                    </div>

                    {/* Active Search/Filter Indicator */}
                    {(isSearchActive || isFilterActive) && (
                      <div className="space-y-2 pt-2 border-t">
                        <div className="text-sm text-muted-foreground">
                          {isSearchActive && (
                            <div>
                              <strong className="text-foreground">Searching:</strong> "{debouncedSearchQuery}"
                            </div>
                          )}
                          {isFilterActive && (
                            <div>
                              <strong className="text-foreground">Filter:</strong> {postTypes.find(t => t.value === filterType)?.label}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            handleClearSearch();
                            handleClearFilter();
                          }}
                          className="w-full text-xs"
                        >
                          Clear all
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Collections Section */}
              {isOwnProfile && (
                <Card className="mt-6 border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderIcon className="h-5 w-5 text-primary flex-shrink-0" />
                        <h2 className="text-lg font-semibold leading-none">Collections</h2>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <Link href={`/${username}/posts/collection`}>
                          <PlusIcon className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Organize your posts into collections
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {isLoadingCollections ? (
                      <div className="flex items-center justify-center py-8">
                        <LoadingSpinner size="sm" />
                      </div>
                    ) : !collectionsData?.data || collectionsData.data.length === 0 ? (
                      <div className="text-center py-6">
                        <FolderIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-3">
                          No collections yet
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link href={`/${username}/posts/collection`}>
                            <FolderPlusIcon className="h-4 w-4 mr-2" />
                            Create Collection
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {collectionsData.data.map((collection) => (
                          <div
                            key={collection.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors group"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="flex-shrink-0">
                                {collection.coverImage ? (
                                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted">
                                    <Image
                                      src={collection.coverImage}
                                      alt={collection.name}
                                      width={40}
                                      height={40}
                                      className="w-full h-full object-cover"
                                      unoptimized
                                    />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                                    <FolderIcon className="h-5 w-5 text-primary" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate">
                                    {collection.name}
                                  </p>
                                  {collection.isPublic ? (
                                    <GlobeIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  ) : (
                                    <LockIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {collection.postsCount} post{collection.postsCount !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Link href={`/${username}/posts/collection?collection=${collection.id}`}>
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          asChild
                        >
                          <Link href={`/${username}/posts/collection`}>
                            <FolderPlusIcon className="h-4 w-4 mr-2" />
                            View All Collections
                          </Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add to Collection Dialog */}
      <Dialog open={isAddToCollectionDialogOpen} onOpenChange={setIsAddToCollectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Collection</DialogTitle>
            <DialogDescription>
              Select a collection to add this post to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto py-4">
            {isLoadingCollections ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="sm" />
              </div>
            ) : !collectionsData?.data || collectionsData.data.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">
                  No collections yet. Create one first.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <Link href={`/${username}/posts/collection`}>
                    <FolderPlusIcon className="h-4 w-4 mr-2" />
                    Create Collection
                  </Link>
                </Button>
              </div>
            ) : (
              collectionsData.data.map((collection) => {
                // Check if post is already in this collection
                // Note: We'd need to check post.collections or make an API call
                const isInCollection = false; // TODO: Check if post is in collection
                return (
                  <div
                    key={collection.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {collection.coverImage ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <Image
                            src={collection.coverImage}
                            alt={collection.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
                          <FolderIcon className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {collection.name}
                          </p>
                          {collection.isPublic ? (
                            <GlobeIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <LockIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {collection.postsCount} post{collection.postsCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    {isInCollection ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveFromCollection(collection.id)}
                        disabled={removeFromCollectionMutation.isPending}
                      >
                        <CheckIcon className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAddToCollection(collection.id)}
                        disabled={addToCollectionMutation.isPending}
                      >
                        Add
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddToCollectionDialogOpen(false)}
              disabled={addToCollectionMutation.isPending || removeFromCollectionMutation.isPending}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// PostCard component removed - using PostCard from @/theme/components/posts/Posts instead

