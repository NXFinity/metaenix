'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { userService } from '@/core/api/users/user';
import { videosService } from '@/core/api/users/videos';
import { Card, CardContent } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { useState, useMemo } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import { VideoCard } from '@/theme/components/videos/VideoCard';
import { VideoSkeleton } from '@/theme/components/loading/VideoSkeleton';
import { ErrorState } from '@/theme/components/error/ErrorState';
import { EmptyState } from '@/theme/components/empty/EmptyState';
import Link from 'next/link';
import {
  VideoIcon,
  Grid3x3Icon,
  ListIcon,
  FilterIcon,
  SortAscIcon,
  ArrowLeftIcon,
  PlayIcon,
} from 'lucide-react';
import type { Video } from '@/core/api/users/videos';

type ViewMode = 'grid' | 'list';
type SortOption = 'newest' | 'oldest' | 'views' | 'title';
type FilterOption = 'all' | 'public' | 'private' | 'processing';

export default function UserVideosPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const [page, setPage] = useState(1);
  const limit = 20;
  const { user: currentUser, isAuthenticated } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

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

  // Fetch videos by user
  const {
    data: videosData,
    isLoading: isLoadingVideos,
    error: videosError,
    isFetching,
  } = useQuery({
    queryKey: ['videos', 'user', user?.id, page],
    queryFn: () => videosService.getByUser(user!.id, { page, limit }),
    enabled: !!user?.id,
    retry: (failureCount, error: unknown) => {
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
    // Poll for status updates if there are processing videos
    refetchInterval: (query) => {
      const data = query.state.data as typeof videosData;
      if (data?.data) {
        const hasProcessingVideos = data.data.some((video) => video.status === 'processing');
        // Poll every 10 seconds if there are processing videos, otherwise don't poll
        return hasProcessingVideos ? 10000 : false;
      }
      return false;
    },
  });

  // Determine if this is the user's own profile
  const isOwnProfile = isAuthenticated && currentUser?.username === username;

  // Fetch shared videos (only for own profile)
  const {
    data: sharedVideosData,
    isLoading: isLoadingSharedVideos,
    error: sharedVideosError,
  } = useQuery({
    queryKey: ['videos', 'shared', currentUser?.id],
    queryFn: () => videosService.getSharedVideos({ page: 1, limit: 20 }),
    enabled: isOwnProfile && !!currentUser?.id,
    staleTime: 30000,
    refetchOnMount: true,
  });

  const allVideos = videosData?.data || [];
  const meta = videosData?.meta;
  const sharedVideos = sharedVideosData?.data || [];

  // Filter and sort videos - MUST be called before any early returns
  const filteredAndSortedVideos = useMemo(() => {
    let result = [...allVideos];

    // Apply filter
    if (filterBy === 'public') {
      result = result.filter((v) => v.isPublic);
    } else if (filterBy === 'private') {
      result = result.filter((v) => !v.isPublic);
    } else if (filterBy === 'processing') {
      result = result.filter((v) => v.status === 'processing');
    }

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
  }, [allVideos, filterBy, sortBy]);

  const videos = filteredAndSortedVideos;

  if (isLoadingUser || isLoadingVideos || (isOwnProfile && isLoadingSharedVideos)) {
    return (
      <div className="flex flex-1 flex-col w-full">
        <div className="w-full border-b border-border/50 bg-gradient-to-br from-background via-background to-primary/5 px-6 py-10 shadow-sm">
          <div className="animate-pulse">
            <div className="h-10 w-64 bg-muted rounded mb-2" />
            <div className="h-6 w-96 bg-muted rounded" />
          </div>
        </div>
        <div className="w-full px-6 py-6">
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <VideoSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (userError || !user) {
    return (
      <div className="flex flex-1 flex-col w-full">
        <div className="w-full border-b border-border/50 bg-gradient-to-br from-background via-background to-primary/5 px-6 py-10 shadow-sm">
          <div className="flex items-center gap-6">
            <Button 
              variant="ghost" 
              size="sm" 
              asChild
              className="hover:bg-muted/80 transition-all duration-200 rounded-lg"
            >
              <Link href={`/${username}`}>
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Profile
              </Link>
            </Button>
          </div>
        </div>
        <div className="w-full px-6 py-6">
          <ErrorState
            title="User not found"
            message="The user you're looking for doesn't exist or has been removed."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col w-full">
      {/* Header */}
      <div className="w-full border-b border-border/50 bg-gradient-to-br from-background via-background to-primary/5 px-6 py-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button 
              variant="ghost" 
              size="sm" 
              asChild
              className="hover:bg-muted/80 transition-all duration-200 rounded-lg"
            >
              <Link href={`/${username}`}>
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Profile
              </Link>
            </Button>
            <div className="h-10 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-2xl" />
                <div className="relative p-3 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/20 shadow-lg">
                  <VideoIcon className="h-7 w-7 text-primary" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    Videos by {user.displayName || user.username}
                  </h1>
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                    <PlayIcon className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">Videos</span>
                  </div>
                </div>
                <p className="text-sm md:text-base text-muted-foreground">
                  {videos.length > 0
                    ? `${videos.length} video${videos.length !== 1 ? 's' : ''}`
                    : meta?.total
                      ? `${meta.total} video${meta.total !== 1 ? 's' : ''}`
                      : 'No videos yet'}
                </p>
              </div>
            </div>
          </div>
          {isOwnProfile && (
            <Link href={`/${username}/videos/upload`}>
              <Button className="shadow-lg hover:shadow-xl transition-all duration-300">
                <VideoIcon className="h-4 w-4 mr-2" />
                Upload Video
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-6 py-6">
        {/* Filters and View Controls */}
        {videos.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border/50">
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

              {/* Filter */}
              {isOwnProfile && (
                <div className="flex items-center gap-2">
                  <FilterIcon className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                    className="text-sm border rounded-md px-3 py-1.5 bg-background text-foreground"
                  >
                    <option value="all">All Videos</option>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="processing">Processing</option>
                  </select>
                </div>
              )}

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
          </div>
        )}

        {/* Videos Grid */}
        {videosError ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-red-500">
              Error loading videos. Please try again later.
            </p>
          </CardContent>
        </Card>
      ) : videos.length === 0 ? (
        <EmptyState
          icon={<VideoIcon className="h-10 w-10 text-muted-foreground" />}
          title="No videos yet"
          description={
            isOwnProfile
              ? 'Start creating and upload your first video to share with your audience!'
              : `This user hasn't uploaded any videos yet.`
          }
          action={
            isOwnProfile
              ? {
                  label: 'Upload Your First Video',
                  onClick: () => router.push(`/${username}/videos/upload`),
                }
              : undefined
          }
        />
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Videos Grid - Full width when no shared column, otherwise takes remaining space */}
          <div className={isOwnProfile ? 'flex-1' : 'w-full'}>
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'
                  : 'space-y-4'
              }
            >
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} isOwnVideo={isOwnProfile} />
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
          </div>

          {/* Shared Videos Column (only for own profile) - Fixed width on the right */}
          {isOwnProfile && (
            <div className="w-full lg:w-[28rem] xl:w-[32rem] flex-shrink-0">
              <div className="sticky top-4">
                <div className="mb-4">
                  <Link href={`/${username}/videos/shared`}>
                    <h2 className="h3 mb-2 hover:text-primary transition-colors cursor-pointer">
                      Shared Videos
                    </h2>
                  </Link>
                  <p className="text-body-sm text-muted-foreground">
                    {sharedVideos.length > 0
                      ? `${sharedVideos.length} shared video${sharedVideos.length !== 1 ? 's' : ''}`
                      : 'No shared videos yet'}
                  </p>
                </div>

                {sharedVideosError ? (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-red-500 text-sm">
                        Error loading shared videos.
                      </p>
                    </CardContent>
                  </Card>
                ) : sharedVideos.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <VideoIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Videos you share from others will appear here
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {sharedVideos.map((video) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        isOwnVideo={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

