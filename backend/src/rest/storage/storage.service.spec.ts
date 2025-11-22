import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { StorageService } from './storage.service';
import { FileValidationService } from './services/file-validation.service';
import { LoggingService } from '@logging/logging';
import { StorageType } from './assets/enum/storage-type.enum';

// Mock AWS SDK - use factory functions to avoid hoisting issues
const mockUploadDone = jest.fn();
const mockS3Send = jest.fn();
const mockGetSignedUrl = jest.fn();

jest.mock('@aws-sdk/lib-storage');
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

describe('StorageService', () => {
  let service: StorageService;
  let loggingService: jest.Mocked<LoggingService>;

  // Create a valid JPEG buffer (JPEG starts with FFD8FF)
  const createJpegBuffer = (): Buffer => {
    const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG magic bytes
    const rest = Buffer.alloc(1024 * 1024 - 4, 0); // Fill rest with zeros
    return Buffer.concat([jpegHeader, rest]);
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024 * 1024, // 1MB
    buffer: createJpegBuffer(),
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };

  beforeEach(async () => {
    const { Upload } = await import('@aws-sdk/lib-storage');
    const { S3Client } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    
    const mockUploadInstance = { done: mockUploadDone };
    (Upload as unknown as jest.Mock) = jest.fn(() => mockUploadInstance);
    
    const mockS3ClientInstance = { send: mockS3Send };
    (S3Client as jest.Mock) = jest.fn(() => mockS3ClientInstance);
    
    (getSignedUrl as jest.Mock) = mockGetSignedUrl;
    
    mockUploadDone.mockReset();
    mockS3Send.mockReset();
    mockGetSignedUrl.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                DO_SPACES_KEY: 'test-key',
                DO_SPACES_SECRET: 'test-secret',
                DO_SPACES_BUCKET_ENDPOINT: 'https://nyc3.digitaloceanspaces.com',
                DO_SPACES_BUCKET: 'test-bucket',
              };
              return config[key];
            }),
          },
        },
        {
          provide: LoggingService,
          useValue: {
            error: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
          },
        },
        {
          provide: FileValidationService,
          useValue: {
            validateFileContent: jest.fn().mockReturnValue(true),
            detectFileType: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    loggingService = module.get(LoggingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should successfully upload a file', async () => {
      // Arrange
      const userId = 'user-123';
      const storageType = StorageType.PROFILE;
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.nyc3.digitaloceanspaces.com/user-123/profile/test.jpg',
      });

      // Act
      const result = await service.uploadFile(userId, mockFile, storageType);

      // Assert
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
      expect(result.storageType).toBe(storageType);
      expect(mockUploadDone).toHaveBeenCalled();
    });

    it('should throw error if storage type is invalid', async () => {
      // Arrange
      const userId = 'user-123';
      const invalidStorageType = 'invalid' as StorageType;

      // Act & Assert
      await expect(
        service.uploadFile(userId, mockFile, invalidStorageType),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.uploadFile(userId, mockFile, invalidStorageType),
      ).rejects.toThrow('Invalid storage type');
    });

    it('should throw error if file size exceeds limit', async () => {
      // Arrange
      const userId = 'user-123';
      const largeFile = {
        ...mockFile,
        size: 100 * 1024 * 1024, // 100MB (exceeds profile limit)
      };

      // Act & Assert
      await expect(
        service.uploadFile(userId, largeFile, StorageType.PROFILE),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.uploadFile(userId, largeFile, StorageType.PROFILE),
      ).rejects.toThrow('File size exceeds maximum');
    });

    it('should throw error if MIME type is not allowed', async () => {
      // Arrange
      const userId = 'user-123';
      const invalidFile = {
        ...mockFile,
        mimetype: 'application/x-executable', // Not allowed for profile
      };

      // Act & Assert
      await expect(
        service.uploadFile(userId, invalidFile, StorageType.PROFILE),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.uploadFile(userId, invalidFile, StorageType.PROFILE),
      ).rejects.toThrow('File type');
    });

    it('should handle upload errors gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      mockUploadDone.mockRejectedValue(new Error('Upload failed'));

      // Act & Assert
      await expect(
        service.uploadFile(userId, mockFile, StorageType.PROFILE),
      ).rejects.toThrow(InternalServerErrorException);
      expect(loggingService.error).toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    it('should successfully delete a file', async () => {
      // Arrange
      const fileKey = 'user-123/profile/test.jpg';
      const userId = 'user-123';
      mockS3Send.mockResolvedValue({});

      // Act
      await service.deleteFile(fileKey, userId);

      // Assert
      expect(mockS3Send).toHaveBeenCalled();
    });

    it('should throw error if file does not belong to user', async () => {
      // Arrange
      const fileKey = 'other-user/profile/test.jpg';
      const userId = 'user-123';

      // Act & Assert
      await expect(service.deleteFile(fileKey, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deleteFile(fileKey, userId)).rejects.toThrow(
        'You do not have permission',
      );
    });

    it('should handle delete errors gracefully', async () => {
      // Arrange
      const fileKey = 'user-123/profile/test.jpg';
      const userId = 'user-123';
      mockS3Send.mockRejectedValue(new Error('Delete failed'));

      // Act & Assert
      await expect(service.deleteFile(fileKey, userId)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(loggingService.error).toHaveBeenCalled();
    });
  });

  describe('getPresignedUrl', () => {
    it('should generate a presigned URL', async () => {
      // Arrange
      const fileKey = 'user-123/profile/test.jpg';
      const expiresIn = 3600;
      mockGetSignedUrl.mockResolvedValue('https://presigned-url.com/test.jpg');

      // Act
      const result = await service.getPresignedUrl(fileKey, expiresIn);

      // Assert
      expect(result).toBe('https://presigned-url.com/test.jpg');
      expect(mockGetSignedUrl).toHaveBeenCalled();
    });

    it('should use default expiry if not provided', async () => {
      // Arrange
      const fileKey = 'user-123/profile/test.jpg';
      mockGetSignedUrl.mockResolvedValue('https://presigned-url.com/test.jpg');

      // Act
      await service.getPresignedUrl(fileKey);

      // Assert
      expect(mockGetSignedUrl).toHaveBeenCalled();
    });

    it('should handle presigned URL generation errors', async () => {
      // Arrange
      const fileKey = 'user-123/profile/test.jpg';
      mockGetSignedUrl.mockRejectedValue(new Error('Failed to generate URL'));

      // Act & Assert
      await expect(service.getPresignedUrl(fileKey)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(loggingService.error).toHaveBeenCalled();
    });
  });
});
