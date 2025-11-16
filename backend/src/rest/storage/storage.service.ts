import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageType, STORAGE_TYPE_METADATA } from './assets/enum/storage-type.enum';
import { LoggingService, LogCategory } from '@logging/logging';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private bucket: string;
  private endpoint: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly loggingService: LoggingService,
  ) {
    // Initialize S3 client for Digital Ocean Spaces
    const spacesKey = this.configService.get<string>('DO_SPACES_KEY');
    const spacesSecret = this.configService.get<string>('DO_SPACES_SECRET');
    const spacesEndpoint = this.configService.get<string>(
      'DO_SPACES_BUCKET_ENDPOINT',
    );
    const spacesBucket = this.configService.get<string>('DO_SPACES_BUCKET');

    if (!spacesKey || !spacesSecret || !spacesEndpoint || !spacesBucket) {
      throw new Error(
        'Digital Ocean Spaces configuration is missing. Please check your environment variables.',
      );
    }

    this.bucket = spacesBucket;
    this.endpoint = spacesEndpoint;

    // S3Client requires a region, but DO Spaces endpoint contains region info
    // Use default region as it's not critical for DO Spaces
    this.s3Client = new S3Client({
      endpoint: spacesEndpoint,
      region: 'us-east-1', // Default region for S3Client (DO Spaces doesn't require specific region)
      credentials: {
        accessKeyId: spacesKey,
        secretAccessKey: spacesSecret,
      },
      forcePathStyle: false, // DO Spaces uses virtual-hosted-style URLs
    });
  }

  /**
   * Upload a file to Digital Ocean Spaces
   * @param userId - User ID for organizing files
   * @param file - File buffer and metadata
   * @param storageType - Type of storage (profile, media, documents, etc.)
   * @param subType - Optional sub-type (avatar, cover, offline, chat for profile)
   * @param customFilename - Optional custom filename (without extension)
   * @returns Upload response with URL and metadata
   */
  async uploadFile(
    userId: string,
    file: Express.Multer.File,
    storageType: StorageType,
    subType?: string,
    customFilename?: string,
  ): Promise<{
    url: string;
    key: string;
    size: number;
    mimeType: string;
    storageType: StorageType;
    subType?: string;
  }> {
    try {
      // Validate storage type
      const metadata = STORAGE_TYPE_METADATA[storageType];
      if (!metadata) {
        throw new BadRequestException(`Invalid storage type: ${storageType}`);
      }

      // Validate file size
      if (file.size > metadata.maxFileSize) {
        throw new BadRequestException(
          `File size exceeds maximum allowed size of ${metadata.maxFileSize / 1024 / 1024}MB`,
        );
      }

      // Validate MIME type
      if (
        metadata.allowedMimeTypes[0] !== '*' &&
        !metadata.allowedMimeTypes.includes(file.mimetype)
      ) {
        throw new BadRequestException(
          `File type ${file.mimetype} is not allowed for storage type ${storageType}`,
        );
      }

      // Validate sub-type for profile storage
      if (storageType === StorageType.PROFILE && subType) {
        if (!metadata.subTypes.includes(subType)) {
          throw new BadRequestException(
            `Invalid sub-type ${subType} for profile storage. Allowed: ${metadata.subTypes.join(', ')}`,
          );
        }
      }

      // Generate file key (path in storage)
      const fileKey = this.generateFileKey(
        userId,
        storageType,
        subType,
        file.originalname,
        customFilename,
      );

      // Upload file to DO Spaces
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucket,
          Key: fileKey,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read', // Make files publicly accessible
        },
      });

      await upload.done();

      // Construct public URL
      const url = `${this.endpoint}/${this.bucket}/${fileKey}`;

      this.loggingService.log(
        `File uploaded successfully: ${fileKey}`,
        'StorageService',
        {
          category: LogCategory.STORAGE,
          userId,
          metadata: {
            fileKey,
            storageType,
            subType,
            fileSize: file.size,
            mimeType: file.mimetype,
          },
        },
      );

      return {
        url,
        key: fileKey,
        size: file.size,
        mimeType: file.mimetype,
        storageType,
        subType,
      };
    } catch (error) {
      this.loggingService.error(
        'Error uploading file to storage',
        error instanceof Error ? error.stack : undefined,
        'StorageService',
        {
          category: LogCategory.STORAGE,
          userId,
          metadata: {
            storageType,
            subType,
          },
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  /**
   * Delete a file from Digital Ocean Spaces
   * @param fileKey - File key/path in storage
   * @param userId - User ID for authorization check
   */
  async deleteFile(fileKey: string, userId: string): Promise<void> {
    try {
      // Verify file belongs to user
      if (!fileKey.startsWith(`${userId}/`)) {
        throw new BadRequestException(
          'You do not have permission to delete this file',
        );
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      await this.s3Client.send(command);

      this.loggingService.log(
        `File deleted successfully: ${fileKey}`,
        'StorageService',
        {
          category: LogCategory.STORAGE,
          userId,
          metadata: {
            fileKey,
          },
        },
      );
    } catch (error) {
      this.loggingService.error(
        'Error deleting file from storage',
        error instanceof Error ? error.stack : undefined,
        'StorageService',
        {
          category: LogCategory.STORAGE,
          userId,
          metadata: {
            fileKey,
          },
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  /**
   * Get a presigned URL for temporary file access
   * @param fileKey - File key/path in storage
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns Presigned URL
   */
  async getPresignedUrl(
    fileKey: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return url;
    } catch (error) {
      this.loggingService.error(
        'Error generating presigned URL',
        error instanceof Error ? error.stack : undefined,
        'StorageService',
        {
          category: LogCategory.STORAGE,
          metadata: {
            fileKey,
          },
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to generate presigned URL');
    }
  }

  /**
   * Generate file key (path) for storage
   * Format: userId/storageType/subType/filename.ext
   */
  private generateFileKey(
    userId: string,
    storageType: StorageType,
    subType: string | undefined,
    originalFilename: string,
    customFilename?: string,
  ): string {
    const ext = path.extname(originalFilename);
    const baseName = customFilename
      ? customFilename
      : path.basename(originalFilename, ext) ||
        crypto.randomBytes(16).toString('hex');

    // Sanitize filename
    const sanitizedBaseName = baseName
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 100);

    const parts = [userId, storageType];
    if (subType) {
      parts.push(subType);
    }
    parts.push(`${sanitizedBaseName}${ext}`);

    return parts.join('/');
  }
}
