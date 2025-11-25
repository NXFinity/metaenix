'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { photosService } from '@/core/api/users/photos';
import { analyticsService } from '@/core/api/data/analytics';
import { useAuth } from '@/core/hooks/useAuth';
import { Card } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import {
  EyeIcon,
  TrashIcon,
  PencilIcon,
  LockIcon,
  GlobeIcon,
  ImageIcon,
  FlagIcon,
} from 'lucide-react';
import Link from 'next/link';
import type { Photo } from '@/core/api/users/photos';
import { formatTimeAgo } from '../videos/utils';
import { getPhotoSlug } from '@/core/utils/slug';
import { Reports } from '../social/Reports';

interface PhotoCardProps {
  photo: Photo;
  isOwnPhoto?: boolean;
  size?: 'default' | 'compact';
}

export const PhotoCard = ({ photo, isOwnPhoto = false, size = 'default' }: PhotoCardProps) => {
  const isCompact = size === 'compact';
  const router = useRouter();
  const params = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get username from photo user object (original owner), current route params, or use userId as fallback
  // For navigation, always use the photo owner's username, not the current route's username
  const photoOwnerUsername = photo.user?.username || photo.userId;
  // For edit/delete actions, use current route username if it's the owner's photo
  const currentRouteUsername = (params?.username as string) || photoOwnerUsername;

  // Fetch photo analytics for accurate view count
  const { data: photoAnalytics } = useQuery({
    queryKey: ['photoAnalytics', photo.id],
    queryFn: () => analyticsService.getPhotoAnalytics(photo.id),
    enabled: !!photo.id,
    staleTime: 60000, // Cache for 1 minute
  });

  // Delete photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: () => photosService.delete(photo.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos', 'user', photo.userId] });
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      setShowDeleteConfirm(false);
    },
  });

  const handleDelete = () => {
    if (showDeleteConfirm) {
      deletePhotoMutation.mutate();
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handlePhotoClick = () => {
    // Navigate to photo detail page using the photo owner's username (not the current route)
    const photoUrl = `/${photoOwnerUsername}/photos/${getPhotoSlug(photo)}`;
    router.push(photoUrl);
  };

  return (
    <>
      <div className={`group relative overflow-hidden bg-card border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 ${isCompact ? 'rounded-lg' : ''}`}>
        {/* Image Container */}
        <div 
          className="relative w-full cursor-pointer overflow-hidden"
          style={{ 
            aspectRatio: isCompact ? '16 / 9' : (photo.width && photo.height ? `${photo.width} / ${photo.height}` : '1 / 1'),
            maxHeight: isCompact ? '150px' : 'none'
          }}
          onClick={handlePhotoClick}
        >
          {photo.imageUrl ? (
            <Image
              src={photo.imageUrl}
              alt={photo.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <div className="w-16 h-16 flex items-center justify-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Status badges */}
          {photo.status === 'processing' && (
            <div className="absolute top-2 left-2 bg-amber-600 text-white text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>Processing</span>
            </div>
          )}
          {photo.status === 'failed' && (
            <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-medium px-2 py-0.5 rounded">
              Failed
            </div>
          )}

          {/* Action buttons overlay */}
          {!showDeleteConfirm && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {isOwnPhoto && (
                <>
                  <Link
                    href={`/${photoOwnerUsername}/photos/edit/${photo.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 bg-black/70 hover:bg-black/90 text-white"
                      disabled={deletePhotoMutation.isPending}
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
                    disabled={deletePhotoMutation.isPending}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </>
              )}
              {isAuthenticated && currentUser?.id !== photo.userId && (
                <div onClick={(e) => e.stopPropagation()}>
                  <Reports
                    resourceType="photo"
                    resourceId={photo.id}
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
        <div className={`${isCompact ? 'p-2 space-y-1' : 'p-4 space-y-2'} bg-card`}>
          {/* Title */}
          <div className={`flex items-start justify-between ${isCompact ? 'gap-1' : 'gap-3'}`}>
            <h3 className={`${isCompact ? 'text-xs' : 'text-base'} font-semibold text-foreground leading-snug ${isCompact ? 'line-clamp-1' : 'line-clamp-2'} flex-1 group-hover:text-primary transition-colors`}>
              {photo.title}
            </h3>
            {isOwnPhoto && showDeleteConfirm && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(false);
                  }}
                  disabled={deletePhotoMutation.isPending}
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
                  disabled={deletePhotoMutation.isPending}
                >
                  {deletePhotoMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            )}
          </div>

          {/* Description */}
          {photo.description && !isCompact && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {photo.description}
            </p>
          )}

          {/* Stats Row */}
          <div className={`flex items-center justify-between ${isCompact ? 'gap-1' : 'gap-4'} ${isCompact ? '' : 'pt-1'}`}>
            {isCompact ? (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-0.5">
                  <EyeIcon className="h-3 w-3" />
                  <span>{(photoAnalytics?.viewsCount ?? photo.viewsCount ?? 0).toLocaleString()}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {formatTimeAgo(photo.dateCreated)}
                </span>
              </div>
            ) : (
              <>
                <div className={`flex items-center ${isCompact ? 'gap-2' : 'gap-3'} text-xs text-muted-foreground`}>
                  <div className="flex items-center gap-1">
                    <EyeIcon className="h-3.5 w-3.5" />
                    <span className="font-medium">{(photoAnalytics?.viewsCount ?? photo.viewsCount ?? 0).toLocaleString()}</span>
                  </div>
                  {photo.width && photo.height && (
                    <div className="flex items-center gap-1">
                      <span>{photo.width} × {photo.height}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{(photoAnalytics?.sharesCount ?? 0).toLocaleString()} share{(photoAnalytics?.sharesCount ?? 0) !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {photo.isPublic ? (
                      <GlobeIcon className="h-3.5 w-3.5" />
                    ) : (
                      <LockIcon className="h-3.5 w-3.5" />
                    )}
                    <span className="capitalize">{photo.isPublic ? 'Public' : 'Private'}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTimeAgo(photo.dateCreated)}
                </p>
              </>
            )}
          </div>

          {/* Tags */}
          {photo.tags && photo.tags.length > 0 && !isCompact && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {photo.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded"
                >
                  #{tag}
                </span>
              ))}
              {photo.tags.length > 3 && (
                <span className="inline-flex items-center text-xs text-muted-foreground px-1">
                  +{photo.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

