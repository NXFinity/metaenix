'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { videosService } from '@/core/api/users/videos';
import { analyticsService } from '@/core/api/data/analytics';
import { useAuth } from '@/core/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/theme/ui/tooltip';
import {
  EyeIcon,
  ClockIcon,
  TrashIcon,
  PencilIcon,
  LockIcon,
  GlobeIcon,
  PlayIcon,
  FlagIcon,
} from 'lucide-react';
import Link from 'next/link';
import type { Video } from '@/core/api/users/videos';
import { formatTimeAgo, formatDuration } from './utils';
import { getVideoSlug } from '@/core/utils/slug';
import { Reports } from '../social/Reports';

interface VideoCardProps {
  video: Video;
  isOwnVideo?: boolean;
}

export const VideoCard = ({ video, isOwnVideo = false }: VideoCardProps) => {
  const router = useRouter();
  const params = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [processingTime, setProcessingTime] = useState<string>('');

  // Get username from video user object (original owner), current route params, or use userId as fallback
  // For navigation, always use the video owner's username, not the current route's username
  const videoOwnerUsername = video.user?.username || video.userId;
  // For edit/delete actions, use current route username if it's the owner's video
  const currentRouteUsername = (params?.username as string) || videoOwnerUsername;

  // Fetch video analytics for accurate view count
  const { data: videoAnalytics } = useQuery({
    queryKey: ['videoAnalytics', video.id],
    queryFn: () => analyticsService.getVideoAnalytics(video.id),
    enabled: !!video.id,
    staleTime: 60000, // Cache for 1 minute
  });

  // Calculate and update processing time
  useEffect(() => {
    // Only show processing time if status is processing AND video doesn't have a watchable URL
    if (video.status !== 'processing' || video.videoUrl) {
      setProcessingTime('');
      return;
    }

    const calculateProcessingTime = () => {
      const now = new Date();
      const createdDate = new Date(video.dateCreated);
      const diffInSeconds = Math.floor((now.getTime() - createdDate.getTime()) / 1000);

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
  }, [video.status, video.dateCreated]);

  // Delete video mutation
  const deleteVideoMutation = useMutation({
    mutationFn: () => videosService.delete(video.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos', 'user', video.userId] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      setShowDeleteConfirm(false);
    },
  });

  const handleDelete = () => {
    if (showDeleteConfirm) {
      deleteVideoMutation.mutate();
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handleVideoClick = () => {
    // Navigate to video detail page using the video owner's username (not the current route)
    const videoUrl = `/${videoOwnerUsername}/videos/${getVideoSlug(video)}`;
    router.push(videoUrl);
  };

  return (
    <>
      <div className="group relative overflow-hidden bg-card border border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
        {/* Thumbnail Container - wider aspect ratio */}
        <div 
          className="relative w-full cursor-pointer overflow-hidden"
          style={{ aspectRatio: '16 / 9' }}
          onClick={handleVideoClick}
        >
          {video.thumbnailUrl ? (
            <Image
              src={video.thumbnailUrl}
              alt={video.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <div className="w-16 h-16 flex items-center justify-center">
                <PlayIcon className="h-12 w-12 text-muted-foreground ml-1" />
              </div>
            </div>
          )}
          
          {/* Simple play button overlay - no glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <PlayIcon className="h-16 w-16 text-white drop-shadow-lg ml-1" />
            </div>
          </div>

          {/* Duration badge */}
          {video.duration && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-2 py-0.5 rounded">
              {formatDuration(video.duration)}
            </div>
          )}

          {/* Status badges */}
          {video.status === 'processing' && !video.videoUrl && (
            <div className="absolute top-2 left-2 bg-amber-600 text-white text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>Processing{processingTime && ` ${processingTime}`}</span>
            </div>
          )}
          {video.status === 'failed' && (
            <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-medium px-2 py-0.5 rounded">
              Failed
            </div>
          )}

          {/* Action buttons overlay */}
          {!showDeleteConfirm && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {isOwnVideo && (
                <>
                  <Link
                    href={`/${videoOwnerUsername}/videos/edit/${video.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 bg-black/70 hover:bg-black/90 text-white"
                      disabled={deleteVideoMutation.isPending}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 bg-black/70 hover:bg-red-600 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    disabled={deleteVideoMutation.isPending}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </>
              )}
              {isAuthenticated && currentUser?.id !== video.userId && (
                <div onClick={(e) => e.stopPropagation()}>
                  <Reports
                    resourceType="video"
                    resourceId={video.id}
                    trigger={
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 bg-black/70 hover:bg-red-600 text-white"
                      >
                        <FlagIcon className="h-4 w-4" />
                      </Button>
                    }
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4 space-y-2 bg-card">
          {/* Title */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold text-foreground leading-snug line-clamp-2 flex-1 group-hover:text-primary transition-colors">
              {video.title}
            </h3>
            {isOwnVideo && showDeleteConfirm && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(false);
                  }}
                  disabled={deleteVideoMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  disabled={deleteVideoMutation.isPending}
                >
                  {deleteVideoMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            )}
          </div>

          {/* Description */}
          {video.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {video.description}
            </p>
          )}

          {/* Stats Row */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <EyeIcon className="h-3.5 w-3.5" />
                <span className="font-medium">{(videoAnalytics?.viewsCount ?? video.viewsCount ?? 0).toLocaleString()}</span>
              </div>
              {video.duration && (
                <div className="flex items-center gap-1">
                  <ClockIcon className="h-3.5 w-3.5" />
                  <span>{formatDuration(video.duration)}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <span className="font-medium">{(videoAnalytics?.sharesCount ?? 0).toLocaleString()} share{(videoAnalytics?.sharesCount ?? 0) !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1">
                {video.isPublic ? (
                  <GlobeIcon className="h-3.5 w-3.5" />
                ) : (
                  <LockIcon className="h-3.5 w-3.5" />
                )}
                <span className="capitalize">{video.isPublic ? 'Public' : 'Private'}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              {formatTimeAgo(video.dateCreated)}
            </p>
          </div>

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {video.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded"
                >
                  #{tag}
                </span>
              ))}
              {video.tags.length > 3 && (
                <span className="inline-flex items-center text-xs text-muted-foreground px-1">
                  +{video.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

