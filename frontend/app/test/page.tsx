'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/core/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { postsService } from '@/core/api/posts';
import { PostCard } from '@/theme/components/posts/Posts';
import { Card, CardContent, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { Loader2, ShieldIcon } from 'lucide-react';
import type { Post } from '@/core/api/posts';

function TestPageContent() {
  const router = useRouter();
  const { user, isAuthenticated, isInitializing } = useAuth();

  // Check if user is admin
  const isAdmin = user?.role === 'Administrator';

  // Redirect non-admins
  useEffect(() => {
    if (!isInitializing && (!isAuthenticated || !isAdmin)) {
      router.push('/');
    }
  }, [isAuthenticated, isAdmin, isInitializing, router]);

  // Fetch test posts
  const { data: postsData, isLoading } = useQuery({
    queryKey: ['posts', 'test'],
    queryFn: () => postsService.getAll({ page: 1, limit: 10 }),
    enabled: isAdmin,
  });

  if (isInitializing) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="p-12 text-center">
            <ShieldIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              This page is only accessible to administrators.
            </p>
            <Button onClick={() => router.push('/')}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldIcon className="h-5 w-5 text-primary" />
            Component Test & Design Page
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Test and design reusable components. This page is only visible to administrators.
          </p>
        </CardHeader>
      </Card>

      {/* Posts Section */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Posts Component</CardTitle>
            <p className="text-sm text-muted-foreground">
              Testing the reusable PostCard component with various post types.
            </p>
          </CardHeader>
        </Card>

        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading posts...</p>
            </CardContent>
          </Card>
        ) : postsData?.data && postsData.data.length > 0 ? (
          <div className="space-y-4">
            {postsData.data.map((post: Post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No posts found for testing.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function TestPage() {
  return <TestPageContent />;
}

