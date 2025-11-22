import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LikesService } from './likes.service';
import { CurrentUser } from '../../security/auth/decorators/currentUser.decorator';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { Throttle } from '@throttle/throttle';
import { RequireScope } from '../../security/developer/services/scopes/decorators/require-scope.decorator';
import { LikeResourceType } from './assets/enum/resource-type.enum';

@ApiTags('Data Management | Likes')
@Controller('likes')
@ApiBearerAuth()
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  /**
   * Like a resource
   */
  @Post('resources/:resourceType/:resourceId')
  @RequireScope('write:likes')
  @Throttle({ limit: 60, ttl: 60 }) // 60 likes per minute
  @ApiOperation({
    summary: 'Like a resource',
    description: 'Like any resource type (post, video, comment, photo, article, etc.)',
  })
  @ApiParam({
    name: 'resourceType',
    description: 'Type of resource (post, video, comment, photo, article)',
    enum: LikeResourceType,
  })
  @ApiParam({
    name: 'resourceId',
    description: 'ID of the resource',
    type: 'string',
  })
  @ApiResponse({
    status: 201,
    description: 'Resource liked successfully',
  })
  @ApiResponse({ status: 400, description: 'Already liked' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  likeResource(
    @CurrentUser() user: User,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.likesService.likeResource(userId, resourceType, resourceId);
  }

  /**
   * Unlike a resource
   */
  @Delete('resources/:resourceType/:resourceId')
  @RequireScope('write:likes')
  @Throttle({ limit: 60, ttl: 60 }) // 60 unlikes per minute
  @ApiOperation({
    summary: 'Unlike a resource',
    description: 'Unlike any resource type (post, video, comment, photo, article, etc.)',
  })
  @ApiParam({
    name: 'resourceType',
    description: 'Type of resource (post, video, comment, photo, article)',
    enum: LikeResourceType,
  })
  @ApiParam({
    name: 'resourceId',
    description: 'ID of the resource',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Resource unliked successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Like not found' })
  unlikeResource(
    @CurrentUser() user: User,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.likesService.unlikeResource(userId, resourceType, resourceId);
  }

  /**
   * Check if user has liked a resource
   */
  @Get('resources/:resourceType/:resourceId/status')
  @RequireScope('read:likes')
  @ApiOperation({
    summary: 'Check if user has liked a resource',
    description: 'Returns whether the current user has liked the specified resource',
  })
  @ApiParam({
    name: 'resourceType',
    description: 'Type of resource (post, video, comment, photo, article)',
    enum: LikeResourceType,
  })
  @ApiParam({
    name: 'resourceId',
    description: 'ID of the resource',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Like status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        liked: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  checkLikeStatus(
    @CurrentUser() user: User,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.likesService.hasLiked(userId, resourceType, resourceId).then((liked) => ({
      liked,
    }));
  }

  /**
   * Get likes count for a resource
   */
  @Get('resources/:resourceType/:resourceId/count')
  @RequireScope('read:likes')
  @ApiOperation({
    summary: 'Get likes count for a resource',
    description: 'Returns the total number of likes for the specified resource',
  })
  @ApiParam({
    name: 'resourceType',
    description: 'Type of resource (post, video, comment, photo, article)',
    enum: LikeResourceType,
  })
  @ApiParam({
    name: 'resourceId',
    description: 'ID of the resource',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Likes count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
      },
    },
  })
  getLikesCount(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.likesService.getLikesCount(resourceType, resourceId).then((count) => ({
      count,
    }));
  }
}
