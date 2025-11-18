'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/core/api/user';
import { followsService } from '@/core/api/follows';
import { useAuth } from '@/core/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeftIcon, UserMinusIcon } from 'lucide-react';
import type { FollowUser } from '@/core/api/follows/types/follow.type';

export default function FollowingPage() {
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

  // Get following
  const {
    data: followingData,
    isLoading: isLoadingFollowing,
  } = useQuery({
    queryKey: ['following', user?.id, page],
    queryFn: () => followsService.getFollowing(user!.id, { page, limit }),
    enabled: !!user?.id,
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: (userId: string) => followsService.unfollow(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile', username] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  const handleUnfollow = (userId: string) => {
    unfollowMutation.mutate(userId);
  };

  const isOwnProfile = isAuthenticated && currentUser?.id === user?.id;

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
            Following
          </h1>
          <p className="text-muted-foreground">
            {followingData?.meta?.total ?? 0} {followingData?.meta?.total === 1 ? 'user' : 'users'}
          </p>
        </div>

        {/* Following List */}
        {isLoadingFollowing ? (
          <div className="text-center py-8 text-muted-foreground">Loading following...</div>
        ) : followingData && followingData.data.length > 0 ? (
          <div className="space-y-4">
            {followingData.data.map((following: FollowUser) => (
              <Card key={following.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Link href={`/${following.username}`}>
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-background flex items-center justify-center overflow-hidden">
                          {following.profile?.avatar ? (
                            <Image
                              src={following.profile.avatar}
                              alt={following.displayName || following.username}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-bold text-muted-foreground">
                              {(following.displayName || following.username)[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                      </Link>
                      <div>
                        <Link href={`/${following.username}`}>
                          <h3 className="font-semibold text-foreground hover:underline">
                            {following.displayName || following.username}
                          </h3>
                        </Link>
                        <p className="text-sm text-muted-foreground">@{following.username}</p>
                        {following.profile?.bio && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {following.profile.bio}
                          </p>
                        )}
                      </div>
                    </div>
                    {isOwnProfile && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnfollow(following.id)}
                        disabled={unfollowMutation.isPending}
                      >
                        <UserMinusIcon className="h-4 w-4 mr-2" />
                        Unfollow
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Pagination */}
            {followingData.meta.hasNextPage && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isLoadingFollowing}
                >
                  Load More
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">
                {isOwnProfile ? "You're not following anyone yet" : `${user.displayName || user.username} is not following anyone yet`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
  );
}

