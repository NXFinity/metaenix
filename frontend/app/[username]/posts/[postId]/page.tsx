'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { postsService } from '@/core/api/posts';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { Card, CardContent } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import {
  ArrowLeftIcon,
  Loader2,
} from 'lucide-react';
import { PostCard } from '@/theme/components/posts/Posts';

function PostDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;
  const username = params.username as string;

  // Fetch post
  const { data: post, isLoading, error } = useQuery({
    queryKey: ['posts', postId],
    queryFn: () => postsService.getById(postId),
    enabled: !!postId,
  });

  // Verify username matches post owner
  useEffect(() => {
    if (post?.user?.username && post.user.username !== username) {
      router.replace(`/${post.user.username}/posts/${postId}`);
    }
  }, [post, username, postId, router]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading post...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Post Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The post you&apos;re looking for doesn&apos;t exist or may have been deleted.
            </p>
            <Button onClick={() => router.back()}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const author = post.user;
  const displayName = author?.displayName || author?.username || 'Unknown';

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push(`/${username}`)}
        className="mb-6"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back to {displayName}&apos;s profile
      </Button>

      {/* Post Card - prevent navigation on click since we're on detail page */}
      <PostCard 
        post={post} 
        showFullContent={true}
        onPostClick={() => {}} // No-op since we're already on the detail page
      />
    </div>
  );
}

export default function PostDetailPage() {
  return (
    <RouteErrorBoundary>
      <PostDetailPageContent />
    </RouteErrorBoundary>
  );
}

