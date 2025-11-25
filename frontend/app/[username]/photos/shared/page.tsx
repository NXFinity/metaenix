'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { userService } from '@/core/api/users/user';
import { photosService } from '@/core/api/users/photos';
import { Card, CardContent } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { useState, useMemo } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import { PhotoCard } from '@/theme/components/photos/PhotoCard';
import { ErrorState } from '@/theme/components/error/ErrorState';
import { EmptyState } from '@/theme/components/empty/EmptyState';
import Link from 'next/link';
import {
  ImageIcon,
  Grid3x3Icon,
  ListIcon,
  SortAscIcon,
  ArrowLeftIcon,
} from 'lucide-react';
import type { Photo } from '@/core/api/users/photos';

type ViewMode = 'grid' | 'list';
type SortOption = 'newest' | 'oldest' | 'views' | 'title';

export default function SharedPhotosPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const [page, setPage] = useState(1);
  const limit = 20;
  const { user: currentUser, isAuthenticated } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Determine if this is the user's own profile
  const isOwnProfile = isAuthenticated && currentUser?.username === username;

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

  // Fetch shared photos (only for own profile)
  const {
    data: sharedPhotosData,
    isLoading: isLoadingSharedPhotos,
    error: sharedPhotosError,
    isFetching,
  } = useQuery({
    queryKey: ['photos', 'shared', currentUser?.id, page],
    queryFn: () => photosService.getSharedPhotos({ page, limit }),
    enabled: isOwnProfile && !!currentUser?.id,
    staleTime: 30000,
    refetchOnMount: true,
  });

  const allPhotos = sharedPhotosData?.data || [];
  const meta = sharedPhotosData?.meta;

  // Sort photos - MUST be called before any early returns
  const sortedPhotos = useMemo(() => {
    let result = [...allPhotos];

    // Apply sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime();
        case 'views':
          return b.viewsCount - a.viewsCount;
        case 'title':
          return a.title.localeCompare(b.title);
        case 'newest':
        default:
          return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
      }
    });

    return result;
  }, [allPhotos, sortBy]);

  const photos = sortedPhotos;

  if (isLoadingUser || (isOwnProfile && isLoadingSharedPhotos)) {
    return (
      <div className="flex flex-1 flex-col max-w-7xl mx-auto w-full p-4 md:p-8">
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (userError || !user) {
    return (
      <div className="flex flex-1 flex-col max-w-7xl mx-auto w-full p-4 md:p-8">
        <ErrorState
          title="User not found"
          message="The user you're looking for doesn't exist or has been removed."
        />
      </div>
    );
  }

  // If not own profile, show error
  if (!isOwnProfile) {
    return (
      <div className="flex flex-1 flex-col max-w-7xl mx-auto w-full p-4 md:p-8">
        <ErrorState
          title="Access Denied"
          message="You can only view your own shared photos."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col max-w-7xl mx-auto w-full p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href={`/${username}/photos`}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeftIcon className="h-4 w-4" />
              </Button>
            </Link>
            <div className="space-y-1">
              <h1 className="h2">
                Shared Photos
              </h1>
              <p className="text-body-sm text-muted-foreground">
                {photos.length > 0
                  ? `${photos.length} shared photo${photos.length !== 1 ? 's' : ''}`
                  : meta?.total
                    ? `${meta.total} shared photo${meta.total !== 1 ? 's' : ''}`
                    : 'No shared photos yet'}
              </p>
            </div>
          </div>
        </div>

        {/* View Controls */}
        {photos.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8"
              >
                <Grid3x3Icon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8"
              >
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2 ml-auto">
              <SortAscIcon className="h-4 w-4 text-muted-foreground" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-sm border rounded-md px-3 py-1.5 bg-background text-foreground"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="views">Most Views</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Photos Grid */}
      {sharedPhotosError ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-red-500">
              Error loading shared photos. Please try again later.
            </p>
          </CardContent>
        </Card>
      ) : photos.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="h-10 w-10 text-muted-foreground" />}
          title="No shared photos yet"
          description="Photos you share from others will appear here. Start sharing photos to see them in this collection!"
        />
      ) : (
        <>
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-4'
            }
          >
            {photos.map((photo) => (
              <PhotoCard key={photo.id} photo={photo} isOwnPhoto={false} />
            ))}
          </div>

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
        </>
      )}
    </div>
  );
}

