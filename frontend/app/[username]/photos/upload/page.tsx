'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { photosService } from '@/core/api/users/photos';
import { Button } from '@/theme/ui/button';
import { Input } from '@/theme/ui/input';
import { Textarea } from '@/theme/ui/textarea';
import { Label } from '@/theme/ui/label';
import { Checkbox } from '@/theme/ui/checkbox';
import { Progress } from '@/theme/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/theme/ui/card';
import { ImageIcon, XIcon, UploadIcon, GlobeIcon, LockIcon, ArrowLeftIcon } from 'lucide-react';
import { useAlerts } from '@/theme/components/alerts';
import Link from 'next/link';
import Image from 'next/image';

export default function PhotoUploadPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const { showError, showSuccess } = useAlerts();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const photo = await photosService.upload(
        formData,
        (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded / progressEvent.total) * 100
            );
            setUploadProgress(progress);
          }
        },
      );
      return photo;
    },
    onSuccess: (photo) => {
      resetForm();
      showSuccess('Photo uploaded successfully!');

      // Invalidate all photo-related queries to update UI everywhere
      queryClient.invalidateQueries({ queryKey: ['photos'] });

      // Navigate back to photos page
      router.push(`/${username}/photos`);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 'Failed to upload photo';
      showError(errorMessage);
      setUploadProgress(0);
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setIsPublic(true);
    setTags([]);
    setTagInput('');
    setSelectedFile(null);
    setFilePreview(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showError(`Image type ${file.type} is not supported. Allowed types: ${allowedTypes.join(', ')}`);
      return;
    }

    // Validate file size (20MB max)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      showError('Image file size must be less than 20MB');
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

  const handleSubmit = () => {
    if (!selectedFile) {
      showError('Please select an image file');
      return;
    }

    if (!title.trim()) {
      showError('Please enter a photo title');
      return;
    }

    const formData = new FormData();
    formData.append('photo', selectedFile);
    formData.append('title', title.trim());
    if (description.trim()) {
      formData.append('description', description.trim());
    }
    formData.append('isPublic', String(isPublic));
    // Append tags as individual entries (NestJS will parse them as an array)
    tags.forEach((tag) => {
      formData.append('tags', tag);
    });

    uploadMutation.mutate(formData);
  };

  return (
    <div className="flex flex-1 flex-col max-w-4xl mx-auto w-full p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/${username}/photos`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Photos
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Upload Photo
        </h1>
        <p className="text-muted-foreground mt-2">
          Upload and share your photo content
        </p>
      </div>

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle>Photo Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Photo File *</Label>
            {!selectedFile ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Select an image file (JPEG, PNG, GIF, or WebP)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploadMutation.isPending}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                >
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Choose Photo
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative w-full max-h-96 bg-muted rounded-lg overflow-hidden">
                  {filePreview ? (
                    <Image
                      src={filePreview}
                      alt="Photo preview"
                      width={800}
                      height={600}
                      className="w-full h-auto object-contain"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-64 flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveFile}
                  disabled={uploadMutation.isPending}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {(uploadMutation.isPending || uploadProgress > 0) && (
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

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter photo title"
              maxLength={255}
              disabled={uploadMutation.isPending}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter photo description (optional)"
              rows={4}
              maxLength={5000}
              disabled={uploadMutation.isPending}
            />
          </div>

          {/* Privacy */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPublic"
              checked={isPublic}
              onCheckedChange={(checked) => setIsPublic(checked === true)}
              disabled={uploadMutation.isPending}
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
                disabled={uploadMutation.isPending || tags.length >= 10}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={uploadMutation.isPending || tags.length >= 10 || !tagInput.trim()}
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
                      disabled={uploadMutation.isPending}
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
              onClick={() => router.push(`/${username}/photos`)}
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !selectedFile ||
                !title.trim() ||
                uploadMutation.isPending
              }
            >
              {uploadMutation.isPending
                ? uploadProgress >= 100
                  ? 'Processing...'
                  : `Uploading... ${uploadProgress}%`
                : 'Upload Photo'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

