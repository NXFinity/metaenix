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
import { VideosService } from './videos.service';
import { CreateVideoDto } from './assets/dto/create-video.dto';
import { UpdateVideoDto } from './assets/dto/update-video.dto';
import { CurrentUser } from 'src/security/auth/decorators/currentUser.decorator';
import { User } from '../../assets/entities/user.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Public } from 'src/security/auth/decorators/public.decorator';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import { Throttle } from '@throttle/throttle';
import { memoryStorage } from 'multer';
import { RequireScope } from 'src/security/developer/services/scopes/decorators/require-scope.decorator';

@ApiTags('Account Management | Videos')
@Controller('videos')
@ApiBearerAuth()
export class VideosController {
  constructor(
    private readonly videosService: VideosService,
  ) {}

  // #########################################################
  // CREATE OPTIONS
  // #########################################################

  @Post('upload')
  @RequireScope('write:videos')
  @Throttle({ limit: 5, ttl: 60 }) // 5 videos per minute
  @UseInterceptors(
    FileInterceptor('video', {
      storage: memoryStorage(),
      limits: {
        fileSize: 600 * 1024 * 1024, // 600MB max per video
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a video',
    description:
      'Upload a video file to the user account. The video will be processed and stored.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        video: {
          type: 'string',
          format: 'binary',
          description: 'Video file to upload',
        },
        title: {
          type: 'string',
          description: 'Video title',
          example: 'My Awesome Video',
        },
        description: {
          type: 'string',
          description: 'Video description',
          example: 'This is a description of my video',
        },
        isPublic: {
          type: 'boolean',
          description: 'Whether the video is public',
          example: true,
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorization',
          example: ['gaming', 'tutorial'],
        },
      },
      required: ['video', 'title'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Video uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadVideo(
    @CurrentUser() user: User,
    @UploadedFile() videoFile: Express.Multer.File,
    @Body('title') title: string,
    @Body('description') description?: string,
    @Body('isPublic') isPublic?: boolean,
    @Body('tags') tags?: string | string[],
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }

    if (!videoFile) {
      throw new ForbiddenException('Video file is required');
    }

    // Validate video file type
    const allowedMimeTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedMimeTypes.includes(videoFile.mimetype)) {
      throw new ForbiddenException(
        `Video type ${videoFile.mimetype} is not supported. Allowed types: ${allowedMimeTypes.join(', ')}`,
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
    const createDto: CreateVideoDto = {
      title,
      description: description || undefined,
      isPublic: isPublic !== undefined ? isPublic : true,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
    };

    return this.videosService.createVideo(userId, createDto, videoFile);
  }

  // #########################################################
  // FIND OPTIONS
  // #########################################################

  @Get('user/:userId')
  @Public()
  @RequireScope('read:videos')
  @ApiOperation({
    summary: 'Get all videos for a user',
    description:
      'Returns paginated list of videos for the specified user. Only public videos are shown unless you are the owner.',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({
    status: 200,
    description: 'Videos retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserVideos(
    @Param('userId') userId: string,
    @Query() paginationDto: PaginationDto,
    @CurrentUser() user?: User,
  ) {
    const requestingUserId = user?.id;
    return this.videosService.getUserVideos(
      userId,
      paginationDto,
      requestingUserId,
    );
  }

  @Get(':id')
  @Public()
  @RequireScope('read:videos')
  @ApiOperation({
    summary: 'Get a single video by ID',
    description: 'Returns a specific video. Only public videos are accessible unless you are the owner.',
  })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiResponse({
    status: 200,
    description: 'Video found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async getVideoById(
    @Param('id') id: string,
    @CurrentUser() user?: User,
  ) {
    const requestingUserId = user?.id;
    return this.videosService.getVideoById(id, requestingUserId);
  }

  // #########################################################
  // UPDATE OPTIONS
  // #########################################################

  @Patch(':id')
  @RequireScope('write:videos')
  @ApiOperation({
    summary: 'Update a video',
    description: 'Updates video metadata (title, description, visibility, tags).',
  })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiResponse({
    status: 200,
    description: 'Video updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async updateVideo(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateDto: UpdateVideoDto,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }

    return this.videosService.updateVideo(userId, id, updateDto);
  }

  // #########################################################
  // DELETE OPTIONS
  // #########################################################

  @Delete(':id')
  @RequireScope('write:videos')
  @ApiOperation({
    summary: 'Delete a video',
    description: 'Deletes a video and removes it from storage.',
  })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiResponse({
    status: 200,
    description: 'Video deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async deleteVideo(@CurrentUser() user: User, @Param('id') id: string) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }

    await this.videosService.deleteVideo(userId, id);
    return { message: 'Video deleted successfully' };
  }

  // #########################################################
  // TRACKING OPTIONS
  // #########################################################

  @Post(':id/view')
  @Public()
  @RequireScope('read:videos')
  @ApiOperation({
    summary: 'Track video view',
    description: 'Increments the view count for a video.',
  })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiResponse({
    status: 200,
    description: 'View tracked successfully',
  })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async trackVideoView(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @CurrentUser() user?: User,
  ) {
    const userId = user?.id;
    await this.videosService.trackVideoView(id, req, userId);
    return { message: 'View tracked successfully' };
  }

  @Post(':id/thumbnail')
  @RequireScope('write:videos')
  @Throttle({ limit: 10, ttl: 60 }) // 10 thumbnails per minute
  @UseInterceptors(
    FileInterceptor('thumbnail', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max for thumbnail
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload video thumbnail',
    description: 'Upload a thumbnail image for a video. Accepts JPEG, PNG, or WebP images.',
  })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        thumbnail: {
          type: 'string',
          format: 'binary',
          description: 'Thumbnail image file (JPEG, PNG, or WebP)',
        },
      },
      required: ['thumbnail'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thumbnail uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async uploadThumbnail(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @UploadedFile() thumbnailFile: Express.Multer.File,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }

    if (!thumbnailFile) {
      throw new ForbiddenException('Thumbnail file is required');
    }

    // Validate image file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(thumbnailFile.mimetype)) {
      throw new ForbiddenException(
        `Image type ${thumbnailFile.mimetype} is not supported. Allowed types: ${allowedMimeTypes.join(', ')}`,
      );
    }

    return this.videosService.uploadThumbnail(userId, id, thumbnailFile);
  }

}
