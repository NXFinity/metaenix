'use client';

import { useQuery } from '@tanstack/react-query';
import { postsService } from '@/core/api/users/posts';
import { userService } from '@/core/api/users/user';
import { Card, CardContent } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { PostCard } from '@/theme/components/posts/Posts';

export default function UserFeedPage() {
  const params = useParams();
  const username = params.username as string;
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch user by username
  const {
    data: user,
    isLoading: isLoadingUser,
  } = useQuery({
    queryKey: ['user', 'profile', username],
    queryFn: () => userService.getByUsername(username),
    enabled: !!username,
  });

  // Fetch user's feed (timeline)
  const {
    data: feedData,
    isLoading: isLoadingFeed,
    error: feedError,
  } = useQuery({
    queryKey: ['posts', 'user', 'feed', user?.id, page],
    queryFn: () => postsService.getUserFeed(user!.id, { page, limit }),
    enabled: !!user?.id,
  });

  if (isLoadingUser || isLoadingFeed) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading feed...</p>
        </div>
      </div>
    );
  }

  if (feedError || !user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-red-500">Error loading feed. Please try again.</p>
        </div>
      </div>
    );
  }

  const posts = feedData?.data || [];
  const hasMore = feedData?.meta?.hasNextPage || false;

  return (
    <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {user.displayName || user.username}&apos;s Timeline
          </h1>
          <p className="text-muted-foreground">
            Posts from users {user.displayName || user.username} follows and shared posts
          </p>
        </div>

        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                This user's timeline is empty.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}

            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={isLoadingFeed}
                >
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
  );
}

