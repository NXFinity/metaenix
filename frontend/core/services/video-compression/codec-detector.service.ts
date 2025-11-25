/**
 * Codec Detection Service
 * 
 * Detects the best video codec supported by the user's browser.
 * Priority: H.265/HEVC → VP9 → H.264 (fallback)
 */

export type VideoCodec = 'h265' | 'vp9' | 'h264';

export interface CodecConfig {
  codec: VideoCodec;
  codecName: string;
  mimeType: string;
  extension: string;
}

/**
 * Detect the best video codec supported by the browser
 */
export async function detectBestCodec(): Promise<CodecConfig> {
  // Test H.265/HEVC support (Safari, Edge)
  if (await testCodecSupport('video/mp4; codecs="hev1.1.6.L93.B0"')) {
    return {
      codec: 'h265',
      codecName: 'libx265',
      mimeType: 'video/mp4',
      extension: 'mp4',
    };
  }

  // Test VP9 support (Chrome, Firefox)
  if (await testCodecSupport('video/webm; codecs="vp9"')) {
    return {
      codec: 'vp9',
      codecName: 'libvpx-vp9',
      mimeType: 'video/webm',
      extension: 'webm',
    };
  }

  // Fallback to H.264 (universal support)
  return {
    codec: 'h264',
    codecName: 'libx264',
    mimeType: 'video/mp4',
    extension: 'mp4',
  };
}

/**
 * Test if a codec is supported by the browser
 */
function testCodecSupport(mimeType: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      // Server-side rendering - default to H.264
      resolve(false);
      return;
    }

    const video = document.createElement('video');
    const canPlay = video.canPlayType(mimeType);
    resolve(canPlay === 'probably' || canPlay === 'maybe');
  });
}

/**
 * Get FFmpeg codec arguments for a given codec
 */
export function getCodecArgs(codec: VideoCodec): string[] {
  switch (codec) {
    case 'h265':
      return ['-c:v', 'libx265', '-preset', 'ultrafast', '-crf', '26']; // Higher CRF = faster, smaller files
    case 'vp9':
      return ['-c:v', 'libvpx-vp9', '-crf', '32', '-b:v', '0', '-speed', '4']; // Speed 4 = faster
    case 'h264':
    default:
      // Use ultrafast preset and higher CRF for speed and smaller files (30 = faster encoding, smaller files)
      // -tune fastdecode optimizes for faster playback
      // -profile:v baseline for maximum compatibility and speed
      // -level 4.0 supports up to 1920x1080@30fps (higher than 3.1 which was causing warnings)
      return ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '30', '-tune', 'fastdecode', '-profile:v', 'baseline', '-level', '4.0'];
  }
}

/**
 * Get audio codec arguments (AAC for all codecs)
 * Maps only the first audio stream to avoid encoding multiple tracks
 */
export function getAudioCodecArgs(): string[] {
  return ['-map', '0:a:0', '-c:a', 'aac', '-b:a', '96k']; // Map only first audio track, lower bitrate for smaller files
}

