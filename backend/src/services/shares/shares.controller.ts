import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SharesService } from './shares.service';
import { CreateShareDto } from './assets/dto/create-share.dto';
import { CurrentUser } from '../../security/auth/decorators/currentUser.decorator';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { Throttle } from '@throttle/throttle';
import { RequireScope } from '../../security/developer/services/scopes/decorators/require-scope.decorator';
import { ShareResourceType } from './assets/enum/resource-type.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Data Management | Shares')
@Controller('shares')
@ApiBearerAuth()
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  /**
   * Share a resource
   */
  @Post('resources/:resourceType/:resourceId')
  @RequireScope('write:shares')
  @Throttle({ limit: 20, ttl: 60 }) // 20 shares per minute
  @ApiOperation({
    summary: 'Share a resource',
    description: 'Share any resource type (post, video, photo, article, etc.)',
  })
  @ApiParam({
    name: 'resourceType',
    description: 'Type of resource (post, video, photo, article)',
    enum: ShareResourceType,
  })
  @ApiParam({
    name: 'resourceId',
    description: 'ID of the resource',
    type: 'string',
  })
  @ApiResponse({
    status: 201,
    description: 'Resource shared successfully',
  })
  @ApiResponse({ status: 400, description: 'Already shared or cannot share own content' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  shareResource(
    @CurrentUser() user: User,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Body(
      new ValidationPipe({
        skipMissingProperties: true,
        whitelist: true,
        forbidNonWhitelisted: false,
      }),
    )
    createShareDto?: CreateShareDto,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.sharesService.shareResource(
      userId,
      resourceType,
      resourceId,
      createShareDto || {},
    );
  }

  /**
   * Unshare a resource
   */
  @Delete('resources/:resourceType/:resourceId')
  @RequireScope('write:shares')
  @Throttle({ limit: 20, ttl: 60 }) // 20 unshares per minute
  @ApiOperation({
    summary: 'Unshare a resource',
    description: 'Remove a share for any resource type (post, video, photo, article, etc.)',
  })
  @ApiParam({
    name: 'resourceType',
    description: 'Type of resource (post, video, photo, article)',
    enum: ShareResourceType,
  })
  @ApiParam({
    name: 'resourceId',
    description: 'ID of the resource',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Resource unshared successfully',
  })
  @ApiResponse({ status: 400, description: 'Resource not shared' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Share not found' })
  unshareResource(
    @CurrentUser() user: User,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.sharesService.unshareResource(
      userId,
      resourceType,
      resourceId,
    );
  }

  /**
   * Check if user has shared a resource
   */
  @Get('resources/:resourceType/:resourceId/status')
  @RequireScope('read:shares')
  @ApiOperation({
    summary: 'Check if user has shared a resource',
    description: 'Returns whether the current user has shared the specified resource',
  })
  @ApiParam({
    name: 'resourceType',
    description: 'Type of resource (post, video, photo, article)',
    enum: ShareResourceType,
  })
  @ApiParam({
    name: 'resourceId',
    description: 'ID of the resource',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Share status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        shared: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  checkShareStatus(
    @CurrentUser() user: User,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.sharesService.hasShared(userId, resourceType, resourceId).then((shared) => ({
      shared,
    }));
  }

  /**
   * Get shares count for a resource
   */
  @Get('resources/:resourceType/:resourceId/count')
  @RequireScope('read:shares')
  @ApiOperation({
    summary: 'Get shares count for a resource',
    description: 'Returns the total number of shares for the specified resource',
  })
  @ApiParam({
    name: 'resourceType',
    description: 'Type of resource (post, video, photo, article)',
    enum: ShareResourceType,
  })
  @ApiParam({
    name: 'resourceId',
    description: 'ID of the resource',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Shares count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
      },
    },
  })
  getSharesCount(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.sharesService.getSharesCount(resourceType, resourceId).then((count) => ({
      count,
    }));
  }

  /**
   * Get user's shared posts
   */
  @Get('posts')
  @RequireScope('read:shares')
  @ApiOperation({
    summary: 'Get user\'s shared posts',
    description: 'Returns a paginated list of posts that the current user has shared',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Shared posts retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSharedPosts(
    @CurrentUser() user: User,
    @Query() paginationDto: PaginationDto,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.sharesService.getSharedPosts(userId, paginationDto);
  }

  /**
   * Get user's shared photos
   */
  @Get('photos')
  @RequireScope('read:shares')
  @ApiOperation({
    summary: 'Get user\'s shared photos',
    description: 'Returns a paginated list of photos that the current user has shared',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Shared photos retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSharedPhotos(
    @CurrentUser() user: User,
    @Query() paginationDto: PaginationDto,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.sharesService.getSharedPhotos(userId, paginationDto);
  }

  /**
   * Get user's shared videos
   */
  @Get('videos')
  @RequireScope('read:shares')
  @ApiOperation({
    summary: 'Get user\'s shared videos',
    description: 'Returns a paginated list of videos that the current user has shared',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Shared videos retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSharedVideos(
    @CurrentUser() user: User,
    @Query() paginationDto: PaginationDto,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.sharesService.getSharedVideos(userId, paginationDto);
  }
}
