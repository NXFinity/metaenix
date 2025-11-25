'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/core/api/users/user';
import { followsService } from '@/core/api/users/follows';
import { useAuth } from '@/core/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeftIcon, UserPlusIcon, UserMinusIcon } from 'lucide-react';
import type { FollowUser } from '@/core/api/users/follows/types/follow.type';

export default function FollowersPage() {
  const { username } = useParams();
  const router = useRouter();
  const { user: currentUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 20;

  // Get user by username
  const {
    data: user,
    isLoading: isLoadingUser,
    error: userError,
  } = useQuery({
    queryKey: ['user', 'profile', username],
    queryFn: () => userService.getByUsername(username as string),
    enabled: !!username,
  });

  // Get followers
  const {
    data: followersData,
    isLoading: isLoadingFollowers,
    error: followersError,
  } = useQuery({
    queryKey: ['followers', user?.id, page],
    queryFn: () => followsService.getFollowers(user!.id, { page, limit }),
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

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: (userId: string) => followsService.follow(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followers', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile', username] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: (userId: string) => followsService.unfollow(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followers', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile', username] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  const handleFollow = (userId: string, isFollowing: boolean) => {
    if (isFollowing) {
      unfollowMutation.mutate(userId);
    } else {
      followMutation.mutate(userId);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (userError || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">User not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col max-w-4xl mx-auto w-full p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${username}`}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Profile
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Followers
          </h1>
          <p className="text-muted-foreground">
            {followersData?.meta?.total ?? 0} {followersData?.meta?.total === 1 ? 'follower' : 'followers'}
          </p>
        </div>

        {/* Followers List */}
        {followersError ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">
                {followersError instanceof Error && followersError.message.includes('404')
                  ? 'User not found'
                  : 'Failed to load followers'}
              </p>
            </CardContent>
          </Card>
        ) : isLoadingFollowers ? (
          <div className="text-center py-8 text-muted-foreground">Loading followers...</div>
        ) : followersData && followersData.data.length > 0 ? (
          <div className="space-y-4">
            {followersData.data.map((follower: FollowUser) => (
              <Card key={follower.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Link href={`/${follower.username}`}>
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-background flex items-center justify-center overflow-hidden">
                          {follower.profile?.avatar ? (
                            <Image
                              src={follower.profile.avatar}
                              alt={follower.displayName || follower.username}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-bold text-muted-foreground">
                              {(follower.displayName || follower.username)[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                      </Link>
                      <div>
                        <Link href={`/${follower.username}`}>
                          <h3 className="font-semibold text-foreground hover:underline">
                            {follower.displayName || follower.username}
                          </h3>
                        </Link>
                        <p className="text-sm text-muted-foreground">@{follower.username}</p>
                        {follower.profile?.bio && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {follower.profile.bio}
                          </p>
                        )}
                      </div>
                    </div>
                    {isAuthenticated && currentUser?.id !== follower.id && (
                      <Button
                        variant={follower.isFollowing ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => handleFollow(follower.id, follower.isFollowing || false)}
                        disabled={followMutation.isPending || unfollowMutation.isPending}
                      >
                        {follower.isFollowing ? (
                          <>
                            <UserMinusIcon className="h-4 w-4 mr-2" />
                            Unfollow
                          </>
                        ) : (
                          <>
                            <UserPlusIcon className="h-4 w-4 mr-2" />
                            Follow
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Pagination */}
            {followersData.meta.hasNextPage && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isLoadingFollowers}
                >
                  Load More
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No followers yet</p>
            </CardContent>
          </Card>
        )}
      </div>
  );
}

