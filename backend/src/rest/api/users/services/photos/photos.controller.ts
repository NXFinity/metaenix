import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseInterceptors,
  UploadedFile,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { PhotosService } from './photos.service';
import { CreatePhotoDto } from './assets/dto/create-photo.dto';
import { UpdatePhotoDto } from './assets/dto/update-photo.dto';
import { CurrentUser } from 'src/security/auth/decorators/currentUser.decorator';
import { User } from '../../assets/entities/user.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Public } from 'src/security/auth/decorators/public.decorator';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import { Throttle } from '@throttle/throttle';
import { memoryStorage } from 'multer';
import { RequireScope } from 'src/security/developer/services/scopes/decorators/require-scope.decorator';

@ApiTags('Account Management | Photos')
@Controller('photos')
@ApiBearerAuth()
export class PhotosController {
  constructor(
    private readonly photosService: PhotosService,
  ) {}

  // #########################################################
  // CREATE OPTIONS
  // #########################################################

  @Post('upload')
  @RequireScope('write:photos')
  @Throttle({ limit: 10, ttl: 60 }) // 10 photos per minute
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB max per photo
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a photo',
    description:
      'Upload a photo file to the user account. The photo will be processed and stored.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Photo file to upload',
        },
        title: {
          type: 'string',
          description: 'Photo title',
          example: 'My Awesome Photo',
        },
        description: {
          type: 'string',
          description: 'Photo description',
          example: 'This is a description of my photo',
        },
        isPublic: {
          type: 'boolean',
          description: 'Whether the photo is public',
          example: true,
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorization',
          example: ['nature', 'photography'],
        },
      },
      required: ['photo', 'title'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Photo uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadPhoto(
    @CurrentUser() user: User,
    @UploadedFile() photoFile: Express.Multer.File,
    @Body('title') title: string,
    @Body('description') description?: string,
    @Body('isPublic') isPublic?: boolean,
    @Body('tags') tags?: string | string[],
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }

    if (!photoFile) {
      throw new ForbiddenException('Photo file is required');
    }

    // Validate image file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(photoFile.mimetype)) {
      throw new ForbiddenException(
        `Image type ${photoFile.mimetype} is not supported. Allowed types: ${allowedMimeTypes.join(', ')}`,
      );
    }

    // Normalize tags to array (FormData can send as string or array)
    let tagsArray: string[] = [];
    if (tags) {
      if (Array.isArray(tags)) {
        tagsArray = tags.filter((tag) => tag && typeof tag === 'string' && tag.trim());
      } else if (typeof tags === 'string' && tags.trim()) {
        tagsArray = [tags];
      }
    }

    // Create DTO with normalized tags
    const createDto: CreatePhotoDto = {
      title,
      description: description || undefined,
      isPublic: isPublic !== undefined ? isPublic : true,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
    };

    return this.photosService.createPhoto(userId, createDto, photoFile);
  }

  // #########################################################
  // FIND OPTIONS
  // #########################################################

  @Get('user/:userId')
  @Public()
  @RequireScope('read:photos')
  @ApiOperation({
    summary: 'Get all photos for a user',
    description:
      'Returns paginated list of photos for the specified user. Only public photos are shown unless you are the owner.',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({
    status: 200,
    description: 'Photos retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserPhotos(
    @Param('userId') userId: string,
    @Query() paginationDto: PaginationDto,
    @CurrentUser() user?: User,
  ) {
    const requestingUserId = user?.id;
    return this.photosService.getUserPhotos(
      userId,
      paginationDto,
      requestingUserId,
    );
  }

  @Get(':id')
  @Public()
  @RequireScope('read:photos')
  @ApiOperation({
    summary: 'Get a single photo by ID',
    description: 'Returns a specific photo. Only public photos are accessible unless you are the owner.',
  })
  @ApiParam({ name: 'id', description: 'Photo ID' })
  @ApiResponse({
    status: 200,
    description: 'Photo found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  async getPhotoById(
    @Param('id') id: string,
    @CurrentUser() user?: User,
  ) {
    const requestingUserId = user?.id;
    return this.photosService.getPhotoById(id, requestingUserId);
  }

  // #########################################################
  // UPDATE OPTIONS
  // #########################################################

  @Patch(':id')
  @RequireScope('write:photos')
  @ApiOperation({
    summary: 'Update a photo',
    description: 'Updates photo metadata (title, description, visibility, tags).',
  })
  @ApiParam({ name: 'id', description: 'Photo ID' })
  @ApiResponse({
    status: 200,
    description: 'Photo updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  async updatePhoto(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateDto: UpdatePhotoDto,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }

    return this.photosService.updatePhoto(userId, id, updateDto);
  }

  // #########################################################
  // DELETE OPTIONS
  // #########################################################

  @Delete(':id')
  @RequireScope('write:photos')
  @ApiOperation({
    summary: 'Delete a photo',
    description: 'Deletes a photo and removes it from storage.',
  })
  @ApiParam({ name: 'id', description: 'Photo ID' })
  @ApiResponse({
    status: 200,
    description: 'Photo deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  async deletePhoto(@CurrentUser() user: User, @Param('id') id: string) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }

    await this.photosService.deletePhoto(userId, id);
    return { message: 'Photo deleted successfully' };
  }

  // #########################################################
  // TRACKING OPTIONS
  // #########################################################

  @Post(':id/view')
  @Public()
  @RequireScope('read:photos')
  @ApiOperation({
    summary: 'Track photo view',
    description: 'Increments the view count for a photo.',
  })
  @ApiParam({ name: 'id', description: 'Photo ID' })
  @ApiResponse({
    status: 200,
    description: 'View tracked successfully',
  })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  async trackPhotoView(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @CurrentUser() user?: User,
  ) {
    const userId = user?.id;
    await this.photosService.trackPhotoView(id, req, userId);
    return { message: 'View tracked successfully' };
  }
}
