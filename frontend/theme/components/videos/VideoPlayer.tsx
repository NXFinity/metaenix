'use client';

import { useRef, useEffect } from 'react';
import { videosService } from '@/core/api/users/videos';
import { trackingService } from '@/core/api/data/tracking';
import { useQueryClient } from '@tanstack/react-query';
import type { Video } from '@/core/api/users/videos';

interface VideoPlayerProps {
  video: Video;
  autoplay?: boolean;
  onEnded?: () => void;
}

export const VideoPlayer = ({ video, autoplay = false, onEnded }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const watchStartTime = useRef<number | null>(null);
  const watchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasTrackedView = useRef(false);
  const queryClient = useQueryClient();

  // Track video view when video starts playing
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handlePlay = () => {
      if (!hasTrackedView.current) {
        trackingService.trackVideoView(video.id).then(() => {
          // Invalidate video queries to refresh view counts
          queryClient.invalidateQueries({ queryKey: ['videos'] });
          queryClient.invalidateQueries({ queryKey: ['videoAnalytics', video.id] });
        }).catch(() => {
          // Silently fail view tracking
        });
        hasTrackedView.current = true;
      }
      watchStartTime.current = Date.now();
    };

    const handleTimeUpdate = () => {
      // Track watch time every 5 seconds
      if (watchStartTime.current && videoElement.currentTime > 0) {
        const watchedSeconds = Math.floor(videoElement.currentTime);
        // Only update every 5 seconds to avoid excessive API calls
        if (watchedSeconds % 5 === 0 && watchedSeconds > 0) {
          // Note: Backend doesn't have watch time tracking endpoint yet
          // This is prepared for future implementation
        }
      }
    };

    const handleEnded = () => {
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
        watchIntervalRef.current = null;
      }
      watchStartTime.current = null;
      if (onEnded) {
        onEnded();
      }
    };

    const handlePause = () => {
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
        watchIntervalRef.current = null;
      }
    };

    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('ended', handleEnded);
    videoElement.addEventListener('pause', handlePause);

    return () => {
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('ended', handleEnded);
      videoElement.removeEventListener('pause', handlePause);
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
      }
    };
  }, [video.id, onEnded, queryClient]);

  return (
    <div className="relative w-full bg-black">
      <video
        ref={videoRef}
        src={video.videoUrl}
        controls
        className="w-full h-auto"
        style={{ 
          display: 'block',
          maxHeight: '85vh',
        }}
        playsInline
        autoPlay={autoplay}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

