'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { videosService } from '@/core/api/users/videos';
import { Button } from '@/theme/ui/button';
import { Input } from '@/theme/ui/input';
import { Textarea } from '@/theme/ui/textarea';
import { Label } from '@/theme/ui/label';
import { Checkbox } from '@/theme/ui/checkbox';
import { Progress } from '@/theme/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/theme/ui/card';
import { VideoIcon, XIcon, UploadIcon, GlobeIcon, LockIcon, ArrowLeftIcon, DownloadIcon } from 'lucide-react';
import { useAlerts } from '@/theme/components/alerts';
import { extractVideoThumbnail } from '@/theme/components/videos/utils';
import { useVideoCompression } from '@/core/hooks';
import Link from 'next/link';

export default function VideoUploadPage() {
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
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [originalFileSize, setOriginalFileSize] = useState<number>(0);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStartTime, setProcessingStartTime] = useState<Date | null>(null);
  const [processingTime, setProcessingTime] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Video compression hook
  const {
    isCompressing,
    progress: compressionProgress,
    stage: compressionStage,
    message: compressionMessage,
    error: compressionError,
    compress,
    cancel: cancelCompression,
  } = useVideoCompression();
  
  // Cleanup compression on unmount or when navigating away
  useEffect(() => {
    return () => {
      // Cancel any ongoing compression when component unmounts
      cancelCompression();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run cleanup on unmount

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Upload video first
      const video = await videosService.upload(
        formData,
        (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded / progressEvent.total) * 100
            );
            setUploadProgress(progress);
            // Start processing timer when upload reaches 100%
            if (progress >= 100 && !processingStartTime) {
              setProcessingStartTime(new Date());
            }
          }
        },
      );

      // Upload thumbnail if available
      if (thumbnailFile && video.id) {
        try {
          await videosService.uploadThumbnail(video.id, thumbnailFile);
              } catch (thumbnailError) {
                // Silently fail thumbnail upload - don't fail video upload if thumbnail fails
              }
      }

      return video;
    },
    onSuccess: (video) => {
      resetForm();
      showSuccess('Video uploaded successfully!');

      // Invalidate all video-related queries to update UI everywhere
      queryClient.invalidateQueries({ queryKey: ['videos'] });

      // Navigate back to videos page
      router.push(`/${username}/videos`);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 'Failed to upload video';
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
    setCompressedFile(null);
    setOriginalFileSize(0);
    setFilePreview(null);
    setThumbnailFile(null);
    setUploadProgress(0);
    setProcessingStartTime(null);
    setProcessingTime('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    cancelCompression();
  };

  // Calculate and update processing time
  useEffect(() => {
    if (!processingStartTime || uploadProgress < 100) {
      setProcessingTime('');
      return;
    }

    const calculateProcessingTime = () => {
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - processingStartTime.getTime()) / 1000);

      if (diffInSeconds < 60) {
        setProcessingTime(`${diffInSeconds}s`);
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        const seconds = diffInSeconds % 60;
        setProcessingTime(`${minutes}m ${seconds}s`);
      } else {
        const hours = Math.floor(diffInSeconds / 3600);
        const minutes = Math.floor((diffInSeconds % 3600) / 60);
        setProcessingTime(`${hours}h ${minutes}m`);
      }
    };

    // Calculate immediately
    calculateProcessingTime();

    // Update every second
    const interval = setInterval(calculateProcessingTime, 1000);

    return () => clearInterval(interval);
  }, [processingStartTime, uploadProgress]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      showError(`Video type ${file.type} is not supported. Allowed types: ${allowedTypes.join(', ')}`);
      return;
    }

    // Validate file size (600MB max)
    const maxSize = 600 * 1024 * 1024; // 600MB
    if (file.size > maxSize) {
      showError('Video file size must be less than 600MB');
      return;
    }

    setSelectedFile(file);
    setOriginalFileSize(file.size);
    setCompressedFile(null); // Reset compressed file when new file is selected

    // Auto-compress if file is larger than 50MB
    const compressionThreshold = 50 * 1024 * 1024; // 50MB
    if (file.size > compressionThreshold) {
      // Start compression automatically
      // Optimized for speed and compression: 720p for most files, aggressive CRF
      compress(file, {
        maxWidth: 1280, // Always use 720p for better compression
        maxHeight: 720,
        quality: 'fast', // Uses ultrafast preset and CRF 32 for maximum speed and compression
      }).then((result) => {
        if (result) {
          setCompressedFile(result.file);
          showSuccess(
            `Video compressed! Size reduced from ${(file.size / (1024 * 1024)).toFixed(2)}MB to ${(result.compressedSize / (1024 * 1024)).toFixed(2)}MB (${result.compressionRatio.toFixed(1)}% reduction)`,
          );
        } else if (compressionError) {
          showError(`Compression failed: ${compressionError}. You can still upload the original file.`);
        }
      }).catch((error) => {
        showError('Compression failed. You can still upload the original file.');
      });
    }

    // Extract and upload thumbnail preview
    try {
      const extractedThumbnail = await extractVideoThumbnail(file);
      setThumbnailFile(extractedThumbnail);
      // Create preview from thumbnail
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(extractedThumbnail);
    } catch (error) {
      setThumbnailFile(null);
      // Fallback to basic video preview
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnail = canvas.toDataURL('image/jpeg');
          setFilePreview(thumbnail);
        }
      };
      video.src = URL.createObjectURL(file);
    }
  };

  const handleRemoveFile = () => {
    // Cancel compression first
    cancelCompression();
    
    // Then clear file state
    setSelectedFile(null);
    setCompressedFile(null);
    setOriginalFileSize(0);
    setFilePreview(null);
    setThumbnailFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadCompressed = () => {
    if (!compressedFile) return;
    
    // Create a download link
    const url = URL.createObjectURL(compressedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = compressedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      showError('Please select a video file');
      return;
    }

    if (!title.trim()) {
      showError('Please enter a video title');
      return;
    }

    const formData = new FormData();
    // Use compressed file if available, otherwise use original
    const fileToUpload = compressedFile || selectedFile;
    if (!fileToUpload) {
      showError('No file selected');
      return;
    }
    formData.append('video', fileToUpload);
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
          href={`/${username}/videos`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Videos
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Upload Video
        </h1>
        <p className="text-muted-foreground mt-2">
          Upload and share your video content
        </p>
      </div>

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle>Video Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Video File *</Label>
            {!selectedFile ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <VideoIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Select a video file (MP4, WebM, or QuickTime)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
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
                  Choose Video
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  {filePreview ? (
                    <img
                      src={filePreview}
                      alt="Video preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <VideoIcon className="h-12 w-12 text-muted-foreground" />
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

          {/* Compression Progress */}
          {isCompressing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{compressionMessage}</span>
                <span className="text-muted-foreground">{compressionProgress}%</span>
              </div>
              <Progress value={compressionProgress} className="h-2" />
              {compressionStage === 'compressing' && (
                <p className="text-xs text-muted-foreground">
                  This may take several minutes for large videos. You can continue filling out the form.
                </p>
              )}
            </div>
          )}

          {/* Compression Error */}
          {compressionError && !isCompressing && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">
                Compression failed: {compressionError}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                You can still upload the original file.
              </p>
            </div>
          )}

          {/* Compression Success Info */}
          {compressedFile && !isCompressing && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                    ✓ Video compressed successfully!
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Original: {(originalFileSize / (1024 * 1024)).toFixed(2)}MB → 
                    Compressed: {(compressedFile.size / (1024 * 1024)).toFixed(2)}MB
                    ({(((originalFileSize - compressedFile.size) / originalFileSize) * 100).toFixed(1)}% reduction)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCompressed}
                  disabled={uploadMutation.isPending}
                  className="flex-shrink-0"
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {(uploadMutation.isPending || uploadProgress > 0) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {uploadProgress >= 100
                    ? `Processing...${processingTime ? ` (${processingTime})` : ''}`
                    : 'Uploading...'}
                </span>
                <span className="text-muted-foreground">
                  {uploadProgress >= 100
                    ? processingTime || 'Processing'
                    : `${uploadProgress}%`}
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
              placeholder="Enter video title"
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
              placeholder="Enter video description (optional)"
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
              onClick={() => router.push(`/${username}/videos`)}
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !selectedFile ||
                !title.trim() ||
                uploadMutation.isPending ||
                isCompressing
              }
            >
              {isCompressing
                ? `Compressing... ${compressionProgress}%`
                : uploadMutation.isPending
                  ? uploadProgress >= 100
                    ? 'Processing...'
                    : `Uploading... ${uploadProgress}%`
                  : 'Upload Video'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

