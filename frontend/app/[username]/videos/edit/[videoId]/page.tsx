'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { videosService } from '@/core/api/users/videos';
import { Button } from '@/theme/ui/button';
import { Input } from '@/theme/ui/input';
import { Textarea } from '@/theme/ui/textarea';
import { Label } from '@/theme/ui/label';
import { Checkbox } from '@/theme/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/theme/ui/card';
import { GlobeIcon, LockIcon, XIcon, ImageIcon, UploadIcon, ArrowLeftIcon } from 'lucide-react';
import { useAlerts } from '@/theme/components/alerts';
import Image from 'next/image';
import Link from 'next/link';
import type { UpdateVideoRequest } from '@/core/api/users/videos';
import { userService } from '@/core/api/users/user';
import { getVideoSlug } from '@/core/utils/slug';

export default function VideoEditPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const videoSlug = params.videoId as string; // This is a SLUG from the URL (for SEO)
  const { showError, showSuccess } = useAlerts();
  const queryClient = useQueryClient();
  
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
    
    // Check cache for user's videos
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

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when video loads
  useEffect(() => {
    if (video) {
      setTitle(video.title);
      setDescription(video.description || '');
      setIsPublic(video.isPublic);
      setTags(video.tags || []);
      setThumbnailPreview(video.thumbnailUrl || null);
    }
  }, [video]);

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateVideoRequest) => {
      if (!video?.id) throw new Error('Video ID not available');
      
      // Update video metadata first
      const updatedVideo = await videosService.update(video.id, data);

      // Upload thumbnail if a new one was selected
      if (thumbnailFile) {
        try {
          await videosService.uploadThumbnail(video.id, thumbnailFile);
        } catch (thumbnailError) {
          // Silently handle thumbnail upload failure - don't fail the update
        }
      }

      return updatedVideo;
    },
    onSuccess: () => {
      if (!video?.id) return;
      showSuccess('Video updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['videos', 'user', video.userId] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['videos', video.id] });
      queryClient.invalidateQueries({ queryKey: ['videos', videoSlug] });
      
      // Navigate back to video detail page
      router.push(`/${username}/videos/${getVideoSlug(video)}`);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 'Failed to update video';
      showError(errorMessage);
    },
  });

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 10) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showError(`Image type ${file.type} is not supported. Allowed types: ${allowedTypes.join(', ')}`);
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showError('Thumbnail file size must be less than 5MB');
      return;
    }

    setThumbnailFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setThumbnailPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      showError('Please enter a video title');
      return;
    }

    const updateData: UpdateVideoRequest = {
      title: title.trim(),
      description: description.trim() || null,
      isPublic,
      tags: tags.length > 0 ? tags : undefined,
    };

    updateMutation.mutate(updateData);
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col max-w-4xl mx-auto w-full p-4 md:p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">Loading video...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex flex-1 flex-col max-w-4xl mx-auto w-full p-4 md:p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500">
              {error ? 'Error loading video' : 'Video not found'}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col max-w-4xl mx-auto w-full p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/${username}/videos/${video ? getVideoSlug(video) : videoSlug}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Video
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Edit Video
        </h1>
        <p className="text-muted-foreground mt-2">
          Update your video details and settings
        </p>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Video Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              maxLength={255}
              disabled={updateMutation.isPending}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter video description (optional)"
              rows={4}
              maxLength={5000}
              disabled={updateMutation.isPending}
            />
          </div>

          {/* Thumbnail */}
          <div className="space-y-2">
            <Label>Thumbnail</Label>
            <div className="space-y-2">
              {/* Current thumbnail or preview */}
              {(thumbnailPreview || video.thumbnailUrl) && (
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  <Image
                    src={thumbnailPreview || video.thumbnailUrl || ''}
                    alt="Video thumbnail"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 500px"
                  />
                  {thumbnailFile && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                      New
                    </div>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 left-2 h-8 w-8"
                    onClick={handleRemoveThumbnail}
                    disabled={updateMutation.isPending}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Upload button */}
              {!thumbnailPreview && !video.thumbnailUrl && (
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    No thumbnail set
                  </p>
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleThumbnailSelect}
                    className="hidden"
                    disabled={updateMutation.isPending}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => thumbnailInputRef.current?.click()}
                    disabled={updateMutation.isPending}
                  >
                    <UploadIcon className="h-4 w-4 mr-2" />
                    Upload Thumbnail
                  </Button>
                </div>
              )}

              {/* Change thumbnail button */}
              {(thumbnailPreview || video.thumbnailUrl) && !thumbnailFile && (
                <div>
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleThumbnailSelect}
                    className="hidden"
                    disabled={updateMutation.isPending}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => thumbnailInputRef.current?.click()}
                    disabled={updateMutation.isPending}
                  >
                    <UploadIcon className="h-4 w-4 mr-2" />
                    Change Thumbnail
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Upload a custom thumbnail image (JPEG, PNG, or WebP, max 5MB)
            </p>
          </div>

          {/* Privacy */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit-isPublic"
              checked={isPublic}
              onCheckedChange={(checked) => setIsPublic(checked === true)}
              disabled={updateMutation.isPending}
            />
            <Label
              htmlFor="edit-isPublic"
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

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags (optional)</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add a tag and press Enter"
                disabled={updateMutation.isPending || tags.length >= 10}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={updateMutation.isPending || tags.length >= 10 || !tagInput.trim()}
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <div
                    key={tag}
                    className="flex items-center gap-1 bg-muted text-muted-foreground px-2 py-1 rounded text-sm"
                  >
                    <span>#{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      disabled={updateMutation.isPending}
                      className="hover:text-foreground"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {tags.length}/10 tags
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => router.push(`/${username}/videos/${video ? getVideoSlug(video) : videoSlug}`)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !title.trim() ||
                updateMutation.isPending
              }
            >
              {updateMutation.isPending ? 'Updating...' : 'Update Video'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

