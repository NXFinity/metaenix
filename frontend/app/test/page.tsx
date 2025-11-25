'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/core/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { videosService } from '@/core/api/users/videos';
import { VideoCard, VideoPlayer, VideoUpload } from '@/theme/components/videos';
import { Card, CardContent, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { Loader2, ShieldIcon, VideoIcon, PlayIcon } from 'lucide-react';
import type { Video } from '@/core/api/users/videos';

function TestPageContent() {
  const router = useRouter();
  const { user, isAuthenticated, isInitializing } = useAuth();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  // Check if user is admin
  const isAdmin = user?.role === 'Administrator';

  // Redirect non-admins
  useEffect(() => {
    if (!isInitializing && (!isAuthenticated || !isAdmin)) {
      router.push('/');
    }
  }, [isAuthenticated, isAdmin, isInitializing, router]);

  // Fetch test videos (from current user if available)
  const { data: videosData, isLoading } = useQuery({
    queryKey: ['videos', 'test', user?.id],
    queryFn: () => videosService.getByUser(user!.id, { page: 1, limit: 10 }),
    enabled: isAdmin && !!user?.id,
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
          <CardTitle className="flex items-center gap-2 leading-none">
            <ShieldIcon className="h-5 w-5 text-primary flex-shrink-0" />
            <span>Component Test & Design Page</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Test and design reusable video components. This page is only visible to administrators.
          </p>
        </CardHeader>
      </Card>

      {/* Video Upload Component */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Video Upload Component</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Test the VideoUpload dialog component for uploading videos.
                </p>
              </div>
              <Button onClick={() => setShowUploadDialog(true)}>
                <VideoIcon className="h-4 w-4 mr-2" />
                Test Upload
              </Button>
            </div>
          </CardHeader>
        </Card>

        <VideoUpload
          open={showUploadDialog}
          onOpenChange={setShowUploadDialog}
          onSuccess={() => {
            // Refetch videos after successful upload
            window.location.reload();
          }}
        />
      </div>

      {/* Video Card Component */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Video Card Component</CardTitle>
            <p className="text-sm text-muted-foreground">
              Testing the reusable VideoCard component with various video states.
            </p>
          </CardHeader>
        </Card>

        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading videos...</p>
            </CardContent>
          </Card>
        ) : videosData?.data && videosData.data.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videosData.data.map((video: Video) => (
              <VideoCard key={video.id} video={video} isOwnVideo={true} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <VideoIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No videos found for testing.</p>
              <Button onClick={() => setShowUploadDialog(true)}>
                <VideoIcon className="h-4 w-4 mr-2" />
                Upload Test Video
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Video Player Component */}
      {selectedVideo && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Video Player Component</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Testing the VideoPlayer component with video playback and tracking.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setSelectedVideo(null)}>
                  Close Player
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                <VideoPlayer video={selectedVideo} autoplay={false} />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold mb-2">{selectedVideo.title}</h3>
                {selectedVideo.description && (
                  <p className="text-sm text-muted-foreground mb-2">{selectedVideo.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{selectedVideo.viewsCount} views</span>
                  {selectedVideo.duration && (
                    <span>{Math.floor(selectedVideo.duration / 60)}:{(selectedVideo.duration % 60).toString().padStart(2, '0')}</span>
                  )}
                  <span>{selectedVideo.isPublic ? 'Public' : 'Private'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Video Player Test Section */}
      {videosData?.data && videosData.data.length > 0 && !selectedVideo && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Video Player</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select a video from above to test the VideoPlayer component.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {videosData.data.slice(0, 4).map((video: Video) => (
                  <Button
                    key={video.id}
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-auto p-4"
                    onClick={() => setSelectedVideo(video)}
                  >
                    <PlayIcon className="h-6 w-6" />
                    <span className="text-xs text-center line-clamp-2">{video.title}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function TestPage() {
  return <TestPageContent />;
}
