/**
 * Storage type enumeration
 * Defines the different storage categories for file organization
 */
export enum StorageType {
  PROFILE = 'profile',
  MEDIA = 'media',
  DOCUMENTS = 'documents',
  TEMP = 'temp',
  BACKUPS = 'backups',
}

/**
 * Storage type metadata
 * Provides descriptions and allowed file types for each storage category
 */
export const STORAGE_TYPE_METADATA: Record<
  StorageType,
  {
    type: string;
    description: string;
    allowedMimeTypes: string[];
    maxFileSize: number;
    subTypes: string[];
  }
> = {
  [StorageType.PROFILE]: {
    type: 'profile',
    description: 'Profile pictures, avatars, photos and other image types',
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    subTypes: ['avatar', 'cover', 'offline', 'chat'],
  },
  [StorageType.MEDIA]: {
    type: 'media',
    description: 'Media files and content',
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
    ],
    maxFileSize: 100 * 1024 * 1024, // 100MB
    subTypes: ['photo', 'video', 'audio', 'post'],
  },
  [StorageType.DOCUMENTS]: {
    type: 'documents',
    description: 'Documents and files',
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    subTypes: [],
  },
  [StorageType.TEMP]: {
    type: 'temp',
    description: 'Temporary files',
    allowedMimeTypes: ['*'], // All types allowed
    maxFileSize: 10 * 1024 * 1024, // 10MB
    subTypes: [],
  },
  [StorageType.BACKUPS]: {
    type: 'backups',
    description: 'Backup files',
    allowedMimeTypes: [
      'application/zip',
      'application/x-tar',
      'application/gzip',
      'application/x-gzip',
    ],
    maxFileSize: 500 * 1024 * 1024, // 500MB
    subTypes: [],
  },
} as const;

