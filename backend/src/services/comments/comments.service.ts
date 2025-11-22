import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, In } from 'typeorm';
import { Comment } from './assets/entities/comment.entity';
import { CreateCommentDto } from './assets/dto/create-comment.dto';
import { UpdateCommentDto } from './assets/dto/update-comment.dto';
import { CommentResourceType } from './assets/enum/resource-type.enum';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { CachingService } from '@caching/caching';
import { sanitizeText } from 'src/utils/sanitization.util';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Post } from '../../rest/api/users/services/posts/assets/entities/post.entity';
import { Video } from '../../rest/api/users/services/videos/assets/entities/video.entity';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  PaginationMeta,
  PaginationResponse,
} from 'src/common/interfaces/pagination-response.interface';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    private readonly dataSource: DataSource,
    private readonly loggingService: LoggingService,
    private readonly cachingService: CachingService,
    private readonly eventEmitter: EventEmitter2,
    private readonly analyticsService: AnalyticsService,
  ) {}

  /**
   * Validate that a resource exists and can have comments
   */
  private async validateResource(
    resourceType: string,
    resourceId: string,
  ): Promise<{ exists: boolean; allowComments?: boolean; ownerId?: string }> {
    switch (resourceType) {
      case CommentResourceType.POST:
        const post = await this.postRepository.findOne({
          where: { id: resourceId, dateDeleted: IsNull() },
          select: ['id', 'userId', 'allowComments'],
        });
        if (!post) {
          return { exists: false };
        }
        return {
          exists: true,
          allowComments: post.allowComments,
          ownerId: post.userId,
        };

      case CommentResourceType.VIDEO:
        const video = await this.videoRepository.findOne({
          where: { id: resourceId, dateDeleted: IsNull() },
          select: ['id', 'userId', 'isPublic'],
        });
        if (!video) {
          return { exists: false };
        }
        // Videos always allow comments (for now)
        return {
          exists: true,
          allowComments: true,
          ownerId: video.userId,
        };

      default:
        return { exists: false };
    }
  }

  /**
   * Create a comment on any resource
   */
  async createComment(
    userId: string,
    resourceType: string,
    resourceId: string,
    createCommentDto: CreateCommentDto,
  ): Promise<Comment> {
    try {
      // Validate resource exists
      const resource = await this.validateResource(resourceType, resourceId);
      if (!resource.exists) {
        throw new NotFoundException(
          `${resourceType} with ID ${resourceId} not found`,
        );
      }

      if (resource.allowComments === false) {
        throw new ForbiddenException(
          `Comments are disabled for this ${resourceType}`,
        );
      }

      // Get user
      const user = await this.cachingService.getOrSetUser(
        'id',
        userId,
        async () => {
          const userData = await this.userRepository.findOne({
            where: { id: userId },
          });
          if (!userData) {
            throw new NotFoundException('User not found');
          }
          return userData;
        },
      );

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Sanitize comment content
      const sanitizedContent = sanitizeText(createCommentDto.content);

      // Use transaction to ensure atomicity
      const savedComment = await this.dataSource.transaction(
        async (transactionalEntityManager) => {
          const comment = transactionalEntityManager.create(Comment, {
            content: sanitizedContent,
            resourceType,
            resourceId,
            userId,
            user,
          });

          // If parentCommentId is provided, verify it exists and belongs to the same resource
          if (createCommentDto.parentCommentId) {
            const parentComment = await transactionalEntityManager.findOne(
              Comment,
              {
                where: {
                  id: createCommentDto.parentCommentId,
                  resourceType,
                  resourceId,
                },
              },
            );

            if (!parentComment) {
              throw new NotFoundException('Parent comment not found');
            }

            comment.parentComment = parentComment;
            comment.parentCommentId = parentComment.id;

            // Increment parent comment replies count atomically
            await transactionalEntityManager.increment(
              Comment,
              { id: createCommentDto.parentCommentId },
              'repliesCount',
              1,
            );
          }

          const savedComment = await transactionalEntityManager.save(
            Comment,
            comment,
          );

          return savedComment;
        },
      );

      // Invalidate cache
      await this.cachingService.invalidateByTags(
        'comment',
        `comment:${savedComment.id}`,
        `${resourceType}:${resourceId}`,
        `${resourceType}:${resourceId}:comments`,
      );

      this.loggingService.log('Comment created', 'CommentsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: {
          commentId: savedComment.id,
          resourceType,
          resourceId,
        },
      });

      // Emit event for comment (only if not self-comment)
      if (resource.ownerId && resource.ownerId !== userId) {
        this.eventEmitter.emit(`${resourceType}.commented`, {
          commenterId: userId,
          resourceId,
          commentId: savedComment.id,
          resourceOwnerId: resource.ownerId,
          parentCommentId: createCommentDto.parentCommentId || null,
        });
      }

      // Recalculate analytics (await to ensure it completes before response)
      // This ensures the count is accurate when the frontend fetches it
      if (resourceType === CommentResourceType.POST) {
        try {
          await this.analyticsService.calculatePostAnalytics(resourceId);
        } catch (error: unknown) {
          // Log error but don't fail comment creation if analytics fails
          this.loggingService.error(
            'Error recalculating post analytics after comment',
            error instanceof Error ? error.stack : undefined,
            'CommentsService',
          );
        }
      } else if (resourceType === CommentResourceType.VIDEO) {
        try {
          await this.analyticsService.calculateVideoAnalytics(resourceId);
        } catch (error: unknown) {
          // Log error but don't fail comment creation if analytics fails
          this.loggingService.error(
            'Error recalculating video analytics after comment',
            error instanceof Error ? error.stack : undefined,
            'CommentsService',
          );
        }
      }

      // Reload comment with user profile relation to ensure avatar is included
      const commentWithUser = await this.commentRepository.findOne({
        where: { id: savedComment.id },
        relations: ['user', 'user.profile', 'parentComment'],
      });

      return commentWithUser || savedComment;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error creating comment',
        error instanceof Error ? error.stack : undefined,
        'CommentsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to upload comment');
    }
  }

  /**
   * Get comments for a resource
   */
  async getComments(
    resourceType: string,
    resourceId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Comment>> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 20;
      const skip = (page - 1) * limit;

      // Validate resource exists
      const resource = await this.validateResource(resourceType, resourceId);
      if (!resource.exists) {
        throw new NotFoundException(
          `${resourceType} with ID ${resourceId} not found`,
        );
      }

      const [comments, total] = await this.commentRepository.findAndCount({
        where: {
          resourceType,
          resourceId,
          parentCommentId: IsNull(), // Only top-level comments
          dateDeleted: IsNull(),
        },
        relations: ['user', 'user.profile', 'parentComment'],
        order: {
          dateCreated: 'DESC',
        },
        skip,
        take: limit,
      });

      // Get replies for all comments in a single query (fixes N+1 problem)
      const commentsWithReplies: Comment[] = [];
      if (comments.length > 0) {
        const commentIds = comments.map((c) => c.id);
        const allReplies = await this.commentRepository.find({
            where: {
            parentCommentId: In(commentIds),
              dateDeleted: IsNull(),
            },
            relations: ['user', 'user.profile'],
            order: {
            parentCommentId: 'ASC',
              dateCreated: 'ASC',
            },
        });

        // Group replies by parent comment ID
        const repliesByParentId = new Map<string, Comment[]>();
        for (const reply of allReplies) {
          if (reply.parentCommentId) {
            const existing = repliesByParentId.get(reply.parentCommentId) || [];
            existing.push(reply);
            repliesByParentId.set(reply.parentCommentId, existing);
          }
        }

        // Assign replies to each comment (limit to 10 per comment)
        for (const comment of comments) {
          const replies = (repliesByParentId.get(comment.id) || []).slice(0, 10);
          (comment as any).replies = replies;
          commentsWithReplies.push(comment);
        }
      } else {
        commentsWithReplies.push(...comments);
      }

      const totalPages = Math.ceil(total / limit);
      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      return {
        data: commentsWithReplies,
        meta,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error getting comments',
        error instanceof Error ? error.stack : undefined,
        'CommentsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to get comments');
    }
  }

  /**
   * Get a single comment by ID
   */
  async getCommentById(commentId: string): Promise<Comment> {
    try {
      const comment = await this.commentRepository.findOne({
        where: { id: commentId, dateDeleted: IsNull() },
        relations: ['user', 'user.profile', 'parentComment', 'replies', 'replies.user', 'replies.user.profile'],
      });

      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      return comment;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error getting comment',
        error instanceof Error ? error.stack : undefined,
        'CommentsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to get comment');
    }
  }

  /**
   * Update a comment
   */
  async updateComment(
    userId: string,
    commentId: string,
    updateCommentDto: UpdateCommentDto,
  ): Promise<Comment> {
    try {
      const comment = await this.commentRepository.findOne({
        where: { id: commentId, dateDeleted: IsNull() },
      });

      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      if (comment.userId !== userId) {
        throw new ForbiddenException('You can only edit your own comments');
      }

      if (updateCommentDto.content) {
        comment.content = sanitizeText(updateCommentDto.content);
        comment.isEdited = true;
      }

      const updatedComment = await this.commentRepository.save(comment);

      // Invalidate cache
      await this.cachingService.invalidateByTags(
        'comment',
        `comment:${commentId}`,
        `${comment.resourceType}:${comment.resourceId}`,
        `${comment.resourceType}:${comment.resourceId}:comments`,
      );

      this.loggingService.log('Comment updated', 'CommentsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: { commentId },
      });

      return updatedComment;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error updating comment',
        error instanceof Error ? error.stack : undefined,
        'CommentsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to update comment');
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(userId: string, commentId: string): Promise<void> {
    try {
      const comment = await this.commentRepository.findOne({
        where: { id: commentId, dateDeleted: IsNull() },
        relations: ['parentComment'],
      });

      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      if (comment.userId !== userId) {
        throw new ForbiddenException('You can only delete your own comments');
      }

      // Use transaction to handle replies count
      await this.dataSource.transaction(async (transactionalEntityManager) => {
        // If this comment has a parent, decrement parent's replies count
        if (comment.parentCommentId) {
          await transactionalEntityManager.decrement(
            Comment,
            { id: comment.parentCommentId },
            'repliesCount',
            1,
          );
        }

        // Soft delete the comment
        await transactionalEntityManager.softDelete(Comment, { id: commentId });
      });

      // Invalidate cache
      await this.cachingService.invalidateByTags(
        'comment',
        `comment:${commentId}`,
        `${comment.resourceType}:${comment.resourceId}`,
        `${comment.resourceType}:${comment.resourceId}:comments`,
      );

      this.loggingService.log('Comment deleted', 'CommentsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: { commentId },
      });

      // Recalculate analytics (in background for resource, immediate for user)
      if (comment.resourceType === CommentResourceType.POST) {
        this.analyticsService
          .calculatePostAnalytics(comment.resourceId)
          .catch((error: unknown) => {
            this.loggingService.error(
              'Error recalculating post analytics after comment deletion',
              error instanceof Error ? error.stack : undefined,
              'CommentsService',
            );
          });
      } else if (comment.resourceType === CommentResourceType.VIDEO) {
        this.analyticsService
          .calculateVideoAnalytics(comment.resourceId)
          .catch((error: unknown) => {
            this.loggingService.error(
              'Error recalculating video analytics after comment deletion',
              error instanceof Error ? error.stack : undefined,
              'CommentsService',
            );
          });
      }

      // Recalculate user analytics for comment owner immediately (await to ensure it completes)
      try {
        await this.analyticsService.calculateUserAnalytics(userId);
      } catch (error: unknown) {
        this.loggingService.error(
          'Error recalculating user analytics after comment deletion',
          error instanceof Error ? error.stack : undefined,
          'CommentsService',
        );
        // Don't fail deletion if analytics recalculation fails
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error deleting comment',
        error instanceof Error ? error.stack : undefined,
        'CommentsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to delete comment');
    }
  }
}
