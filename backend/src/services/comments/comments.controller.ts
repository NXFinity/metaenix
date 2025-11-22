import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './assets/dto/create-comment.dto';
import { UpdateCommentDto } from './assets/dto/update-comment.dto';
import { CurrentUser } from '../../security/auth/decorators/currentUser.decorator';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Throttle } from '@throttle/throttle';
import { RequireScope } from '../../security/developer/services/scopes';
import { CommentResourceType } from './assets/enum/resource-type.enum';

@ApiTags('Social Management | Comments')
@Controller('comments')
@ApiBearerAuth()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /**
   * Create a comment on any resource
   */
  @Post('resources/:resourceType/:resourceId')
  @RequireScope('write:comments')
  @Throttle({ limit: 20, ttl: 60 }) // 20 comments per minute
  @ApiOperation({
    summary: 'Create a comment on a resource',
    description: 'Create a comment on any resource type (post, video, photo, article, etc.)',
  })
  @ApiParam({
    name: 'resourceType',
    description: 'Type of resource (post, video, photo, article)',
    enum: CommentResourceType,
  })
  @ApiParam({
    name: 'resourceId',
    description: 'ID of the resource',
    type: 'string',
  })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Comments disabled' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  createComment(
    @CurrentUser() user: User,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.commentsService.createComment(
      userId,
      resourceType,
      resourceId,
      createCommentDto,
    );
  }

  /**
   * Get comments for a resource
   */
  @Get('resources/:resourceType/:resourceId')
  @RequireScope('read:comments')
  @ApiOperation({
    summary: 'Get comments for a resource',
    description: 'Get all comments for a specific resource with pagination',
  })
  @ApiParam({
    name: 'resourceType',
    description: 'Type of resource (post, video, photo, article)',
    enum: CommentResourceType,
  })
  @ApiParam({
    name: 'resourceId',
    description: 'ID of the resource',
    type: 'string',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  getComments(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.commentsService.getComments(resourceType, resourceId, paginationDto);
  }

  /**
   * Get a single comment by ID
   */
  @Get(':commentId')
  @RequireScope('read:comments')
  @ApiOperation({
    summary: 'Get a comment by ID',
    description: 'Get a single comment with its replies',
  })
  @ApiParam({
    name: 'commentId',
    description: 'Comment ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Comment retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  getCommentById(@Param('commentId') commentId: string) {
    return this.commentsService.getCommentById(commentId);
  }

  /**
   * Update a comment
   */
  @Patch(':commentId')
  @RequireScope('write:comments')
  @Throttle({ limit: 10, ttl: 60 }) // 10 updates per minute
  @ApiOperation({
    summary: 'Update a comment',
    description: 'Update your own comment',
  })
  @ApiParam({
    name: 'commentId',
    description: 'Comment ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Comment updated successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not your comment' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  updateComment(
    @CurrentUser() user: User,
    @Param('commentId') commentId: string,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.commentsService.updateComment(userId, commentId, updateCommentDto);
  }

  /**
   * Delete a comment
   */
  @Delete(':commentId')
  @RequireScope('write:comments')
  @Throttle({ limit: 10, ttl: 60 }) // 10 deletes per minute
  @ApiOperation({
    summary: 'Delete a comment',
    description: 'Delete your own comment',
  })
  @ApiParam({
    name: 'commentId',
    description: 'Comment ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Comment deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not your comment' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  deleteComment(@CurrentUser() user: User, @Param('commentId') commentId: string) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.commentsService.deleteComment(userId, commentId);
  }
}
