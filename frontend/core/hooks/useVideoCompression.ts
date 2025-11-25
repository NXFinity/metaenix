/**
 * React Hook for Video Compression
 * 
 * Provides easy-to-use video compression functionality in React components
 */

import { useState, useCallback, useRef } from 'react';
import { VideoCompressorService, type CompressionOptions, type CompressionProgress, type CompressionResult } from '../services/video-compression';

export interface UseVideoCompressionReturn {
  isCompressing: boolean;
  progress: number;
  stage: CompressionProgress['stage'];
  message: string;
  error: string | null;
  compress: (file: File, options?: CompressionOptions) => Promise<CompressionResult | null>;
  cancel: () => void;
}

export function useVideoCompression(): UseVideoCompressionReturn {
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<CompressionProgress['stage']>('loading');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const compressorRef = useRef<VideoCompressorService | null>(null);
  const cancelledRef = useRef(false);

  const compress = useCallback(
    async (file: File, options?: CompressionOptions): Promise<CompressionResult | null> => {
      // Reset state
      setError(null);
      setProgress(0);
      setStage('loading');
      setMessage('Initializing compression...');
      setIsCompressing(true);
      cancelledRef.current = false;

      try {
        // Check if compression is supported
        if (!VideoCompressorService.isSupported()) {
          throw new Error('Video compression is not supported in this browser. Please use a modern browser with WebAssembly support.');
        }

        // Create compressor instance
        if (!compressorRef.current) {
          compressorRef.current = new VideoCompressorService();
        }

        // Compress video
        const result = await compressorRef.current.compress(
          file,
          options,
          (progressUpdate) => {
            if (cancelledRef.current) {
              return;
            }
            setProgress(progressUpdate.progress);
            setStage(progressUpdate.stage);
            setMessage(progressUpdate.message);
          },
        );

        if (cancelledRef.current) {
          return null;
        }

        setProgress(100);
        setMessage('Compression complete!');
        setIsCompressing(false);
        return result;
      } catch (err) {
        if (cancelledRef.current) {
          return null;
        }
        const errorMessage = err instanceof Error ? err.message : 'Compression failed';
        setError(errorMessage);
        setMessage('Compression failed');
        setIsCompressing(false);
        return null;
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setIsCompressing(false);
    setMessage('Compression cancelled');
    
    // Cancel the compressor service
    if (compressorRef.current) {
      compressorRef.current.cancel();
    }
  }, []);

  return {
    isCompressing,
    progress,
    stage,
    message,
    error,
    compress,
    cancel,
  };
}

