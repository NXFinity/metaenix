import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminGuard } from 'src/security/auth/guards/admin.guard';
import { CurrentUser } from 'src/security/auth/decorators/currentUser.decorator';
import { User } from 'src/rest/api/users/assets/entities/user.entity';
import { ContentService, ReportWithReviewer } from './content.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { PaginationResponse } from 'src/common/interfaces/pagination-response.interface';

@ApiTags('Administration | Content Moderation')
@Controller('admin/content')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // #########################################################
  // REPORTS
  // #########################################################

  @Get('reports')
  @ApiOperation({
    summary: 'List all content reports',
    description: 'Get paginated list of all content reports (posts, videos, photos)',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'reviewed', 'resolved', 'dismissed'] })
  @ApiResponse({
    status: 200,
    description: 'Reports retrieved successfully',
  })
  getReports(
    @Query() paginationDto: PaginationDto,
    @Query('status') status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed',
  ): Promise<PaginationResponse<ReportWithReviewer>> {
    return this.contentService.getReports(paginationDto, status);
  }

  @Get('reports/:id')
  @ApiOperation({
    summary: 'Get report details',
    description: 'Get full details of a specific report',
  })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({
    status: 200,
    description: 'Report retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Report not found' })
  getReport(@Param('id') id: string): Promise<ReportWithReviewer> {
    return this.contentService.getReport(id);
  }

  @Post('reports/:id/review')
  @ApiOperation({
    summary: 'Review a report',
    description: 'Approve, dismiss, or resolve a report',
  })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['reviewed', 'resolved', 'dismissed'],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Report reviewed successfully',
  })
  @ApiResponse({ status: 404, description: 'Report not found' })
  reviewReport(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('status') status: 'reviewed' | 'resolved' | 'dismissed',
  ): Promise<ReportWithReviewer> {
    return this.contentService.reviewReport(id, status, user.id);
  }

  @Delete('reports/:id')
  @ApiOperation({
    summary: 'Delete a report',
    description: 'Permanently delete a report. This action cannot be undone.',
  })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({
    status: 200,
    description: 'Report deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Report not found' })
  deleteReport(@Param('id') id: string) {
    return this.contentService.deleteReport(id);
  }

  // #########################################################
  // POSTS
  // #########################################################

  @Get('posts')
  @ApiOperation({
    summary: 'List all posts (admin view)',
    description: 'Get paginated list of all posts with moderation info',
  })
  @ApiResponse({
    status: 200,
    description: 'Posts retrieved successfully',
  })
  getPosts(@Query() paginationDto: PaginationDto) {
    return this.contentService.getPosts(paginationDto);
  }

  @Get('posts/:id')
  @ApiOperation({
    summary: 'Get post details (admin view)',
    description: 'Get full post information including moderation data',
  })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({
    status: 200,
    description: 'Post retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Post not found' })
  getPost(@Param('id') id: string) {
    return this.contentService.getPost(id);
  }

  @Delete('posts/:id')
  @ApiOperation({
    summary: 'Delete post (admin override)',
    description: 'Permanently delete a post. This action cannot be undone.',
  })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({
    status: 200,
    description: 'Post deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Post not found' })
  deletePost(@CurrentUser() user: User, @Param('id') id: string) {
    return this.contentService.deletePost(id, user.id);
  }

  // #########################################################
  // VIDEOS
  // #########################################################

  @Get('videos')
  @ApiOperation({
    summary: 'List all videos (admin view)',
    description: 'Get paginated list of all videos',
  })
  @ApiResponse({
    status: 200,
    description: 'Videos retrieved successfully',
  })
  getVideos(@Query() paginationDto: PaginationDto) {
    return this.contentService.getVideos(paginationDto);
  }

  @Get('videos/:id')
  @ApiOperation({
    summary: 'Get video details (admin view)',
    description: 'Get full video information',
  })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiResponse({
    status: 200,
    description: 'Video retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Video not found' })
  getVideo(@Param('id') id: string) {
    return this.contentService.getVideo(id);
  }

  @Delete('videos/:id')
  @ApiOperation({
    summary: 'Delete video (admin override)',
    description: 'Permanently delete a video. This action cannot be undone.',
  })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiResponse({
    status: 200,
    description: 'Video deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Video not found' })
  deleteVideo(@CurrentUser() user: User, @Param('id') id: string) {
    return this.contentService.deleteVideo(id, user.id);
  }

  // #########################################################
  // PHOTOS
  // #########################################################

  @Get('photos')
  @ApiOperation({
    summary: 'List all photos (admin view)',
    description: 'Get paginated list of all photos',
  })
  @ApiResponse({
    status: 200,
    description: 'Photos retrieved successfully',
  })
  getPhotos(@Query() paginationDto: PaginationDto) {
    return this.contentService.getPhotos(paginationDto);
  }

  @Get('photos/:id')
  @ApiOperation({
    summary: 'Get photo details (admin view)',
    description: 'Get full photo information',
  })
  @ApiParam({ name: 'id', description: 'Photo ID' })
  @ApiResponse({
    status: 200,
    description: 'Photo retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  getPhoto(@Param('id') id: string) {
    return this.contentService.getPhoto(id);
  }

  @Delete('photos/:id')
  @ApiOperation({
    summary: 'Delete photo (admin override)',
    description: 'Permanently delete a photo. This action cannot be undone.',
  })
  @ApiParam({ name: 'id', description: 'Photo ID' })
  @ApiResponse({
    status: 200,
    description: 'Photo deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  deletePhoto(@CurrentUser() user: User, @Param('id') id: string) {
    return this.contentService.deletePhoto(id, user.id);
  }
}
