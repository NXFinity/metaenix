/**
 * Video Compression Service
 * 
 * Handles client-side video compression using FFmpeg.wasm
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { detectBestCodec, getCodecArgs, getAudioCodecArgs, type CodecConfig } from './codec-detector.service';

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  maxBitrate?: number; // in Mbps
  quality?: 'fast' | 'balanced' | 'high'; // compression quality preset
}

export interface CompressionProgress {
  progress: number; // 0-100
  stage: 'loading' | 'compressing' | 'finalizing';
  message: string;
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  codec: string;
}

export class VideoCompressorService {
  private ffmpeg: FFmpeg | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private currentCompressionPromise: Promise<CompressionResult> | null = null;
  private isCancelled = false;

  /**
   * Initialize FFmpeg (lazy load)
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized && this.ffmpeg) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        this.ffmpeg = new FFmpeg();

        // Load FFmpeg.wasm from CDN
        // Using latest stable version
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await this.ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        this.isInitialized = true;
      } catch (error) {
        this.initializationPromise = null;
        this.ffmpeg = null;
        throw new Error(`Failed to initialize FFmpeg: ${error instanceof Error ? error.message : String(error)}`);
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Cancel current compression
   */
  cancel(): void {
    this.isCancelled = true;
    // Note: FFmpeg.wasm doesn't support cancelling exec(), but we can stop progress updates
    // and clean up resources
    if (this.ffmpeg) {
      // Try to terminate FFmpeg (if supported)
      try {
        // FFmpeg.wasm doesn't have a direct cancel, but we can mark as cancelled
        // The exec will complete but we'll ignore the result
      } catch (error) {
        // Silently handle cancellation errors
      }
    }
  }

  /**
   * Compress a video file
   */
  async compress(
    file: File,
    options: CompressionOptions = {},
    onProgress?: (progress: CompressionProgress) => void,
  ): Promise<CompressionResult> {
    // Reset cancellation flag
    this.isCancelled = false;
    
    // Initialize FFmpeg if needed
    await this.initialize();
    
    if (this.isCancelled) {
      throw new Error('Compression was cancelled');
    }

    if (!this.ffmpeg) {
      throw new Error('FFmpeg not initialized');
    }

    // IMPORTANT: FFmpeg.wasm standard build only supports H.264 and VP9, NOT H.265/libx265
    // Always force H.264 for maximum compatibility - libx265 is NOT available in standard FFmpeg.wasm
    // This is why compression was failing - FFmpeg.wasm doesn't include libx265 encoder
    const codecConfig = {
      codec: 'h264' as const,
      codecName: 'libx264',
      mimeType: 'video/mp4',
      extension: 'mp4',
    };
    
    // Set up progress tracking - remove any existing handlers first
    this.ffmpeg.off('progress');
    let lastProgress = 0;
    
    // Define progress handler
    const progressHandler = ({ progress }: { progress: number }) => {
      // Check if cancelled
      if (this.isCancelled) {
        return;
      }
      
      // Progress is 0-1, convert to 0-100
      // Map to 5-95% range (5% for start, 95% for completion)
      const baseProgress = 5;
      const range = 90; // 95 - 5
      const progressPercent = Math.round(baseProgress + (progress * range));
      
      if (progressPercent !== lastProgress && progressPercent > lastProgress) {
        lastProgress = progressPercent;
        onProgress?.({
          progress: progressPercent,
          stage: 'compressing',
          message: `Compressing video... ${progressPercent}%`,
        });
      }
    };
    this.ffmpeg.on('progress', progressHandler);

    try {
      // Check cancellation before starting
      if (this.isCancelled) {
        throw new Error('Compression was cancelled');
      }
      
      // Report loading stage
      onProgress?.({
        progress: 0,
        stage: 'loading',
        message: 'Loading video file...',
      });

      // Write input file to FFmpeg virtual filesystem
      const inputFileName = 'input.' + file.name.split('.').pop();
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(file));
      
      // Check cancellation after loading
      if (this.isCancelled) {
        await this.ffmpeg.deleteFile(inputFileName);
        throw new Error('Compression was cancelled');
      }

      // Get video metadata
      const video = document.createElement('video');
      video.preload = 'metadata';
      const videoUrl = URL.createObjectURL(file);
      video.src = videoUrl;

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(videoUrl);
          resolve(null);
        };
        video.onerror = reject;
      });

      const originalWidth = video.videoWidth;
      const originalHeight = video.videoHeight;

      // Calculate output dimensions
      // More aggressive scaling for better compression: 720p for most files, 1080p only for very small files
      const fileSizeMB = file.size / (1024 * 1024);
      // Scale more aggressively: 720p for files > 50MB, 1080p only for very small files
      const defaultMaxWidth = fileSizeMB > 50 ? 1280 : 1920;
      const defaultMaxHeight = fileSizeMB > 50 ? 720 : 1080;
      const maxWidth = options.maxWidth || defaultMaxWidth;
      const maxHeight = options.maxHeight || defaultMaxHeight;
      let outputWidth = originalWidth;
      let outputHeight = originalHeight;

      // Always scale down if larger than target (more aggressive compression)
      if (originalWidth > maxWidth || originalHeight > maxHeight) {
        const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
        outputWidth = Math.floor(originalWidth * ratio);
        outputHeight = Math.floor(originalHeight * ratio);
        // Ensure dimensions are even (required by most codecs)
        outputWidth = outputWidth % 2 === 0 ? outputWidth : outputWidth - 1;
        outputHeight = outputHeight % 2 === 0 ? outputHeight : outputHeight - 1;
      } else if (fileSizeMB < 30 && originalWidth <= 1280 && originalHeight <= 720) {
        // Only keep original resolution for very small files that are already 720p or smaller
        outputWidth = originalWidth;
        outputHeight = originalHeight;
      } else {
        // For files that are already small but might be 1080p, scale down to 720p for better compression
        if (originalWidth > 1280 || originalHeight > 720) {
          const ratio = Math.min(1280 / originalWidth, 720 / originalHeight);
          outputWidth = Math.floor(originalWidth * ratio);
          outputHeight = Math.floor(originalHeight * ratio);
          outputWidth = outputWidth % 2 === 0 ? outputWidth : outputWidth - 1;
          outputHeight = outputHeight % 2 === 0 ? outputHeight : outputHeight - 1;
        }
      }

      // Build FFmpeg arguments
      const outputFileName = `output.${codecConfig.extension}`;
      
      // Get base codec args
      let codecArgs = getCodecArgs(codecConfig.codec);
      const audioArgs = getAudioCodecArgs();
      
      // If bitrate is specified, we need to remove CRF (they conflict)
      if (options.maxBitrate) {
        const bitrateKbps = options.maxBitrate * 1000;
        // Remove CRF from codec args if present
        const filteredCodecArgs: string[] = [];
        for (let i = 0; i < codecArgs.length; i++) {
          if (codecArgs[i] === '-crf') {
            // Skip -crf and its value (next item)
            i++; // Skip the value too
            continue;
          }
          filteredCodecArgs.push(codecArgs[i]);
        }
        codecArgs = filteredCodecArgs;
        // Add bitrate instead
        codecArgs.push('-b:v', `${bitrateKbps}k`);
      }
      
      // Adjust quality based on options (only if not using bitrate)
      if (!options.maxBitrate) {
        if (options.quality === 'fast') {
          // Already using ultrafast by default, but ensure it's set
          const presetIndex = codecArgs.indexOf('-preset');
          if (presetIndex !== -1) {
            codecArgs[presetIndex + 1] = 'ultrafast';
          }
          // Increase CRF for faster compression and smaller files (higher CRF = faster, smaller files)
          const crfIndex = codecArgs.indexOf('-crf');
          if (crfIndex !== -1) {
            codecArgs[crfIndex + 1] = '32'; // Higher CRF = faster compression, smaller files (32 is good balance)
          }
        } else if (options.quality === 'high') {
          // Use slower preset for better quality
          const presetIndex = codecArgs.indexOf('-preset');
          if (presetIndex !== -1) {
            codecArgs[presetIndex + 1] = 'medium';
          }
          // Lower CRF for better quality
          const crfIndex = codecArgs.indexOf('-crf');
          if (crfIndex !== -1) {
            codecArgs[crfIndex + 1] = '20'; // H.264 CRF for high quality
          }
        }
        // 'balanced' uses default (ultrafast + CRF 26)
      } else {
        // When using bitrate, still adjust preset if quality option is set
        if (options.quality === 'fast') {
          const presetIndex = codecArgs.indexOf('-preset');
          if (presetIndex !== -1) {
            codecArgs[presetIndex + 1] = 'ultrafast';
          }
        } else if (options.quality === 'high') {
          const presetIndex = codecArgs.indexOf('-preset');
          if (presetIndex !== -1) {
            codecArgs[presetIndex + 1] = 'medium';
          }
        }
      }
      
      // Build args
      // Map video and audio streams explicitly and remove metadata to reduce file size
      const args = [
        '-i', inputFileName,
        '-map', '0:v:0', // Map only first video stream
        ...codecArgs,
        ...audioArgs, // Includes -map 0:a:0, -c:a aac, -b:a 96k
        '-map_metadata', '-1', // Remove all metadata to reduce file size
      ];
      
      // Only add scale filter if we're actually scaling
      if (outputWidth !== originalWidth || outputHeight !== originalHeight) {
        args.push('-vf', `scale=${outputWidth}:${outputHeight}`);
      }
      
      args.push(
        '-threads', '0', // Use all available CPU cores
        '-movflags', '+faststart', // Optimize for web playback
        '-g', '120', // Larger keyframe interval = faster encoding (120 frames = 4 seconds at 30fps)
        '-keyint_min', '60', // Minimum keyframe interval (2 seconds at 30fps)
        '-sc_threshold', '0', // Disable scene change detection for faster encoding
        outputFileName,
      );

      // Check cancellation before starting compression
      if (this.isCancelled) {
        await this.ffmpeg.deleteFile(inputFileName);
        throw new Error('Compression was cancelled');
      }
      
      // Report compression start
      onProgress?.({
        progress: 5,
        stage: 'compressing',
        message: 'Starting compression...',
      });

      // Execute FFmpeg with error handling
      // Fallback progress indicator (in case FFmpeg progress events don't fire)
      let fallbackProgressInterval: NodeJS.Timeout | null = null;
      let estimatedProgress = 5;
      
      try {
        // Use exec with proper error handling
        const execPromise = this.ffmpeg.exec(args);
        
        // Fallback: Update progress every 2 seconds if no real progress events
        fallbackProgressInterval = setInterval(() => {
          // Check if cancelled
          if (this.isCancelled) {
            if (fallbackProgressInterval) {
              clearInterval(fallbackProgressInterval);
            }
            return;
          }
          
          if (lastProgress === 5) {
            // Only update if we're still at 5% (no real progress)
            estimatedProgress = Math.min(estimatedProgress + 1, 90);
            onProgress?.({
              progress: estimatedProgress,
              stage: 'compressing',
              message: `Compressing video... ${estimatedProgress}% (estimated)`,
            });
          }
        }, 2000);
        
        // Add a timeout to detect if FFmpeg hangs (30 minutes max for large files)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            if (fallbackProgressInterval) {
              clearInterval(fallbackProgressInterval);
            }
            reject(new Error('Compression timed out after 30 minutes'));
          }, 30 * 60 * 1000);
        });
        
        await Promise.race([execPromise, timeoutPromise]);
        
        // Check cancellation immediately after execution
        if (this.isCancelled) {
          // Clean up files
          try {
            await this.ffmpeg.deleteFile(inputFileName);
            await this.ffmpeg.deleteFile(outputFileName).catch(() => {});
          } catch (e) {
            // Ignore cleanup errors
          }
          // Clear fallback interval
          if (fallbackProgressInterval) {
            clearInterval(fallbackProgressInterval);
          }
          throw new Error('Compression was cancelled');
        }
        
        // Clear fallback interval
        if (fallbackProgressInterval) {
          clearInterval(fallbackProgressInterval);
          fallbackProgressInterval = null;
        }
      } catch (execError) {
        // Clear fallback interval on error
        if (fallbackProgressInterval) {
          clearInterval(fallbackProgressInterval);
        }
        
        // Remove progress handler on error
        this.ffmpeg.off('progress', progressHandler);
        throw new Error(
          `FFmpeg execution failed: ${execError instanceof Error ? execError.message : String(execError)}`,
        );
      }

      // Remove progress handler after completion
      this.ffmpeg.off('progress', progressHandler);

      // Report finalizing
      onProgress?.({
        progress: 95,
        stage: 'finalizing',
        message: 'Finalizing compressed video...',
      });

      // Check cancellation before reading output
      if (this.isCancelled) {
        await this.ffmpeg.deleteFile(inputFileName);
        await this.ffmpeg.deleteFile(outputFileName).catch(() => {});
        throw new Error('Compression was cancelled');
      }
      
      // Read output file
      const data = await this.ffmpeg.readFile(outputFileName);
      
      // Check cancellation after reading
      if (this.isCancelled) {
        await this.ffmpeg.deleteFile(inputFileName);
        await this.ffmpeg.deleteFile(outputFileName).catch(() => {});
        throw new Error('Compression was cancelled');
      }
      
      const blob = new Blob([data], { type: codecConfig.mimeType });
      const compressedFile = new File(
        [blob],
        file.name.replace(/\.[^/.]+$/, '') + '.' + codecConfig.extension,
        { type: codecConfig.mimeType },
      );

      // Clean up
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      // Calculate compression ratio
      const originalSize = file.size;
      const compressedSize = compressedFile.size;
      const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

      return {
        file: compressedFile,
        originalSize,
        compressedSize,
        compressionRatio,
        codec: codecConfig.codec,
      };
    } catch (error) {
      // Clean up progress handler on error
      if (this.ffmpeg) {
        this.ffmpeg.off('progress');
      }
      
      throw new Error(
        `Compression failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Check if compression is supported (WebAssembly available)
   */
  static isSupported(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return typeof WebAssembly !== 'undefined';
  }

  /**
   * Get estimated compression time (rough estimate)
   */
  static estimateCompressionTime(fileSizeMB: number): number {
    // Rough estimate: ~1 minute per 50MB on average desktop
    return Math.ceil((fileSizeMB / 50) * 60);
  }
}

