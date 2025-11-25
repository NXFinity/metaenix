'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { videosService } from '@/core/api/users/videos';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/theme/ui/dialog';
import { Button } from '@/theme/ui/button';
import { Input } from '@/theme/ui/input';
import { Textarea } from '@/theme/ui/textarea';
import { Label } from '@/theme/ui/label';
import { Checkbox } from '@/theme/ui/checkbox';
import { GlobeIcon, LockIcon, XIcon, ImageIcon, UploadIcon } from 'lucide-react';
import { useAlerts } from '@/theme/components/alerts';
import Image from 'next/image';
import { useRef } from 'react';
import type { Video, UpdateVideoRequest } from '@/core/api/users/videos';

interface VideoEditProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: Video;
  onSuccess?: () => void;
}

export const VideoEdit = ({ open, onOpenChange, video, onSuccess }: VideoEditProps) => {
  const { showError, showSuccess } = useAlerts();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description || '');
  const [isPublic, setIsPublic] = useState(video.isPublic);
  const [tags, setTags] = useState<string[]>(video.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Update form when video changes
  useEffect(() => {
    if (video) {
      setTitle(video.title);
      setDescription(video.description || '');
      setIsPublic(video.isPublic);
      setTags(video.tags || []);
      setTagInput('');
    }
  }, [video]);

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateVideoRequest) => {
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
      showSuccess('Video updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['videos', 'user', video.userId] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      if (onSuccess) {
        onSuccess();
      }
      onOpenChange(false);
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

  const handleClose = () => {
    if (!updateMutation.isPending) {
      // Reset form to original values
      setTitle(video.title);
      setDescription(video.description || '');
      setIsPublic(video.isPublic);
      setTags(video.tags || []);
      setTagInput('');
      setThumbnailFile(null);
      setThumbnailPreview(null);
      if (thumbnailInputRef.current) {
        thumbnailInputRef.current.value = '';
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Video</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
              onClick={handleClose}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

