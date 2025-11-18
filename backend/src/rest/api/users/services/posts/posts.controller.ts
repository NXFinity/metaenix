import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
  // Req, // Reserved for future use
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { PostsService } from './posts.service';
import {
  CreatePostDto,
  UpdatePostDto,
  CreateCommentDto,
  UpdateCommentDto,
  CreateShareDto,
} from './assets/dto/createPost.dto';
import {
  BookmarkPostDto,
  ReportPostDto,
  ReactToPostDto,
  CreateCollectionDto,
  SchedulePostDto,
} from './assets/dto/post-features.dto';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/security/auth/decorators/currentUser.decorator';
import { User } from '../../assets/entities/user.entity';
import { Public } from 'src/security/auth/decorators/public.decorator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Throttle } from '@throttle/throttle';
import { memoryStorage } from 'multer';
import { RequireScope } from 'src/security/developer/services/scopes/decorators/require-scope.decorator';

@ApiTags('Account Management | Posts')
@Controller('posts')
@ApiBearerAuth()
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // #########################################################
  // CREATE OPTIONS
  // #########################################################

  @Post()
  @RequireScope('write:posts')
  @Throttle({ limit: 10, ttl: 60 }) // 10 posts per minute
  @ApiOperation({ summary: 'Create a new post' })
  @ApiBody({ type: CreatePostDto })
  @ApiResponse({
    status: 201,
    description: 'Post created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createPost(@CurrentUser() user: User, @Body() createPostDto: CreatePostDto) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.createPost(userId, createPostDto);
  }

  @Post('upload')
  @RequireScope('write:posts')
  @Throttle({ limit: 10, ttl: 60 }) // 10 posts per minute
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'files', maxCount: 10 },
        { name: 'documents', maxCount: 5 },
      ],
      {
        storage: memoryStorage(),
        limits: {
          fileSize: 100 * 1024 * 1024, // 100MB max per file
        },
      },
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a post with uploaded files',
    description:
      'Upload images, videos, GIFs, and safe document formats (PDF, Word, Excel, text files) to create a post. Supports up to 10 media files and 5 document files.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Post content text',
          example: 'Check out these files!',
          maxLength: 10000,
        },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description:
            'Media files (images: jpeg, jpg, png, gif, webp; videos: mp4, webm, quicktime; audio: mpeg, mp3, wav, ogg). Max 100MB per file, up to 10 files.',
        },
        documents: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description:
            'Document files (PDF, Word, Excel, text, CSV). Max 50MB per file, up to 5 files.',
        },
        isPublic: {
          type: 'boolean',
          description: 'Whether the post is public',
          default: true,
        },
        allowComments: {
          type: 'boolean',
          description: 'Whether comments are allowed',
          default: true,
        },
        parentPostId: {
          type: 'string',
          description: 'ID of parent post if this is a reply',
        },
      },
      required: ['content'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Post created with files successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file type or size' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createPostWithFiles(
    @CurrentUser() user: User,
    @UploadedFiles()
    files: {
      files?: Express.Multer.File[];
      documents?: Express.Multer.File[];
    },
    @Body('content') content?: string,
    @Body('isPublic') isPublic?: boolean,
    @Body('allowComments') allowComments?: boolean,
    @Body('parentPostId') parentPostId?: string,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    if (!content || content.trim().length === 0) {
      throw new UnauthorizedException('Content is required');
    }

    return this.postsService.createPostWithFiles(
      userId,
      content,
      files?.files || [],
      files?.documents || [],
      {
        isPublic: isPublic !== undefined ? isPublic : true,
        allowComments: allowComments !== undefined ? allowComments : true,
        parentPostId,
      },
    );
  }

  @Post(':postId/comments')
  @RequireScope('write:comments')
  @Throttle({ limit: 20, ttl: 60 }) // 20 comments per minute
  @ApiOperation({ summary: 'Create a comment on a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiBody({ type: CreateCommentDto })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Comments disabled' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  createComment(
    @CurrentUser() user: User,
    @Param('postId') postId: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.createComment(userId, postId, createCommentDto);
  }

  @Post(':postId/like')
  @RequireScope('write:posts')
  @ApiOperation({ summary: 'Like a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({
    status: 201,
    description: 'Post liked successfully',
  })
  @ApiResponse({ status: 400, description: 'Already liked' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async likePost(@CurrentUser() user: User, @Param('postId') postId: string) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    await this.postsService.likePostOrComment(userId, postId);
    return { message: 'Post liked successfully', liked: true };
  }

  @Delete(':postId/like')
  @RequireScope('write:posts')
  @ApiOperation({ summary: 'Unlike a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({
    status: 200,
    description: 'Post unliked successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Like not found' })
  async unlikePost(@CurrentUser() user: User, @Param('postId') postId: string) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    await this.postsService.unlikePostOrComment(userId, postId);
    return { message: 'Post unliked successfully', liked: false };
  }

  @Post(':postId/share')
  @RequireScope('write:posts')
  @ApiOperation({ summary: 'Share a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiBody({ type: CreateShareDto })
  @ApiResponse({
    status: 201,
    description: 'Post shared successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  sharePost(
    @CurrentUser() user: User,
    @Param('postId') postId: string,
    @Body() createShareDto: CreateShareDto,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.sharePost(userId, postId, createShareDto);
  }

  // #########################################################
  // FIND OPTIONS
  // #########################################################

  @Get()
  @Public()
  @RequireScope('read:posts') // Required for OAuth tokens accessing private posts
  @ApiOperation({ summary: 'Get all public posts with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({
    status: 200,
    description: 'Posts retrieved successfully',
  })
  findAll(@Query() paginationDto: PaginationDto, @CurrentUser() user?: any) {
    const userId = user?.id;
    return this.postsService.findAll(paginationDto, userId);
  }

  @Get('feed')
  @RequireScope('read:posts')
  @ApiOperation({ summary: 'Get feed posts (posts from followed users + shared posts)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({
    status: 200,
    description: 'Feed posts retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getFeed(@Query() paginationDto: PaginationDto, @CurrentUser() user: User) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.getFeed(userId, paginationDto);
  }

  @Get('user/:userId/feed')
  @Public()
  @ApiOperation({ summary: 'Get feed posts for a specific user (posts from users they follow + shared posts)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({
    status: 200,
    description: 'User feed retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserFeed(
    @Param('userId') targetUserId: string,
    @Query() paginationDto: PaginationDto,
    @CurrentUser() _user?: User,
  ) {
    return this.postsService.getFeed(targetUserId, paginationDto);
  }

  @Get('user/:userId')
  @RequireScope('read:posts')
  @ApiOperation({ summary: 'Get posts by user ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({
    status: 200,
    description: 'User posts retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findByUserId(
    @Param('userId') targetUserId: string,
    @Query() paginationDto: PaginationDto,
    @CurrentUser() user: User,
  ) {
    const userId = user?.id;
    return this.postsService.findByUserId(targetUserId, paginationDto, userId);
  }

  @Get('bookmarks')
  @RequireScope('read:posts')
  @ApiOperation({ summary: 'Get user\'s bookmarked posts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Bookmarked posts retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getBookmarkedPosts(
    @CurrentUser() user: User,
    @Query() paginationDto: PaginationDto,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.getBookmarkedPosts(userId, paginationDto);
  }

  @Get('likes')
  @RequireScope('read:posts')
  @ApiOperation({ summary: 'Get user\'s liked posts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Liked posts retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getLikedPosts(
    @CurrentUser() user: User,
    @Query() paginationDto: PaginationDto,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.getLikedPosts(userId, paginationDto);
  }

  @Get('shares')
  @RequireScope('read:posts')
  @ApiOperation({ summary: 'Get user\'s shared posts' })
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
    return this.postsService.getSharedPosts(userId, paginationDto);
  }

  @Get('search')
  @Public()
  @RequireScope('read:posts') // Required for OAuth tokens searching posts
  @ApiOperation({ summary: 'Search posts by content, hashtags, or mentions' })
  @ApiQuery({ name: 'q', description: 'Search query', required: true })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  searchPosts(
    @Query('q') query: string,
    @Query() paginationDto: PaginationDto,
    @CurrentUser() user?: any,
  ) {
    const userId = user?.id;
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query is required');
    }
    return this.postsService.searchPosts(query, paginationDto, userId);
  }

  @Get('filter/:type')
  @Public()
  @RequireScope('read:posts') // Required for OAuth tokens filtering posts
  @ApiOperation({ summary: 'Filter posts by type' })
  @ApiParam({
    name: 'type',
    description: 'Post type',
    enum: ['text', 'image', 'video', 'document', 'mixed'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({
    status: 200,
    description: 'Filtered posts retrieved successfully',
  })
  filterPostsByType(
    @Param('type') type: 'text' | 'image' | 'video' | 'document' | 'mixed',
    @Query() paginationDto: PaginationDto,
    @CurrentUser() user?: any,
  ) {
    const userId = user?.id;
    return this.postsService.filterPostsByType(type, paginationDto, userId);
  }

  @Get('collections/:collectionId/posts')
  @RequireScope('read:posts')
  @ApiOperation({ summary: 'Get posts from a collection with pagination' })
  @ApiParam({ name: 'collectionId', description: 'Collection ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['dateCreated', 'likesCount', 'commentsCount', 'viewsCount'],
    example: 'dateCreated',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @ApiResponse({
    status: 200,
    description: 'Collection posts retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  getCollectionPosts(
    @Param('collectionId') collectionId: string,
    @Query() paginationDto: PaginationDto,
    @CurrentUser() user?: any,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.getCollectionPosts(
      collectionId,
      userId,
      paginationDto,
    );
  }

  @Get(':postId')
  @Public()
  @RequireScope('read:posts') // Required for OAuth tokens accessing private posts
  @ApiOperation({ summary: 'Get a single post by ID' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({
    status: 200,
    description: 'Post retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Post not found' })
  findOne(@Param('postId') postId: string, @CurrentUser() user?: any) {
    const userId = user?.id;
    return this.postsService.findOne(postId, userId);
  }

  @Get(':postId/comments')
  @RequireScope('read:comments')
  @ApiOperation({ summary: 'Get comments for a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Post not found' })
  findCommentsByPostId(
    @Param('postId') postId: string,
    @Query() paginationDto: PaginationDto,
    @CurrentUser() user?: any,
  ) {
    const userId = user?.id;
    return this.postsService.findCommentsByPostId(
      postId,
      paginationDto,
      userId,
    );
  }

  @Get('comments/:commentId/replies')
  @RequireScope('read:comments')
  @ApiOperation({ summary: 'Get replies to a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({
    status: 200,
    description: 'Comment replies retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  findRepliesByCommentId(
    @Param('commentId') commentId: string,
    @Query() paginationDto: PaginationDto,
    @CurrentUser() user?: any,
  ) {
    const userId = user?.id;
    return this.postsService.findRepliesByCommentId(
      commentId,
      paginationDto,
      userId,
    );
  }

  @Post('comments/:commentId/like')
  @RequireScope('write:comments')
  @ApiOperation({ summary: 'Like a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({
    status: 201,
    description: 'Comment liked successfully',
  })
  @ApiResponse({ status: 400, description: 'Already liked' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  likeComment(@CurrentUser() user: User, @Param('commentId') commentId: string) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.likePostOrComment(userId, undefined, commentId);
  }

  @Delete('comments/:commentId/like')
  @RequireScope('write:comments')
  @ApiOperation({ summary: 'Unlike a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({
    status: 200,
    description: 'Comment unliked successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Like not found' })
  unlikeComment(
    @CurrentUser() user: User,
    @Param('commentId') commentId: string,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.unlikePostOrComment(userId, undefined, commentId);
  }

  // #########################################################
  // UPDATE OPTIONS
  // #########################################################

  @Patch(':postId')
  @RequireScope('write:posts')
  @ApiOperation({ summary: 'Update a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiBody({ type: UpdatePostDto })
  @ApiResponse({
    status: 200,
    description: 'Post updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  updatePost(
    @CurrentUser() user: User,
    @Param('postId') postId: string,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.updatePost(userId, postId, updatePostDto);
  }

  @Patch(':postId/pin')
  @ApiOperation({ summary: 'Pin or unpin a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isPinned: {
          type: 'boolean',
          description: 'Whether to pin the post',
          example: true,
        },
      },
      required: ['isPinned'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Post pin status updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  togglePinPost(
    @CurrentUser() user: User,
    @Param('postId') postId: string,
    @Body('isPinned') isPinned: boolean,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.togglePinPost(userId, postId, isPinned);
  }

  @Patch('comments/:commentId')
  @RequireScope('write:comments')
  @ApiOperation({ summary: 'Update a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiBody({ type: UpdateCommentDto })
  @ApiResponse({
    status: 200,
    description: 'Comment updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
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
    return this.postsService.updateComment(userId, commentId, updateCommentDto);
  }

  // #########################################################
  // DELETE OPTIONS
  // #########################################################

  @Delete(':postId')
  @RequireScope('write:posts')
  @ApiOperation({ summary: 'Delete a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({
    status: 200,
    description: 'Post deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  deletePost(@CurrentUser() user: User, @Param('postId') postId: string) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.deletePost(userId, postId);
  }

  @Delete('comments/:commentId')
  @RequireScope('write:comments')
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({
    status: 200,
    description: 'Comment deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  deleteComment(
    @CurrentUser() user: User,
    @Param('commentId') commentId: string,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.deleteComment(userId, commentId);
  }

  // #########################################################
  // BOOKMARK OPTIONS
  // #########################################################

  @Post(':postId/bookmark')
  @RequireScope('write:posts')
  @ApiOperation({ summary: 'Bookmark a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiBody({ type: BookmarkPostDto, required: false })
  @ApiResponse({
    status: 201,
    description: 'Post bookmarked successfully',
  })
  @ApiResponse({ status: 400, description: 'Post already bookmarked' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  bookmarkPost(
    @CurrentUser() user: User,
    @Param('postId') postId: string,
    @Body() bookmarkDto?: BookmarkPostDto,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.bookmarkPost(userId, postId, bookmarkDto?.note);
  }

  @Delete(':postId/bookmark')
  @RequireScope('write:posts')
  @ApiOperation({ summary: 'Remove bookmark from a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({
    status: 200,
    description: 'Bookmark removed successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Bookmark not found' })
  unbookmarkPost(@CurrentUser() user: User, @Param('postId') postId: string) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.unbookmarkPost(userId, postId);
  }


  // #########################################################
  // REPORT OPTIONS
  // #########################################################

  @Post(':postId/report')
  @Throttle({ limit: 5, ttl: 3600 }) // 5 reports per hour
  @ApiOperation({ summary: 'Report a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiBody({ type: ReportPostDto })
  @ApiResponse({
    status: 201,
    description: 'Post reported successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  reportPost(
    @CurrentUser() user: User,
    @Param('postId') postId: string,
    @Body() reportDto: ReportPostDto,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.reportPost(
      userId,
      postId,
      reportDto.reason,
      reportDto.description,
    );
  }

  // #########################################################
  // REACTION OPTIONS
  // #########################################################

  @Post(':postId/react')
  @RequireScope('write:posts')
  @ApiOperation({ summary: 'React to a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiBody({ type: ReactToPostDto })
  @ApiResponse({
    status: 201,
    description: 'Reaction added successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  reactToPost(
    @CurrentUser() user: User,
    @Param('postId') postId: string,
    @Body() reactDto: ReactToPostDto,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.reactToPostOrComment(
      userId,
      reactDto.reactionType,
      postId,
    );
  }

  @Delete(':postId/react')
  @RequireScope('write:posts')
  @ApiOperation({ summary: 'Remove reaction from a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({
    status: 200,
    description: 'Reaction removed successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Reaction not found' })
  removeReactionFromPost(
    @CurrentUser() user: User,
    @Param('postId') postId: string,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.removeReaction(userId, postId);
  }

  @Post('comments/:commentId/react')
  @RequireScope('write:comments')
  @ApiOperation({ summary: 'React to a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiBody({ type: ReactToPostDto })
  @ApiResponse({
    status: 201,
    description: 'Reaction added successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  reactToComment(
    @CurrentUser() user: User,
    @Param('commentId') commentId: string,
    @Body() reactDto: ReactToPostDto,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.reactToPostOrComment(
      userId,
      reactDto.reactionType,
      undefined,
      commentId,
    );
  }

  @Delete('comments/:commentId/react')
  @RequireScope('write:comments')
  @ApiOperation({ summary: 'Remove reaction from a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({
    status: 200,
    description: 'Reaction removed successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Reaction not found' })
  removeReactionFromComment(
    @CurrentUser() user: User,
    @Param('commentId') commentId: string,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.removeReaction(userId, undefined, commentId);
  }

  // #########################################################
  // COLLECTION OPTIONS
  // #########################################################

  @Post('collections')
  @RequireScope('write:posts')
  @ApiOperation({ summary: 'Create a collection' })
  @ApiBody({ type: CreateCollectionDto })
  @ApiResponse({
    status: 201,
    description: 'Collection created successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createCollection(
    @CurrentUser() user: User,
    @Body() createCollectionDto: CreateCollectionDto,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.createCollection(
      userId,
      createCollectionDto.name,
      createCollectionDto.description,
      createCollectionDto.isPublic,
      createCollectionDto.coverImage,
    );
  }

  @Post('collections/:collectionId/posts/:postId')
  @RequireScope('write:posts')
  @ApiOperation({ summary: 'Add post to collection' })
  @ApiParam({ name: 'collectionId', description: 'Collection ID' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({
    status: 200,
    description: 'Post added to collection successfully',
  })
  @ApiResponse({ status: 400, description: 'Post already in collection' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Collection or post not found' })
  addPostToCollection(
    @CurrentUser() user: User,
    @Param('collectionId') collectionId: string,
    @Param('postId') postId: string,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.addPostToCollection(userId, collectionId, postId);
  }

  @Delete('collections/:collectionId/posts/:postId')
  @RequireScope('write:posts')
  @ApiOperation({ summary: 'Remove post from collection' })
  @ApiParam({ name: 'collectionId', description: 'Collection ID' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({
    status: 200,
    description: 'Post removed from collection successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  removePostFromCollection(
    @CurrentUser() user: User,
    @Param('collectionId') collectionId: string,
    @Param('postId') postId: string,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.removePostFromCollection(
      userId,
      collectionId,
      postId,
    );
  }


  // #########################################################
  // ARCHIVE OPTIONS
  // #########################################################

  @Patch(':postId/archive')
  @RequireScope('write:posts')
  @ApiOperation({ summary: 'Archive a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({
    status: 200,
    description: 'Post archived successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  archivePost(@CurrentUser() user: User, @Param('postId') postId: string) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.archivePost(userId, postId);
  }

  @Patch(':postId/unarchive')
  @RequireScope('write:posts')
  @ApiOperation({ summary: 'Unarchive a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({
    status: 200,
    description: 'Post unarchived successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  unarchivePost(@CurrentUser() user: User, @Param('postId') postId: string) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.unarchivePost(userId, postId);
  }

  // #########################################################
  // SCHEDULING OPTIONS
  // #########################################################

  @Patch(':postId/schedule')
  @RequireScope('write:posts')
  @ApiOperation({ summary: 'Schedule a post for future publication' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiBody({ type: SchedulePostDto })
  @ApiResponse({
    status: 200,
    description: 'Post scheduled successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid scheduled date' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  schedulePost(
    @CurrentUser() user: User,
    @Param('postId') postId: string,
    @Body() scheduleDto: SchedulePostDto,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.schedulePost(
      userId,
      postId,
      new Date(scheduleDto.scheduledDate),
    );
  }

  // #########################################################
  // ANALYTICS OPTIONS
  // #########################################################

  @Get(':postId/analytics')
  @RequireScope('read:analytics')
  @ApiOperation({ summary: 'Get post analytics' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({
    status: 200,
    description: 'Post analytics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only view own post analytics' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  getPostAnalytics(@CurrentUser() user: User, @Param('postId') postId: string) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.postsService.getPostAnalytics(userId, postId);
  }
}
