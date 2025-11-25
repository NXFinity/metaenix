/**
 * Format time ago helper
 */
export const formatTimeAgo = (date: string): string => {
  const now = new Date();
  const dateObj = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
};

/**
 * Format video duration (seconds to MM:SS or HH:MM:SS)
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Extract a frame from a video file and convert it to a File/Blob
 * @param videoFile - The video file to extract frame from
 * @param timeOffset - Time in seconds to extract frame from (default: 1 second or 10% of duration)
 * @returns Promise that resolves to a File object containing the thumbnail image
 */
export const extractVideoThumbnail = async (
  videoFile: File,
  timeOffset?: number,
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      // Seek to the specified time (or 1 second, or 10% of duration, whichever is smaller)
      const duration = video.duration;
      const seekTime = timeOffset !== undefined
        ? Math.min(timeOffset, duration)
        : Math.min(1, duration * 0.1);

      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      try {
        // Create canvas and draw video frame
        const canvas = document.createElement('canvas');
        // Use a reasonable max size for thumbnails (1920x1080 max, maintain aspect ratio)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let width = video.videoWidth;
        let height = video.videoHeight;

        // Scale down if needed
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Draw the video frame
        ctx.drawImage(video, 0, 0, width, height);

        // Convert canvas to blob, then to File
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to upload thumbnail blob'));
              return;
            }

            // Create a File from the blob
            const thumbnailFile = new File(
              [blob],
              `thumbnail-${videoFile.name.replace(/\.[^/.]+$/, '')}.jpg`,
              {
                type: 'image/jpeg',
                lastModified: Date.now(),
              },
            );

            // Clean up
            window.URL.revokeObjectURL(video.src);
            resolve(thumbnailFile);
          },
          'image/jpeg',
          0.85, // Quality: 0.85 (good balance between quality and file size)
        );
      } catch (error) {
        window.URL.revokeObjectURL(video.src);
        reject(error);
      }
    };

    video.onerror = (error) => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video for thumbnail extraction'));
    };

    // Load the video file
    video.src = URL.createObjectURL(videoFile);
  });
};
