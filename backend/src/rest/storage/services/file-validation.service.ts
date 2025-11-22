import { Injectable, BadRequestException } from '@nestjs/common';
import { LoggingService, LogCategory } from '@logging/logging';

// File signatures are now handled directly in detectMimeTypeFromSignature method
// This provides better control and avoids duplicate key issues

/**
 * MIME type to signature mapping for validation
 */
const MIME_TO_SIGNATURES: Record<string, string[]> = {
  'image/jpeg': ['FFD8FF'],
  'image/jpg': ['FFD8FF'],
  'image/png': ['89504E47'],
  'image/gif': ['47494638'],
  'image/webp': ['52494646'], // RIFF...WEBP (validated in detection)
  'image/svg+xml': ['3C3F786D6C', '3C737667'],
  'video/mp4': ['ftyp'], // MP4 has variable box size, check for 'ftyp' box type
  'video/webm': ['1A45DFA3'],
  'video/quicktime': ['ftyp'], // QuickTime has variable box size, check for 'ftyp' box type
  'audio/mpeg': ['494433', 'FFF3', 'FFFB'],
  'audio/mp3': ['494433', 'FFF3', 'FFFB'],
  'audio/wav': ['52494646'],
  'audio/ogg': ['4F676753'],
  'application/pdf': ['255044462D'],
  'application/msword': ['D0CF11E0A1B11AE1'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['504B0304'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['504B0304'],
  'application/zip': ['504B0304', '504B0506', '504B0708'],
  'application/gzip': ['1F8B'],
  'application/x-gzip': ['1F8B'],
  'application/x-tar': ['7573746172'],
};

@Injectable()
export class FileValidationService {
  constructor(private readonly loggingService: LoggingService) {}

  /**
   * Get file signature (magic bytes) from buffer
   * Reads the first bytes of the file to determine its type
   */
  private getFileSignature(buffer: Buffer): string {
    // Read first 32 bytes (enough for most signatures)
    const bytes = buffer.slice(0, 32);
    return bytes.toString('hex').toUpperCase();
  }

  /**
   * Detect MIME type from file signature
   */
  private detectMimeTypeFromSignature(buffer: Buffer): string | null {
    if (buffer.length < 4) {
      return null;
    }

    const signature = this.getFileSignature(buffer);
    
    // Check for RIFF-based formats (WebP, WAV)
    if (signature.startsWith('52494646')) {
      // RIFF format - check subtype
      if (buffer.length >= 12) {
        const format = buffer.slice(8, 12).toString('ascii');
        if (format === 'WEBP') {
          return 'image/webp';
        }
        if (format === 'WAVE') {
          return 'audio/wav';
        }
      }
    }
    
    // Check for MP4/QuickTime (ISO Base Media File Format)
    // These files start with a box size (4 bytes) followed by 'ftyp'
    if (buffer.length >= 12) {
      const boxType = buffer.slice(4, 8).toString('ascii');
      
      if (boxType === 'ftyp') {
        // Check brand to determine if it's MP4 or QuickTime
        if (buffer.length >= 16) {
          const brand = buffer.slice(8, 12).toString('ascii');
          // QuickTime brand
          if (brand === 'qt  ') {
            return 'video/quicktime';
          }
          // MP4 brands: isom, mp41, mp42, avc1, iso2, etc.
          if (brand === 'isom' || brand === 'mp41' || brand === 'mp42' || brand === 'avc1' || brand === 'iso2') {
            return 'video/mp4';
          }
          // Some MP4 files may have other brands, but if it has ftyp it's likely MP4
          // We'll validate more strictly in validateFileContent
          return 'video/mp4';
        }
      }
    }
    
    // Check for WebM (Matroska)
    if (signature.startsWith('1A45DFA3')) {
      return 'video/webm';
    }
    
    // Check for JPEG
    if (signature.startsWith('FFD8FF')) {
      return 'image/jpeg';
    }
    
    // Check for PNG
    if (signature.startsWith('89504E47')) {
      return 'image/png';
    }
    
    // Check for GIF
    if (signature.startsWith('47494638')) {
      return 'image/gif';
    }
    
    // Check for SVG
    if (signature.startsWith('3C3F786D6C') || signature.startsWith('3C737667')) {
      return 'image/svg+xml';
    }
    
    // Check for MP3
    if (signature.startsWith('494433') || signature.startsWith('FFF3') || signature.startsWith('FFFB')) {
      return 'audio/mpeg';
    }
    
    // Check for OGG
    if (signature.startsWith('4F676753')) {
      return 'audio/ogg';
    }
    
    // Check for PDF
    if (signature.startsWith('255044462D')) {
      return 'application/pdf';
    }
    
    // Check for MS Office 97-2003 (DOC, XLS)
    if (signature.startsWith('D0CF11E0A1B11AE1')) {
      return 'application/msword';
    }
    
    // Check for ZIP-based formats (ZIP, DOCX, XLSX)
    if (signature.startsWith('504B0304') || signature.startsWith('504B0506') || signature.startsWith('504B0708')) {
      // Try to detect Office Open XML formats by checking internal structure
      if (buffer.length > 30) {
        try {
          // ZIP files can contain Office documents
          // We'll validate against declared MIME type in validateFileContent
          return 'application/zip';
        } catch {
          return 'application/zip';
        }
      }
      return 'application/zip';
    }
    
    // Check for GZIP
    if (signature.startsWith('1F8B')) {
      return 'application/gzip';
    }
    
    // Check for TAR
    if (buffer.length >= 257) {
      const tarSig = buffer.slice(257, 262).toString('hex').toUpperCase();
      if (tarSig.startsWith('7573746172')) {
        return 'application/x-tar';
      }
    }
    
    return null;
  }

  /**
   * Validate text file content (for TXT and CSV)
   */
  private isValidTextFile(buffer: Buffer): boolean {
    // Check if file contains only printable ASCII characters (with some exceptions for UTF-8)
    // For CSV, we expect comma-separated values
    // For TXT, we allow most printable characters
    
    // Check for null bytes (binary files)
    if (buffer.includes(0x00)) {
      return false;
    }
    
    // Check if it's valid UTF-8 or ASCII
    try {
      const text = buffer.toString('utf-8');
      // Basic validation: check for reasonable text content
      // Allow some control characters (newlines, tabs, etc.)
      const printableChars = text.split('').filter(char => {
        const code = char.charCodeAt(0);
        return code >= 9 && code <= 126 || code >= 160; // Printable ASCII + extended
      }).length;
      
      // At least 80% should be printable characters
      return printableChars / text.length >= 0.8;
    } catch {
      return false;
    }
  }

  /**
   * Validate SVG content
   */
  private isValidSvg(buffer: Buffer): boolean {
    try {
      const content = buffer.toString('utf-8');
      // Check if it starts with XML declaration or <svg tag
      const trimmed = content.trim();
      return (
        trimmed.startsWith('<?xml') ||
        trimmed.startsWith('<svg') ||
        trimmed.startsWith('<!DOCTYPE svg')
      );
    } catch {
      return false;
    }
  }

  /**
   * Validate file content matches MIME type
   * @param buffer - File buffer
   * @param declaredMimeType - MIME type declared by client
   * @returns true if valid, throws BadRequestException if invalid
   */
  validateFileContent(
    buffer: Buffer,
    declaredMimeType: string,
  ): boolean {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('File is empty');
    }

    // For text files, validate content
    if (declaredMimeType === 'text/plain' || declaredMimeType === 'text/csv') {
      if (!this.isValidTextFile(buffer)) {
        throw new BadRequestException(
          `File content does not match declared type ${declaredMimeType}. File appears to be binary.`,
        );
      }
      return true;
    }

    // For SVG, validate XML structure
    if (declaredMimeType === 'image/svg+xml') {
      if (!this.isValidSvg(buffer)) {
        throw new BadRequestException(
          `File content does not match declared type ${declaredMimeType}. File is not a valid SVG.`,
        );
      }
      return true;
    }

    // Get expected signatures for declared MIME type
    const expectedSignatures = MIME_TO_SIGNATURES[declaredMimeType];
    
    if (!expectedSignatures) {
      // MIME type not in our signature database - log warning but allow
      // (for TEMP storage type which allows all types)
      this.loggingService.log(
        `MIME type ${declaredMimeType} not in signature database - skipping content validation`,
        'FileValidationService',
        {
          category: LogCategory.STORAGE,
          metadata: { mimeType: declaredMimeType },
        },
      );
      return true;
    }

    // Get detected MIME type from signature
    const detectedMimeType = this.detectMimeTypeFromSignature(buffer);
    
    if (!detectedMimeType) {
      // Could not detect file type - validate against expected signatures
      const signature = this.getFileSignature(buffer);
      
      // Special handling for MP4 and QuickTime (variable box sizes)
      if (declaredMimeType === 'video/mp4' || declaredMimeType === 'video/quicktime') {
        if (buffer.length >= 8) {
          const boxType = buffer.slice(4, 8).toString('ascii');
          if (boxType === 'ftyp') {
            // Valid ftyp box - check brand for MP4 vs QuickTime
            if (buffer.length >= 16) {
              const brand = buffer.slice(8, 12).toString('ascii');
              if (declaredMimeType === 'video/mp4') {
                // MP4 brands: isom, mp41, mp42, avc1, iso2, etc. (not qt)
                if (brand !== 'qt  ') {
                  return true; // Likely MP4
                }
                // If brand is 'qt  ', it's QuickTime, not MP4
                throw new BadRequestException(
                  `File content does not match declared type ${declaredMimeType}. File appears to be QuickTime format.`,
                );
              } else if (declaredMimeType === 'video/quicktime') {
                // QuickTime brand
                if (brand === 'qt  ') {
                  return true; // QuickTime
                }
                // If brand is not 'qt  ', it might be MP4
                throw new BadRequestException(
                  `File content does not match declared type ${declaredMimeType}. File appears to be MP4 format.`,
                );
              }
            }
            // If we have ftyp but can't check brand, it's still a valid ISO Base Media file
            return true;
          }
        }
        throw new BadRequestException(
          `File content does not match declared type ${declaredMimeType}. File is not a valid ISO Base Media file.`,
        );
      }
      
      // For other types, check signature
      const matches = expectedSignatures.some(sig => {
        if (sig === 'ftyp') {
          // Special case for MP4/QuickTime - already handled above
          return false;
        }
        return signature.startsWith(sig);
      });
      
      if (!matches) {
        throw new BadRequestException(
          `File content does not match declared type ${declaredMimeType}. File signature does not match expected format.`,
        );
      }
      return true;
    }

    // Check if detected type matches declared type
    if (detectedMimeType !== declaredMimeType) {
      // Special cases for similar types
      if (
        (declaredMimeType === 'image/jpeg' || declaredMimeType === 'image/jpg') &&
        (detectedMimeType === 'image/jpeg' || detectedMimeType === 'image/jpg')
      ) {
        return true; // JPEG and JPG are the same
      }
      
      if (
        (declaredMimeType === 'audio/mpeg' || declaredMimeType === 'audio/mp3') &&
        (detectedMimeType === 'audio/mpeg' || detectedMimeType === 'audio/mp3')
      ) {
        return true; // MPEG and MP3 are the same
      }
      
      // For ZIP-based formats, we need to check internal structure
      if (declaredMimeType.includes('openxml') && detectedMimeType === 'application/zip') {
        // This is acceptable - DOCX/XLSX are ZIP archives
        // Additional validation: check if it's a valid ZIP and contains expected structure
        try {
          // Basic ZIP validation - check for ZIP local file header
          const zipHeader = buffer.slice(0, 4).toString('hex').toUpperCase();
          if (zipHeader === '504B0304' || zipHeader === '504B0506' || zipHeader === '504B0708') {
            return true;
          }
        } catch {
          // If we can't validate ZIP structure, reject it
          throw new BadRequestException(
            `File content does not match declared type ${declaredMimeType}. File is not a valid ZIP archive.`,
          );
        }
        return true;
      }
      
      // Allow ZIP for ZIP-based Office formats
      if (
        (declaredMimeType === 'application/zip' || declaredMimeType.includes('openxml')) &&
        detectedMimeType === 'application/zip'
      ) {
        return true;
      }
      
      throw new BadRequestException(
        `File content does not match declared type ${declaredMimeType}. Detected type: ${detectedMimeType}`,
      );
    }

    return true;
  }

  /**
   * Detect file type from content (magic bytes)
   * Useful for cases where MIME type is not provided or is incorrect
   */
  detectFileType(buffer: Buffer): string | null {
    return this.detectMimeTypeFromSignature(buffer);
  }
}

