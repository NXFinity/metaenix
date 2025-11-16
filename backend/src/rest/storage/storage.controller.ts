import {
  Controller,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { UploadFileDto, UploadResponseDto } from './assets/dto/upload-file.dto';
import { CurrentUser } from '../../security/auth/decorators/currentUser.decorator';
import { User } from '../api/users/assets/entities/user.entity';
import { StorageType } from './assets/enum/storage-type.enum';
import { memoryStorage } from 'multer';
import { RequireScope } from '../../security/developer/services/scopes/decorators/require-scope.decorator';

@ApiTags('Storage Management')
@ApiBearerAuth()
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @RequireScope('write:storage')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB max
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload a file to Digital Ocean Spaces',
    description:
      'Upload files organized by user ID and storage type. Supports profile images (avatar, cover, offline, chat), media files, documents, temporary files, and backups.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
        storageType: {
          type: 'string',
          enum: Object.values(StorageType),
          description:
            'Storage type (profile, media, documents, temp, backups)',
          example: StorageType.PROFILE,
        },
        subType: {
          type: 'string',
          enum: ['avatar', 'cover', 'offline', 'chat'],
          description:
            'Sub-type for profile images (required for profile storage type)',
          example: 'avatar',
        },
        filename: {
          type: 'string',
          description: 'Optional custom filename (without extension)',
          example: 'my-custom-filename',
        },
      },
      required: ['file', 'storageType'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: UploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type, size, or storage type',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadFileDto,
    @CurrentUser() user: User,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Validate sub-type for profile storage
    if (uploadDto.storageType === StorageType.PROFILE && !uploadDto.subType) {
      throw new BadRequestException(
        'subType is required for profile storage. Allowed values: avatar, cover, offline, chat',
      );
    }

    return await this.storageService.uploadFile(
      user.id,
      file,
      uploadDto.storageType,
      uploadDto.subType,
      uploadDto.filename,
    );
  }

  @Delete(':fileKey')
  @RequireScope('write:storage')
  @ApiOperation({
    summary: 'Delete a file from Digital Ocean Spaces',
    description:
      'Delete a file by its key. Only files belonging to the authenticated user can be deleted.',
  })
  @ApiParam({
    name: 'fileKey',
    description: 'File key/path in storage (URL encoded)',
    example: 'userId/profile/avatar/image.jpg',
  })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file key or permission denied',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async deleteFile(
    @Param('fileKey') fileKey: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    const decodedFileKey = decodeURIComponent(fileKey);
    await this.storageService.deleteFile(decodedFileKey, user.id);
    return { message: 'File deleted successfully' };
  }

  @Post('presigned-url')
  @RequireScope('read:storage')
  @ApiOperation({
    summary: 'Get a presigned URL for temporary file access',
    description:
      'Generate a presigned URL that provides temporary access to a file. Useful for private file access.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fileKey: {
          type: 'string',
          description: 'File key/path in storage',
          example: 'userId/profile/avatar/image.jpg',
        },
        expiresIn: {
          type: 'number',
          description: 'Expiration time in seconds (default: 3600)',
          default: 3600,
          example: 3600,
        },
      },
      required: ['fileKey'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Presigned URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Presigned URL',
        },
        expiresIn: {
          type: 'number',
          description: 'Expiration time in seconds',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getPresignedUrl(
    @Body('fileKey') fileKey: string,
    @Body('expiresIn') expiresIn?: number,
  ): Promise<{ url: string; expiresIn: number }> {
    const expiration = expiresIn || 3600;
    const url = await this.storageService.getPresignedUrl(fileKey, expiration);
    return { url, expiresIn: expiration };
  }
}
