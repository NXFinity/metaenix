import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Post } from './assets/entities/post.entity';
import { Like } from 'src/services/likes/assets/entities/like.entity';
import { Share } from 'src/services/shares/assets/entities/share.entity';
import { Bookmark } from './assets/entities/bookmark.entity';
import { Report } from './assets/entities/report.entity';
import { Reaction } from './assets/entities/reaction.entity';
import { Collection } from './assets/entities/collection.entity';
import { User } from '../../assets/entities/user.entity';
import { Follow } from '../follows/assets/entities/follow.entity';
import {
  CreatePostDto,
  UpdatePostDto,
} from './assets/dto/createPost.dto';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { CachingService } from '@caching/caching';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { sanitizeText, sanitizeUrl } from 'src/utils/sanitization.util';
import { StorageService } from 'src/rest/storage/storage.service';
import { StorageType } from 'src/rest/storage/assets/enum/storage-type.enum';
import {
  PaginationMeta,
  PaginationResponse,
} from 'src/common/interfaces/pagination-response.interface';
import { VideosService } from '../videos/videos.service';
import { Video } from '../videos/assets/entities/video.entity';
import { TrackingService } from 'src/services/tracking/tracking.service';
import { AnalyticsService } from 'src/services/analytics/analytics.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IsNull } from 'typeorm';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(Share)
    private readonly shareRepository: Repository<Share>,
    @InjectRepository(Bookmark)
    private readonly bookmarkRepository: Repository<Bookmark>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(Reaction)
    private readonly reactionRepository: Repository<Reaction>,
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    private readonly loggingService: LoggingService,
    private readonly cachingService: CachingService,
    private readonly dataSource: DataSource,
    private readonly storageService: StorageService,
    private readonly videosService: VideosService,
    private readonly trackingService: TrackingService,
    private readonly analyticsService: AnalyticsService,
    private readonly httpService: HttpService,
  ) {}

  // #########################################################
  // UTILITY FUNCTIONS
  // #########################################################

  /**
   * Extract hashtags from content (#tag)
   */
  private extractHashtags(content: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = content.match(hashtagRegex);
    if (!matches) return [];
    return [...new Set(matches.map((tag) => tag.substring(1).toLowerCase()))];
  }

  /**
   * Extract mentions from content (@username)
   */
  private extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const matches = content.match(mentionRegex);
    if (!matches) return [];
    return [...new Set(matches.map((mention) => mention.substring(1).toLowerCase()))];
  }

  /**
   * Extract link metadata (title, description, image) from a URL
   * Uses Open Graph tags, Twitter Cards, or fallback to HTML meta tags
   */
  private async extractLinkMetadata(url: string): Promise<{
    title: string | null;
    description: string | null;
    image: string | null;
  } | null> {
    try {
      // Fetch the URL with a timeout
      const response = await firstValueFrom(
        this.httpService.get(url, {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
          },
          maxRedirects: 5,
        }),
      );

      const html = response.data;
      if (typeof html !== 'string') {
        return null;
      }

      // Extract metadata using regex (simple approach)
      // In production, you might want to use cheerio or puppeteer for better parsing
      const titleMatch =
        html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
        html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i) ||
        html.match(/<title>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : null;

      const descriptionMatch =
        html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
        html.match(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i) ||
        html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
      const description = descriptionMatch ? descriptionMatch[1].trim() : null;

      const imageMatch =
        html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
        html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i) ||
        html.match(/<meta\s+property=["']og:image:secure_url["']\s+content=["']([^"']+)["']/i);
      let image = imageMatch ? imageMatch[1].trim() : null;

      // Resolve relative image URLs
      if (image && !image.startsWith('http')) {
        try {
          const baseUrl = new URL(url);
          image = new URL(image, baseUrl.origin).href;
        } catch {
          image = null;
        }
      }

      return {
        title: title && title.length > 0 ? title.substring(0, 200) : null,
        description: description && description.length > 0 ? description.substring(0, 500) : null,
        image: image && image.length > 0 ? image.substring(0, 500) : null,
      };
    } catch (error) {
      // Silently fail - return null so link preview still works with just URL
      return null;
    }
  }

  /**
   * Validate and set parent post if provided
   */
  private async validateAndSetParentPost(
    post: Post,
    parentPostId: string,
  ): Promise<void> {
    const parentPost = await this.postRepository.findOne({
      where: { id: parentPostId },
    });

    if (!parentPost) {
      throw new NotFoundException('Parent post not found');
    }

    post.parentPost = parentPost;
    post.parentPostId = parentPost.id;
  }

  /**
   * Determine post type based on media
   */
  private determinePostType(
    mediaUrl: string | null,
    mediaUrls: string[],
  ): 'text' | 'image' | 'video' | 'document' | 'mixed' | null {
    if (!mediaUrl && (!mediaUrls || mediaUrls.length === 0)) {
      return 'text';
    }

    const allUrls = mediaUrl ? [mediaUrl, ...mediaUrls] : mediaUrls;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const videoExtensions = ['.mp4', '.webm', '.mov', '.quicktime'];
    const documentExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'];

    let hasImage = false;
    let hasVideo = false;
    let hasDocument = false;

    for (const url of allUrls) {
      const lowerUrl = url.toLowerCase();
      if (imageExtensions.some((ext) => lowerUrl.includes(ext))) {
        hasImage = true;
      } else if (videoExtensions.some((ext) => lowerUrl.includes(ext))) {
        hasVideo = true;
      } else if (documentExtensions.some((ext) => lowerUrl.includes(ext))) {
        hasDocument = true;
      }
    }

    const typeCount = [hasImage, hasVideo, hasDocument].filter(Boolean).length;
    if (typeCount > 1) return 'mixed';
    if (hasImage) return 'image';
    if (hasVideo) return 'video';
    if (hasDocument) return 'document';
    return 'text';
  }

  // #########################################################
  // CREATE OPTIONS
  // #########################################################

  /**
   * Create a new post
   */
  async createPost(
    userId: string,
    createPostDto: CreatePostDto,
  ): Promise<Post> {
    try {
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

      // Handle video IDs from user library (batch fetch to avoid N+1)
      let videoUrls: string[] = [];
      if (createPostDto.videoIds && createPostDto.videoIds.length > 0) {
        // Batch fetch all videos in a single query
        const videoRepository = this.dataSource.getRepository(Video);
        const videos = await videoRepository.find({
          where: {
            id: In(createPostDto.videoIds),
            userId,
            dateDeleted: IsNull(),
          },
        });

        // Validate all videos exist and belong to user
        const foundVideoIds = new Set(videos.map((v) => v.id));
        const missingVideoIds = createPostDto.videoIds.filter(
          (id) => !foundVideoIds.has(id),
        );
        if (missingVideoIds.length > 0) {
          throw new BadRequestException(
            `Videos not found: ${missingVideoIds.join(', ')}`,
              );
            }

        // Extract video URLs from ready videos
        for (const video of videos) {
            if (video.status === 'ready' && video.videoUrl) {
              videoUrls.push(video.videoUrl);
            }
        }
      }

      // Validate that either content or media is provided
      const hasContent = createPostDto.content && createPostDto.content.trim().length > 0;
      const hasMedia = createPostDto.mediaUrl ||
                      (createPostDto.mediaUrls && createPostDto.mediaUrls.length > 0) ||
                      (createPostDto.videoIds && createPostDto.videoIds.length > 0);

      if (!hasContent && !hasMedia) {
        throw new BadRequestException('Post must have either content or media');
      }

      // Sanitize input content and URLs
      const sanitizedContent = createPostDto.content ? sanitizeText(createPostDto.content) : '';
      const sanitizedMediaUrl = createPostDto.mediaUrl
        ? sanitizeUrl(createPostDto.mediaUrl)
        : null;
      const sanitizedMediaUrls = [
        ...(createPostDto.mediaUrls
          ? createPostDto.mediaUrls.map((url) => sanitizeUrl(url))
          : []),
        ...videoUrls.map((url) => sanitizeUrl(url)),
      ];
      const sanitizedLinkUrl = createPostDto.linkUrl
        ? sanitizeUrl(createPostDto.linkUrl)
        : null;

      // If linkUrl is provided but metadata is missing, try to extract it
      let sanitizedLinkTitle = createPostDto.linkTitle
        ? sanitizeText(createPostDto.linkTitle)
        : null;
      let sanitizedLinkDescription = createPostDto.linkDescription
        ? sanitizeText(createPostDto.linkDescription)
        : null;
      let sanitizedLinkImage = createPostDto.linkImage
        ? sanitizeUrl(createPostDto.linkImage)
        : null;

      // Extract link metadata if URL is provided but metadata is missing
      if (sanitizedLinkUrl && !sanitizedLinkTitle && !sanitizedLinkDescription && !sanitizedLinkImage) {
        try {
          const linkMetadata = await this.extractLinkMetadata(sanitizedLinkUrl);
          if (linkMetadata) {
            sanitizedLinkTitle = linkMetadata.title || null;
            sanitizedLinkDescription = linkMetadata.description || null;
            sanitizedLinkImage = linkMetadata.image || null;
          }
        } catch (error) {
          // Silently fail - link preview will still work with just the URL
          this.loggingService.debug(
            'Failed to extract link metadata',
            'PostsService',
            {
              category: LogCategory.API,
              metadata: { url: sanitizedLinkUrl, error: error instanceof Error ? error.message : String(error) },
            },
          );
        }
      }

      // Extract hashtags and mentions
      const hashtags = this.extractHashtags(sanitizedContent);
      const mentions = this.extractMentions(sanitizedContent);
      const postType = this.determinePostType(sanitizedMediaUrl, sanitizedMediaUrls);

      // Validate scheduled date if provided
      let scheduledDate: Date | null = null;
      if (createPostDto.scheduledDate) {
        scheduledDate = new Date(createPostDto.scheduledDate);
        if (scheduledDate <= new Date()) {
          throw new BadRequestException('Scheduled date must be in the future');
        }
      }

      const post = this.postRepository.create({
        content: sanitizedContent,
        mediaUrl: sanitizedMediaUrl,
        mediaUrls: sanitizedMediaUrls,
        linkUrl: sanitizedLinkUrl,
        linkTitle: sanitizedLinkTitle,
        linkDescription: sanitizedLinkDescription,
        linkImage: sanitizedLinkImage,
        hashtags,
        mentions,
        postType,
        userId,
        user,
        isPublic: createPostDto.isPublic ?? true,
        allowComments: createPostDto.allowComments ?? true,
        isDraft: createPostDto.isDraft ?? false,
        parentPostId: createPostDto.parentPostId,
        scheduledDate,
      });

      // Validate and set parent post if provided
      if (createPostDto.parentPostId) {
        await this.validateAndSetParentPost(post, createPostDto.parentPostId);
      }

      const savedPost = await this.postRepository.save(post);

      // Invalidate user's posts cache
      await this.cachingService.invalidateByTags('post', `post:${savedPost.id}`, `user:${userId}:posts`);

      this.loggingService.log('Post created', 'PostsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: { postId: savedPost.id },
      });

      return savedPost;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error creating post',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to upload post');
    }
  }

  /**
   * Create a post with uploaded files
   */
  async createPostWithFiles(
    userId: string,
    content: string,
    files: Express.Multer.File[],
    documentFiles?: Express.Multer.File[],
    options?: {
      isPublic?: boolean;
      allowComments?: boolean;
      parentPostId?: string;
      videoIds?: string[];
    },
  ): Promise<Post> {
    try {
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

      // Handle video IDs from user library (if provided) - batch fetch to avoid N+1
      let videoUrls: string[] = [];
      if (options?.videoIds && options.videoIds.length > 0) {
        // Batch fetch all videos in a single query
        const videoRepository = this.dataSource.getRepository(Video);
        const videos = await videoRepository.find({
          where: {
            id: In(options.videoIds),
            userId,
            dateDeleted: IsNull(),
          },
        });

        // Validate all videos exist and belong to user
        const foundVideoIds = new Set(videos.map((v) => v.id));
        const missingVideoIds = options.videoIds.filter(
          (id) => !foundVideoIds.has(id),
        );
        if (missingVideoIds.length > 0) {
          throw new BadRequestException(
            `Videos not found: ${missingVideoIds.join(', ')}`,
              );
            }

        // Extract video URLs from ready videos
        for (const video of videos) {
            if (video.status === 'ready' && video.videoUrl) {
              videoUrls.push(video.videoUrl);
            }
        }
      }

      // Validate that either content, files, or videos are provided
      const hasContent = content && content.trim().length > 0;
      const hasFiles = files && files.length > 0;
      const hasVideos = videoUrls.length > 0;

      if (!hasContent && !hasFiles && !hasVideos) {
        throw new BadRequestException('Post must have either content, media files, or videos');
      }

      // Sanitize content (can be empty if files are provided)
      const sanitizedContent = content ? sanitizeText(content) : '';

      // Extract hashtags and mentions
      const hashtags = this.extractHashtags(sanitizedContent);
      const mentions = this.extractMentions(sanitizedContent);

      // Create post first (before uploading files)
      const post = this.postRepository.create({
        content: sanitizedContent,
        mediaUrl: null,
        mediaUrls: [],
        hashtags,
        mentions,
        postType: 'text',
        userId,
        user,
        isPublic: options?.isPublic ?? true,
        allowComments: options?.allowComments ?? true,
        isDraft: false,
        parentPostId: options?.parentPostId,
      });

      // Validate and set parent post if provided
      if (options?.parentPostId) {
        await this.validateAndSetParentPost(post, options.parentPostId);
      }

      const savedPost = await this.postRepository.save(post);

      // Upload files after post creation (with rollback on failure)
      const uploadedMediaUrls: string[] = [];
      const uploadedDocumentUrls: string[] = [];
      const uploadedFileKeys: string[] = [];

      try {
        // Upload media files (images, videos, GIFs)
        if (files && files.length > 0) {
          const videoMimeTypes = ['video/mp4', 'video/webm', 'video/quicktime'];

          for (const file of files) {
            const uploadResult = await this.storageService.uploadFile(
              userId,
              file,
              StorageType.MEDIA,
              'post',
            );
            uploadedMediaUrls.push(uploadResult.url);
            uploadedFileKeys.push(uploadResult.key);

            // If this is a video file, also add it to user's video library
            // Note: Thumbnail will be uploaded by frontend after post creation
            if (videoMimeTypes.includes(file.mimetype)) {
              try {
                await this.videosService.createVideoFromUploadedFile(
                  userId,
                  uploadResult.url,
                  uploadResult.key,
                  uploadResult.mimeType,
                  uploadResult.size,
                  `Video from post - ${new Date().toLocaleDateString()}`,
                );
              } catch (videoError) {
                // Log but don't fail post creation if video library creation fails
                this.loggingService.error(
                  'Failed to add video to user library',
                  videoError instanceof Error ? videoError.stack : undefined,
                  'PostsService',
                  {
                    category: LogCategory.DATABASE,
                    userId,
                    error:
                      videoError instanceof Error
                        ? videoError
                        : new Error(String(videoError)),
                    metadata: { videoUrl: uploadResult.url },
                  },
                );
              }
            }
          }
        }

        // Upload document files (PDF, Word, Excel, etc.)
        if (documentFiles && documentFiles.length > 0) {
          for (const file of documentFiles) {
            const uploadResult = await this.storageService.uploadFile(
              userId,
              file,
              StorageType.DOCUMENTS,
            );
            uploadedDocumentUrls.push(uploadResult.url);
            uploadedFileKeys.push(uploadResult.key);
          }
        }

        // Combine all uploaded URLs with video URLs from videoIds
        const allMediaUrls = [...uploadedMediaUrls, ...uploadedDocumentUrls, ...videoUrls];

        // Update post with file URLs and determine post type
        savedPost.mediaUrl = allMediaUrls.length > 0 ? allMediaUrls[0] : null;
        savedPost.mediaUrls = allMediaUrls;
        savedPost.postType = this.determinePostType(
          allMediaUrls.length > 0 ? allMediaUrls[0] : null,
          allMediaUrls,
        );

        await this.postRepository.save(savedPost);
      } catch (uploadError) {
        // Rollback: Delete uploaded files and remove post
        for (const fileKey of uploadedFileKeys) {
          try {
            await this.storageService.deleteFile(fileKey, userId);
          } catch (deleteError) {
            // Log but don't fail - file might not exist or already deleted
            this.loggingService.error(
              `Failed to delete uploaded file during rollback: ${fileKey}`,
              deleteError instanceof Error ? deleteError.stack : undefined,
              'PostsService',
              {
                category: LogCategory.STORAGE,
                userId,
                error:
                  deleteError instanceof Error
                    ? deleteError
                    : new Error(String(deleteError)),
              },
            );
          }
        }

        // Delete the post
        await this.postRepository.remove(savedPost);

        // Re-throw the upload error
        throw uploadError;
      }

      // Invalidate user's posts cache
      await this.cachingService.invalidateByTags(
        'post',
        `post:${savedPost.id}`,
        `user:${userId}:posts`,
      );

      this.loggingService.log('Post created with files', 'PostsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: {
          postId: savedPost.id,
          fileCount: files?.length || 0,
          documentCount: documentFiles?.length || 0,
        },
      });

      return savedPost;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error creating post with files',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to upload post with files');
    }
  }

  // #########################################################
  // FIND OPTIONS
  // #########################################################

  /**
   * Get a single post by ID
   */
  async findOne(
    postId: string,
    userId?: string,
  ): Promise<
    Post & { isLiked: boolean; isShared: boolean } & Record<string, any>
  > {
    try {
      const post = await this.cachingService.getOrSet(
        `post:${postId}`,
        async () => {
          const postData = await this.postRepository.findOne({
            where: { id: postId },
            relations: [
              'user',
              'user.profile',
              'parentPost',
              'parentPost.user',
              'parentPost.user.profile',
            ],
          });

          if (!postData) {
            throw new NotFoundException('Post not found');
          }

          // Note: View tracking should be done via the dedicated endpoint
          // POST /posts/:postId/view - not automatically on fetch

          return postData;
        },
        {
          tags: ['post', `post:${postId}`],
          ttl: 300, // 5 minutes
        },
      );

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Check if user has liked/shared this post
      let isLiked = false;
      let isShared = false;

      if (userId) {
        const like = await this.likeRepository.findOne({
          where: { userId, resourceType: 'post', resourceId: postId },
        });
        isLiked = !!like;

        const share = await this.shareRepository.findOne({
          where: { userId, resourceType: 'post', resourceId: postId },
        });
        isShared = !!share;
      }

      // Note: View tracking is handled by trackPostView() called above
      // Do not increment here to avoid double counting

      return {
        ...post,
        isLiked,
        isShared,
      } as Post & { isLiked: boolean; isShared: boolean } & Record<string, any>;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error finding post',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to find post');
    }
  }

  /**
   * Get all posts with pagination
   */
  async findAll(
    paginationDto: PaginationDto = {},
    userId?: string,
  ): Promise<
    PaginationResponse<Post & { isLiked: boolean } & Record<string, any>>
  > {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 10;
      const sortBy = paginationDto.sortBy || 'dateCreated';
      const sortOrder = paginationDto.sortOrder || 'DESC';
      const skip = (page - 1) * limit;

      const allowedSortFields = [
        'dateCreated',
        'likesCount',
        'commentsCount',
        'sharesCount',
        'viewsCount',
      ];
      const safeSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : 'dateCreated';
      const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

      // Build query
      const queryBuilder = this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .where('post.isPublic = :isPublic', { isPublic: true })
        .andWhere('post.isDraft = :isDraft', { isDraft: false })
        .andWhere('post.isArchived = :isArchived', { isArchived: false })
        .andWhere('post.parentPostId IS NULL') // Only top-level posts
        .orderBy(`post.${safeSortBy}`, safeSortOrder)
        .skip(skip)
        .take(limit);

      const [posts, total] = await queryBuilder.getManyAndCount();

      // Batch fetch all likes for the user if authenticated
      let userLikes: Set<string> = new Set();
      if (userId && posts.length > 0) {
        const postIds = posts.map((p) => p.id);
        const likes = await this.likeRepository.find({
          where: {
            userId,
            resourceType: 'post',
            resourceId: In(postIds),
          },
          select: ['resourceId'],
        });
        userLikes = new Set(
          likes.map((like) => like.resourceId).filter((id): id is string => id !== null),
        );
      }

      // Check which posts are liked by the user
      const postsWithLikes = posts.map((post) => ({
        ...post,
        isLiked: userId ? userLikes.has(post.id) : false,
      }));

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
        data: postsWithLikes as (Post & { isLiked: boolean } & Record<
            string,
            any
          >)[],
        meta,
      };
    } catch (error) {
      this.loggingService.error(
        'Error finding all posts',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to find posts');
    }
  }

  /**
   * Get posts by user ID
   */
  async findByUserId(
    targetUserId: string,
    paginationDto: PaginationDto = {},
    currentUserId?: string,
  ): Promise<
    PaginationResponse<Post & { isLiked: boolean } & Record<string, any>>
  > {
    try {
      const user = await this.userRepository.findOne({
        where: { id: targetUserId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 10;
      const sortBy = paginationDto.sortBy || 'dateCreated';
      const sortOrder = paginationDto.sortOrder || 'DESC';
      const skip = (page - 1) * limit;

      const allowedSortFields = [
        'dateCreated',
        'likesCount',
        'commentsCount',
        'sharesCount',
        'viewsCount',
      ];
      const safeSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : 'dateCreated';
      const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

      // Build query - show public posts or user's own posts (excluding drafts and archived unless viewing own)
      // Include shared posts (posts with parentPostId) as they are posts created by the user
      const queryBuilder = this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('post.parentPost', 'parentPost')
        .leftJoinAndSelect('parentPost.user', 'parentPostUser')
        .leftJoinAndSelect('parentPostUser.profile', 'parentPostUserProfile')
        .where('post.userId = :targetUserId', { targetUserId })
        .andWhere(
          currentUserId
            ? '(post.isPublic = :isPublic OR post.userId = :currentUserId)'
            : 'post.isPublic = :isPublic',
          currentUserId
            ? {
                isPublic: true,
                currentUserId,
              }
            : {
                isPublic: true,
              },
        )
        .orderBy(`post.${safeSortBy}`, safeSortOrder)
        .skip(skip)
        .take(limit);

      const [posts, total] = await queryBuilder.getManyAndCount();

      // Batch fetch all likes for the current user if authenticated
      let userLikes: Set<string> = new Set();
      if (currentUserId && posts.length > 0) {
        const postIds = posts.map((p) => p.id);
        const likes = await this.likeRepository.find({
          where: {
            userId: currentUserId,
            resourceType: 'post',
            resourceId: In(postIds),
          },
          select: ['resourceId'],
        });
        userLikes = new Set(
          likes.map((like) => like.resourceId).filter((id): id is string => id !== null),
        );
      }

      // Check which posts are liked by the current user
      const postsWithLikes = posts.map((post) => ({
        ...post,
        isLiked: currentUserId ? userLikes.has(post.id) : false,
      }));

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
        data: postsWithLikes as (Post & { isLiked: boolean } & Record<
            string,
            any
          >)[],
        meta,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error finding posts by user',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to find user posts');
    }
  }

  /**
   * Get feed posts (posts from users the current user follows + shared posts)
   */
  async getFeed(
    userId: string,
    paginationDto: PaginationDto = {},
  ): Promise<
    PaginationResponse<Post & { isLiked: boolean } & Record<string, any>>
  > {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 10;
      const sortBy = paginationDto.sortBy || 'dateCreated';
      const sortOrder = paginationDto.sortOrder || 'DESC';
      const skip = (page - 1) * limit;

      const allowedSortFields = [
        'dateCreated',
        'likesCount',
        'commentsCount',
        'sharesCount',
        'viewsCount',
      ];
      const safeSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : 'dateCreated';
      const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

      // Get list of user IDs that the current user follows
      const follows = await this.followRepository.find({
        where: { followerId: userId },
        select: ['followingId'],
      });

      const followingUserIds = follows.map((f) => f.followingId);

      // Include the current user's own posts in the feed
      const feedUserIds = [...followingUserIds, userId];

      // Get post IDs that the user has shared
      const sharedPosts = await this.shareRepository.find({
        where: { userId, resourceType: 'post' },
        select: ['resourceId'],
      });
      const sharedPostIds = sharedPosts.map((s) => s.resourceId).filter((id): id is string => id !== null);

      // Build query to get posts from followed users + posts the user has shared
      // Show:
      // - All public posts from followed users (including the user themselves)
      // - Private posts from the user themselves (so they can see their own posts in their feed)
      // - Private posts from friends (when friends functionality is added, will check friend relationship)
      const queryBuilder = this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .where(
          '(post.isPublic = :isPublic OR (post.isPublic = :isPrivate AND post.userId = :currentUserId))',
          { isPublic: true, isPrivate: false, currentUserId: userId },
        )
        .andWhere('post.isDraft = :isDraft', { isDraft: false })
        .andWhere('post.isArchived = :isArchived', { isArchived: false })
        .andWhere(
          sharedPostIds.length > 0
            ? '(post.userId IN (:...feedUserIds) OR post.id IN (:...sharedPostIds))'
            : 'post.userId IN (:...feedUserIds)',
          sharedPostIds.length > 0
            ? { feedUserIds, sharedPostIds }
            : { feedUserIds },
        )
        .orderBy(`post.${safeSortBy}`, safeSortOrder)
        .skip(skip)
        .take(limit);

      const [posts, total] = await queryBuilder.getManyAndCount();

      // Batch fetch all likes for the feed owner (userId)
      let userLikes: Set<string> = new Set();
      if (posts.length > 0) {
        const postIds = posts.map((p) => p.id);
        const likes = await this.likeRepository.find({
          where: {
            userId,
            resourceType: 'post',
            resourceId: In(postIds),
          },
          select: ['resourceId'],
        });
        userLikes = new Set(
          likes.map((like) => like.resourceId).filter((id): id is string => id !== null),
        );
      }

      // Check which posts are liked by the feed owner (userId)
      const postsWithLikes = posts.map((post) => ({
        ...post,
        isLiked: userLikes.has(post.id),
      }));

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
        data: postsWithLikes as (Post & { isLiked: boolean } & Record<
          string,
          any
        >)[],
        meta,
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting feed',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to get feed');
    }
  }

  // #########################################################
  // UPDATE OPTIONS
  // #########################################################

  /**
   * Update a post
   */
  async updatePost(
    userId: string,
    postId: string,
    updatePostDto: UpdatePostDto,
  ): Promise<Post> {
    try {
      const post = await this.postRepository.findOne({
        where: { id: postId },
        relations: ['user'],
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      if (post.userId !== userId) {
        throw new ForbiddenException('You can only update your own posts');
      }

      // Sanitize updated fields
      if (updatePostDto.content !== undefined) {
        post.content = sanitizeText(updatePostDto.content);
        // Re-extract hashtags and mentions when content changes
        post.hashtags = this.extractHashtags(post.content);
        post.mentions = this.extractMentions(post.content);
      }
      if (updatePostDto.mediaUrl !== undefined) {
        post.mediaUrl = updatePostDto.mediaUrl ? sanitizeUrl(updatePostDto.mediaUrl) : null;
      }
      if (updatePostDto.mediaUrls !== undefined) {
        post.mediaUrls = updatePostDto.mediaUrls
          ? updatePostDto.mediaUrls.map((url) => sanitizeUrl(url))
          : [];
      }
      // Re-determine post type if media changed
      if (
        updatePostDto.mediaUrl !== undefined ||
        updatePostDto.mediaUrls !== undefined
      ) {
        post.postType = this.determinePostType(post.mediaUrl, post.mediaUrls);
      }
      if (updatePostDto.linkUrl !== undefined) {
        post.linkUrl = updatePostDto.linkUrl ? sanitizeUrl(updatePostDto.linkUrl) : null;
      }
      if (updatePostDto.linkTitle !== undefined) {
        post.linkTitle = updatePostDto.linkTitle ? sanitizeText(updatePostDto.linkTitle) : null;
      }
      if (updatePostDto.linkDescription !== undefined) {
        post.linkDescription = updatePostDto.linkDescription
          ? sanitizeText(updatePostDto.linkDescription)
          : null;
      }
      if (updatePostDto.linkImage !== undefined) {
        post.linkImage = updatePostDto.linkImage ? sanitizeUrl(updatePostDto.linkImage) : null;
      }
      if (updatePostDto.isPublic !== undefined) {
        post.isPublic = updatePostDto.isPublic;
      }
      if (updatePostDto.allowComments !== undefined) {
        post.allowComments = updatePostDto.allowComments;
      }
      if (updatePostDto.isDraft !== undefined) {
        post.isDraft = updatePostDto.isDraft;
      }
      post.isEdited = true;

      const updatedPost = await this.postRepository.save(post);

      // Invalidate post cache
      await this.cachingService.invalidateByTags('post', `post:${postId}`);

      this.loggingService.log('Post updated', 'PostsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: { postId },
      });

      return updatedPost;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error updating post',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to update post');
    }
  }

  // #########################################################
  // DELETE OPTIONS
  // #########################################################

  /**
   * Helper method to check if a URL is a video URL
   */
  private isVideoUrl(url: string): boolean {
    const videoExtensions = ['.mp4', '.webm', '.mov', '.quicktime'];
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some((ext) => lowerUrl.includes(ext));
  }

  /**
   * Delete a post
   */
  async deletePost(userId: string, postId: string): Promise<void> {
    try {
      const post = await this.postRepository.findOne({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      if (post.userId !== userId) {
        throw new ForbiddenException('You can only delete your own posts');
      }

      // Check if post has videos and delete them
      const videoUrls: string[] = [];
      if (post.mediaUrl && this.isVideoUrl(post.mediaUrl)) {
        videoUrls.push(post.mediaUrl);
      }
      if (post.mediaUrls && post.mediaUrls.length > 0) {
        post.mediaUrls.forEach((url) => {
          if (this.isVideoUrl(url) && !videoUrls.includes(url)) {
            videoUrls.push(url);
          }
        });
      }

      // Delete videos that were created from this post
      if (videoUrls.length > 0) {
        try {
          // Access the video repository through the data source
          const videoRepository = this.dataSource.getRepository(Video);

          // Batch fetch all videos by URLs to avoid N+1
          if (videoUrls.length > 0) {
            const videos = await videoRepository.find({
              where: {
                userId,
                videoUrl: In(videoUrls),
                dateDeleted: IsNull(),
              },
            });

            // Delete each matching video
            for (const video of videos) {
              try {
                await this.videosService.deleteVideo(userId, video.id);
              } catch (videoError) {
                // Log but don't fail post deletion if video deletion fails
                this.loggingService.error(
                  `Failed to delete video ${video.id} when deleting post ${postId}`,
                  videoError instanceof Error ? videoError.stack : undefined,
                  'PostsService',
                  {
                    category: LogCategory.DATABASE,
                    userId,
                    error:
                      videoError instanceof Error
                        ? videoError
                        : new Error(String(videoError)),
                    metadata: { postId, videoId: video.id, videoUrl: video.videoUrl },
                  },
                );
              }
            }
          }
        } catch (videoDeletionError) {
          // Log but don't fail post deletion if video deletion fails
          this.loggingService.error(
            'Error deleting videos associated with post',
            videoDeletionError instanceof Error ? videoDeletionError.stack : undefined,
            'PostsService',
            {
              category: LogCategory.DATABASE,
              userId,
              error:
                videoDeletionError instanceof Error
                  ? videoDeletionError
                  : new Error(String(videoDeletionError)),
              metadata: { postId, videoUrls },
            },
          );
        }
      }

      // Delete the post
      // TypeORM will automatically handle the ManyToMany join table cleanup
      // CASCADE will handle related entities (comments, likes, shares, bookmarks, etc.)
      await this.postRepository.delete({ id: postId });

      // Invalidate post cache
      await this.cachingService.invalidateByTags(
        'post',
        `post:${postId}`,
        `user:${userId}:posts`,
      );

      // Recalculate user analytics immediately (await to ensure it completes)
      try {
        await this.analyticsService.calculateUserAnalytics(userId);
      } catch (error: unknown) {
        this.loggingService.error(
          'Error recalculating user analytics after post deletion',
          error instanceof Error ? error.stack : undefined,
          'PostsService',
        );
        // Don't fail deletion if analytics recalculation fails
      }

      this.loggingService.log('Post deleted', 'PostsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: { postId },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error deleting post',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to delete post');
    }
  }

  /**
   * Pin or unpin a post (only post owner can pin)
   */
  async togglePinPost(userId: string, postId: string, isPinned: boolean): Promise<Post> {
    try {
      const post = await this.postRepository.findOne({
        where: { id: postId },
        relations: ['user'],
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      if (post.userId !== userId) {
        throw new ForbiddenException('You can only pin/unpin your own posts');
      }

      post.isPinned = isPinned;
      const updatedPost = await this.postRepository.save(post);

      // Invalidate post cache
      await this.cachingService.invalidateByTags('post', `post:${postId}`, `user:${userId}:posts`);

      this.loggingService.log(`Post ${isPinned ? 'pinned' : 'unpinned'}`, 'PostsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: { postId, isPinned },
      });

      return updatedPost;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error toggling post pin status',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to toggle post pin status');
    }
  }

  // #########################################################
  // BOOKMARK OPTIONS
  // #########################################################

  /**
   * Bookmark a post
   */
  async bookmarkPost(
    userId: string,
    postId: string,
    note?: string,
  ): Promise<Bookmark> {
    try {
      const post = await this.postRepository.findOne({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Check if already bookmarked
      const existingBookmark = await this.bookmarkRepository.findOne({
        where: { userId, postId },
      });

      if (existingBookmark) {
        throw new BadRequestException('Post already bookmarked');
      }

      const bookmark = this.bookmarkRepository.create({
        userId,
        postId,
        note: note ? sanitizeText(note) : null,
      });

      const savedBookmark = await this.bookmarkRepository.save(bookmark);

      // Recalculate analytics (in background)
      this.analyticsService.calculatePostAnalytics(postId).catch((error: unknown) => {
        this.loggingService.error(
          'Error recalculating post analytics after bookmark',
          error instanceof Error ? error.stack : undefined,
          'PostsService',
        );
      });

      // Invalidate cache
      await this.cachingService.invalidateByTags('post', `post:${postId}`, `user:${userId}:bookmarks`);

      this.loggingService.log('Post bookmarked', 'PostsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: { bookmarkId: savedBookmark.id, postId },
      });

      return savedBookmark;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error bookmarking post',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to bookmark post');
    }
  }

  /**
   * Remove bookmark from a post
   */
  async unbookmarkPost(userId: string, postId: string): Promise<void> {
    try {
      const bookmark = await this.bookmarkRepository.findOne({
        where: { userId, postId },
      });

      if (!bookmark) {
        throw new NotFoundException('Bookmark not found');
      }

      await this.bookmarkRepository.remove(bookmark);

      // Recalculate analytics (in background)
      this.analyticsService.calculatePostAnalytics(postId).catch((error: unknown) => {
        this.loggingService.error(
          'Error recalculating post analytics after unbookmark',
          error instanceof Error ? error.stack : undefined,
          'PostsService',
        );
      });

      // Invalidate cache
      await this.cachingService.invalidateByTags('post', `post:${postId}`, `user:${userId}:bookmarks`);

      this.loggingService.log('Post unbookmarked', 'PostsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: { postId },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error unbookmarking post',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to unbookmark post');
    }
  }

  /**
   * Get user's bookmarked posts
   */
  async getBookmarkedPosts(
    userId: string,
    paginationDto: PaginationDto = {},
  ): Promise<PaginationResponse<Post & { isLiked: boolean } & Record<string, any>>> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 10;
      const skip = (page - 1) * limit;

      const queryBuilder = this.bookmarkRepository
        .createQueryBuilder('bookmark')
        .leftJoinAndSelect('bookmark.post', 'post')
        .leftJoinAndSelect('post.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .where('bookmark.userId = :userId', { userId })
        .orderBy('bookmark.dateCreated', 'DESC')
        .skip(skip)
        .take(limit);

      const [bookmarks, total] = await queryBuilder.getManyAndCount();
      const posts = bookmarks.map((b) => b.post);

      // Batch fetch likes
      let userLikes: Set<string> = new Set();
      if (posts.length > 0) {
        const postIds = posts.map((p) => p.id);
        const likes = await this.likeRepository.find({
          where: {
            userId,
            resourceType: 'post',
            resourceId: In(postIds),
          },
          select: ['resourceId'],
        });
        userLikes = new Set(
          likes.map((like) => like.resourceId).filter((id): id is string => id !== null),
        );
      }

      const postsWithLikes = posts.map((post) => ({
        ...post,
        isLiked: userLikes.has(post.id),
      })) as (Post & { isLiked: boolean } & Record<string, any>)[];

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
        data: postsWithLikes,
        meta,
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting bookmarked posts',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to get bookmarked posts');
    }
  }

  /**
   * Get user's liked posts
   */
  async getLikedPosts(
    userId: string,
    paginationDto: PaginationDto = {},
  ): Promise<PaginationResponse<Post & { isLiked: boolean } & Record<string, any>>> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 10;
      const skip = (page - 1) * limit;

      // Get likes for posts (not comments)
      const queryBuilder = this.likeRepository
        .createQueryBuilder('like')
        .where('like.userId = :userId', { userId })
        .andWhere('like.resourceType = :resourceType', { resourceType: 'post' })
        .orderBy('like.dateCreated', 'DESC')
        .skip(skip)
        .take(limit);

      const [likes, total] = await queryBuilder.getManyAndCount();

      // Extract post IDs from likes
      const postIds = likes.map((l) => l.resourceId).filter((id): id is string => id !== null);

      // Fetch posts separately
      const posts = postIds.length > 0
        ? await this.postRepository.find({
            where: { id: In(postIds) },
            relations: ['user', 'user.profile'],
          })
        : [];

      // All posts in this list are liked by the user
      const postsWithLikes = posts.map((post) => ({
        ...post,
        isLiked: true,
      })) as (Post & { isLiked: boolean } & Record<string, any>)[];

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
        data: postsWithLikes,
        meta,
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting liked posts',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to get liked posts');
    }
  }

  /**
   * Get posts shared by a user
   */
  async getSharedPosts(
    userId: string,
    paginationDto: PaginationDto = {},
  ): Promise<PaginationResponse<Post & { isLiked: boolean } & Record<string, any>>> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 10;
      const skip = (page - 1) * limit;

      // Get shares for posts
      const queryBuilder = this.shareRepository
        .createQueryBuilder('share')
        .where('share.userId = :userId', { userId })
        .andWhere('share.resourceType = :resourceType', { resourceType: 'post' })
        .orderBy('share.dateCreated', 'DESC')
        .skip(skip)
        .take(limit);

      const [shares, total] = await queryBuilder.getManyAndCount();

      // Extract post IDs from shares
      const postIds = shares.map((s) => s.resourceId).filter((id): id is string => id !== null);

      // Fetch posts separately
      const posts = postIds.length > 0
        ? await this.postRepository.find({
            where: { id: In(postIds) },
            relations: ['user', 'user.profile'],
          })
        : [];

      // Batch fetch likes
      let userLikes: Set<string> = new Set();
      if (posts.length > 0) {
        const postIds = posts.map((p) => p.id);
        const likes = await this.likeRepository.find({
          where: {
            userId,
            resourceType: 'post',
            resourceId: In(postIds),
          },
          select: ['resourceId'],
        });
        userLikes = new Set(
          likes.map((like) => like.resourceId).filter((id): id is string => id !== null),
        );
      }

      const postsWithLikes = posts.map((post) => ({
        ...post,
        isLiked: userLikes.has(post.id),
      })) as (Post & { isLiked: boolean } & Record<string, any>)[];

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
        data: postsWithLikes,
        meta,
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting shared posts',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to get shared posts');
    }
  }

  // #########################################################
  // VIEW TRACKING
  // #########################################################

  /**
   * Track post view (increment viewsCount and track geographic data)
   */
  async trackPostView(postId: string, req: any, userId?: string): Promise<void> {
    try {
      const post = await this.postRepository.findOne({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Only track if post is public and not a draft
      if (!post.isPublic || post.isDraft) {
        return;
      }

      // Track view using centralized tracking service
      const trackingResult = await this.trackingService.trackPostView(postId, post.userId, req, userId);

      // Only recalculate analytics if view was actually tracked (not a duplicate)
      if (trackingResult.tracked) {
        this.analyticsService.calculatePostAnalytics(postId).catch((error: unknown) => {
          this.loggingService.error(
            'Error recalculating post analytics after view',
            error instanceof Error ? error.stack : undefined,
            'PostsService',
          );
        });
      }

      // Invalidate cache
      await this.cachingService.invalidateByTags('post', `post:${postId}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error tracking post view',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
    }
  }

  // #########################################################
  // SEARCH OPTIONS
  // #########################################################

  /**
   * Search posts by content, hashtags, or mentions
   */
  async searchPosts(
    query: string,
    paginationDto: PaginationDto = {},
    userId?: string,
  ): Promise<PaginationResponse<Post & { isLiked: boolean } & Record<string, any>>> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 10;
      const skip = (page - 1) * limit;
      const searchTerm = `%${query.toLowerCase()}%`;

      // For simple-array columns, TypeORM stores them as comma-separated strings
      // So we can search them directly with LIKE
      const queryBuilder = this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .where('post.isPublic = :isPublic', { isPublic: true })
        .andWhere('post.isDraft = :isDraft', { isDraft: false })
        .andWhere('post.parentPostId IS NULL')
        .andWhere(
          '(LOWER(post.content) LIKE :searchTerm OR LOWER(CAST(post.hashtags AS text)) LIKE :searchTerm OR LOWER(CAST(post.mentions AS text)) LIKE :searchTerm)',
          { searchTerm },
        )
        .orderBy('post.dateCreated', 'DESC')
        .skip(skip)
        .take(limit);

      const [posts, total] = await queryBuilder.getManyAndCount();

      // Batch fetch likes
      let userLikes: Set<string> = new Set();
      if (userId && posts.length > 0) {
        const postIds = posts.map((p) => p.id);
        const likes = await this.likeRepository.find({
          where: {
            userId,
            resourceType: 'post',
            resourceId: In(postIds),
          },
          select: ['resourceId'],
        });
        userLikes = new Set(
          likes.map((like) => like.resourceId).filter((id): id is string => id !== null),
        );
      }

      const postsWithLikes = posts.map((post) => ({
        ...post,
        isLiked: userId ? userLikes.has(post.id) : false,
      })) as (Post & { isLiked: boolean } & Record<string, any>)[];

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
        data: postsWithLikes,
        meta,
      };
    } catch (error) {
      this.loggingService.error(
        'Error searching posts',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to search posts');
    }
  }

  // #########################################################
  // FILTERING OPTIONS
  // #########################################################

  /**
   * Filter posts by type
   */
  async filterPostsByType(
    postType: 'text' | 'image' | 'video' | 'document' | 'mixed',
    paginationDto: PaginationDto = {},
    userId?: string,
  ): Promise<PaginationResponse<Post & { isLiked: boolean } & Record<string, any>>> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 10;
      const skip = (page - 1) * limit;
      const sortBy = paginationDto.sortBy || 'dateCreated';
      const sortOrder = paginationDto.sortOrder || 'DESC';

      const allowedSortFields = [
        'dateCreated',
        'likesCount',
        'commentsCount',
        'sharesCount',
        'viewsCount',
      ];
      const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'dateCreated';
      const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

      const queryBuilder = this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .where('post.isPublic = :isPublic', { isPublic: true })
        .andWhere('post.isDraft = :isDraft', { isDraft: false })
        .andWhere('post.parentPostId IS NULL')
        .andWhere('post.postType = :postType', { postType })
        .orderBy(`post.${safeSortBy}`, safeSortOrder)
        .skip(skip)
        .take(limit);

      const [posts, total] = await queryBuilder.getManyAndCount();

      // Batch fetch likes
      let userLikes: Set<string> = new Set();
      if (userId && posts.length > 0) {
        const postIds = posts.map((p) => p.id);
        const likes = await this.likeRepository.find({
          where: {
            userId,
            resourceType: 'post',
            resourceId: In(postIds),
          },
          select: ['resourceId'],
        });
        userLikes = new Set(
          likes.map((like) => like.resourceId).filter((id): id is string => id !== null),
        );
      }

      const postsWithLikes = posts.map((post) => ({
        ...post,
        isLiked: userId ? userLikes.has(post.id) : false,
      })) as (Post & { isLiked: boolean } & Record<string, any>)[];

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
        data: postsWithLikes,
        meta,
      };
    } catch (error) {
      this.loggingService.error(
        'Error filtering posts by type',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to filter posts by type');
    }
  }

  // #########################################################
  // REPORT OPTIONS
  // #########################################################

  /**
   * Report a post
   */
  async reportPost(
    userId: string,
    postId: string,
    reason: Report['reason'],
    description?: string,
  ): Promise<Report> {
    try {
      const post = await this.postRepository.findOne({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Prevent self-reporting
      if (post.userId === userId) {
        throw new BadRequestException('You cannot report your own post');
      }

      // Check if user has already reported this post
      const existingReport = await this.reportRepository.findOne({
        where: { userId, postId },
      });

      if (existingReport) {
        throw new BadRequestException('You have already reported this post');
      }

      const report = this.reportRepository.create({
        userId,
        postId,
        reason,
        description: description ? sanitizeText(description) : null,
        status: 'pending',
      });

      const savedReport = await this.reportRepository.save(report);

      // Recalculate analytics (in background)
      this.analyticsService.calculatePostAnalytics(postId).catch((error: unknown) => {
        this.loggingService.error(
          'Error recalculating post analytics after report',
          error instanceof Error ? error.stack : undefined,
          'PostsService',
        );
      });

      // Invalidate cache
      await this.cachingService.invalidateByTags('post', `post:${postId}`);

      this.loggingService.log('Post reported', 'PostsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: { reportId: savedReport.id, postId, reason },
      });

      return savedReport;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error reporting post',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to report post');
    }
  }

  // #########################################################
  // REACTION OPTIONS
  // #########################################################

  /**
   * React to a post or comment
   */
  async reactToPostOrComment(
    userId: string,
    reactionType: Reaction['reactionType'],
    postId?: string,
    commentId?: string,
  ): Promise<Reaction> {
    try {
      if (!postId && !commentId) {
        throw new BadRequestException('Either postId or commentId must be provided');
      }

      if (postId && commentId) {
        throw new BadRequestException('Cannot react to both post and comment');
      }

      // Check if reaction already exists
      const existingReaction = await this.reactionRepository.findOne({
        where: {
          userId,
          ...(postId ? { postId } : {}),
          ...(commentId ? { commentId } : {}),
        },
      });

      if (existingReaction) {
        // Update existing reaction
        existingReaction.reactionType = reactionType;
        return await this.reactionRepository.save(existingReaction);
      }

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

      const reaction = this.reactionRepository.create({
        userId,
        user,
        reactionType,
        postId: postId || undefined,
        commentId: commentId || undefined,
      });

      const savedReaction = await this.reactionRepository.save(reaction);

      // Invalidate cache
      if (postId) {
        await this.cachingService.invalidateByTags('post', `post:${postId}`);
      }
      if (commentId) {
        await this.cachingService.invalidateByTags('comment', `comment:${commentId}`);
      }

      this.loggingService.log('Post/Comment reacted', 'PostsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: {
          reactionId: savedReaction.id,
          reactionType,
          postId: postId || null,
          commentId: commentId || null,
        },
      });

      return savedReaction;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error reacting to post/comment',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to react to post/comment');
    }
  }

  /**
   * Remove reaction from a post or comment
   */
  async removeReaction(
    userId: string,
    postId?: string,
    commentId?: string,
  ): Promise<void> {
    try {
      if (!postId && !commentId) {
        throw new BadRequestException('Either postId or commentId must be provided');
      }

      const reaction = await this.reactionRepository.findOne({
        where: {
          userId,
          ...(postId ? { postId } : {}),
          ...(commentId ? { commentId } : {}),
        },
      });

      if (!reaction) {
        throw new NotFoundException('Reaction not found');
      }

      await this.reactionRepository.remove(reaction);

      // Invalidate cache
      if (postId) {
        await this.cachingService.invalidateByTags('post', `post:${postId}`);
      }
      if (commentId) {
        await this.cachingService.invalidateByTags('comment', `comment:${commentId}`);
      }

      this.loggingService.log('Reaction removed', 'PostsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: {
          postId: postId || null,
          commentId: commentId || null,
        },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error removing reaction',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to remove reaction');
    }
  }

  // #########################################################
  // COLLECTION OPTIONS
  // #########################################################

  /**
   * Create a collection
   */
  async createCollection(
    userId: string,
    name: string,
    description?: string,
    isPublic?: boolean,
    coverImage?: string,
  ): Promise<Collection> {
    try {
      const collection = this.collectionRepository.create({
        userId,
        name: sanitizeText(name),
        description: description ? sanitizeText(description) : null,
        isPublic: isPublic ?? false,
        coverImage: coverImage ? sanitizeUrl(coverImage) : null,
      });

      const savedCollection = await this.collectionRepository.save(collection);

      this.loggingService.log('Collection created', 'PostsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: { collectionId: savedCollection.id },
      });

      return savedCollection;
    } catch (error) {
      this.loggingService.error(
        'Error creating collection',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to upload collection');
    }
  }

  /**
   * Add post to collection
   */
  async addPostToCollection(
    userId: string,
    collectionId: string,
    postId: string,
  ): Promise<Collection> {
    try {
      // Verify collection exists and user owns it
      const collection = await this.collectionRepository.findOne({
        where: { id: collectionId, userId },
        relations: ['posts'],
      });

      if (!collection) {
        throw new NotFoundException('Collection not found');
      }

      // Verify post exists
      const post = await this.postRepository.findOne({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Verify post is not a draft (can't add drafts to collections)
      if (post.isDraft) {
        throw new BadRequestException('Cannot add draft posts to collections');
      }

      // Verify post is not archived (optional - can be added if needed)
      if (post.isArchived) {
        throw new BadRequestException('Cannot add archived posts to collections');
      }

      // Check if post is already in collection
      const postAlreadyInCollection = collection.posts.some((p) => p.id === postId);
      if (postAlreadyInCollection) {
        throw new BadRequestException('Post already in collection');
      }

      // Verify collection posts count matches actual posts (data integrity check)
      const actualPostsCount = collection.posts.length;
      if (collection.postsCount !== actualPostsCount) {
        // Fix data inconsistency
        this.loggingService.log(
          'Collection posts count mismatch detected and corrected',
          'PostsService',
          {
            category: LogCategory.DATABASE,
            userId,
            metadata: {
              collectionId,
              expectedCount: collection.postsCount,
              actualCount: actualPostsCount,
            },
          },
        );
        collection.postsCount = actualPostsCount;
      }

      collection.posts.push(post);
      const savedCollection = await this.collectionRepository.save(collection);

      // Note: Collection postsCount is maintained by the collection entity itself
      // Analytics recalculation for collections can be added if needed

      this.loggingService.log('Post added to collection', 'PostsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: { collectionId, postId },
      });

      return savedCollection;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error adding post to collection',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to add post to collection');
    }
  }

  /**
   * Remove post from collection
   */
  async removePostFromCollection(
    userId: string,
    collectionId: string,
    postId: string,
  ): Promise<void> {
    try {
      // Verify collection exists and user owns it
      const collection = await this.collectionRepository.findOne({
        where: { id: collectionId, userId },
        relations: ['posts'],
      });

      if (!collection) {
        throw new NotFoundException('Collection not found');
      }

      // Verify post exists in collection
      const postInCollection = collection.posts.find((p) => p.id === postId);
      if (!postInCollection) {
        throw new NotFoundException('Post not found in collection');
      }

      // Verify collection posts count matches actual posts (data integrity check)
      const actualPostsCount = collection.posts.length;
      if (collection.postsCount !== actualPostsCount) {
        // Fix data inconsistency
        this.loggingService.log(
          'Collection posts count mismatch detected and corrected',
          'PostsService',
          {
            category: LogCategory.DATABASE,
            userId,
            metadata: {
              collectionId,
              expectedCount: collection.postsCount,
              actualCount: actualPostsCount,
            },
          },
        );
        collection.postsCount = actualPostsCount;
      }

      collection.posts = collection.posts.filter((p) => p.id !== postId);
      await this.collectionRepository.save(collection);

      // Note: Collection postsCount is maintained by the collection entity itself
      // Analytics recalculation for collections can be added if needed

      this.loggingService.log('Post removed from collection', 'PostsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: { collectionId, postId },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error removing post from collection',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to remove post from collection');
    }
  }

  /**
   * Get posts from a collection with pagination
   */
  async getCollectionPosts(
    collectionId: string,
    userId: string,
    paginationDto: PaginationDto = {},
  ): Promise<PaginationResponse<Post & { isLiked: boolean } & Record<string, any>>> {
    try {
      // First check collection exists and user has access
      const collection = await this.collectionRepository.findOne({
        where: { id: collectionId },
      });

      if (!collection) {
        throw new NotFoundException('Collection not found');
      }

      // Check if user can access this collection
      if (!collection.isPublic && collection.userId !== userId) {
        throw new ForbiddenException('You do not have access to this collection');
      }

      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 10;
      const sortBy = paginationDto.sortBy || 'dateCreated';
      const sortOrder = paginationDto.sortOrder || 'DESC';

      // Validate sortBy field
      const allowedSortFields = ['dateCreated', 'likesCount', 'commentsCount', 'viewsCount'];
      const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'dateCreated';
      const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

      // Get all post IDs from collection using the join table
      const collectionWithPosts = await this.collectionRepository.findOne({
        where: { id: collectionId },
        relations: ['posts'],
      });

      const allPostIds = collectionWithPosts?.posts.map((post) => post.id) || [];

      if (allPostIds.length === 0) {
        return {
          data: [],
          meta: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        };
      }

      // Build query for posts with pagination
      const skip = (page - 1) * limit;
      const queryBuilder = this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .where('post.id IN (:...postIds)', { postIds: allPostIds })
        .andWhere('post.isDraft = :isDraft', { isDraft: false })
        .andWhere('post.isArchived = :isArchived', { isArchived: false })
        .orderBy(`post.${safeSortBy}`, safeSortOrder)
        .skip(skip)
        .take(limit);

      const posts = await queryBuilder.getMany();
      const total = allPostIds.length;

      // Batch fetch likes for all posts
      const postIds = posts.map((post) => post.id);
      let userLikes: Set<string> = new Set();

      if (userId && postIds.length > 0) {
        const likes = await this.likeRepository.find({
          where: {
            userId,
            resourceType: 'post',
            resourceId: In(postIds.filter((id): id is string => id !== null)),
          },
        });
        userLikes = new Set(likes.map((like) => like.resourceId).filter((id): id is string => id !== null));
      }

      // Add isLiked flag to each post
      const postsWithLikes = posts.map((post) => ({
        ...post,
        isLiked: userLikes.has(post.id),
      })) as (Post & { isLiked: boolean } & Record<string, any>)[];

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
        data: postsWithLikes,
        meta,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error getting collection posts',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { collectionId },
        },
      );

      throw new InternalServerErrorException('Failed to get collection posts');
    }
  }

  // #########################################################
  // ARCHIVE OPTIONS
  // #########################################################

  /**
   * Archive a post
   */
  async archivePost(userId: string, postId: string): Promise<Post> {
    try {
      const post = await this.postRepository.findOne({
        where: { id: postId },
        relations: ['user'],
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      if (post.userId !== userId) {
        throw new ForbiddenException('You can only archive your own posts');
      }

      post.isArchived = true;
      const updatedPost = await this.postRepository.save(post);

      // Invalidate cache
      await this.cachingService.invalidateByTags('post', `post:${postId}`, `user:${userId}:posts`);

      this.loggingService.log('Post archived', 'PostsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: { postId },
      });

      return updatedPost;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error archiving post',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to archive post');
    }
  }

  /**
   * Unarchive a post
   */
  async unarchivePost(userId: string, postId: string): Promise<Post> {
    try {
      const post = await this.postRepository.findOne({
        where: { id: postId },
        relations: ['user'],
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      if (post.userId !== userId) {
        throw new ForbiddenException('You can only unarchive your own posts');
      }

      post.isArchived = false;
      const updatedPost = await this.postRepository.save(post);

      // Invalidate cache
      await this.cachingService.invalidateByTags('post', `post:${postId}`, `user:${userId}:posts`);

      this.loggingService.log('Post unarchived', 'PostsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: { postId },
      });

      return updatedPost;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error unarchiving post',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to unarchive post');
    }
  }

  // #########################################################
  // SCHEDULING OPTIONS
  // #########################################################

  /**
   * Schedule a post for future publication
   */
  async schedulePost(
    userId: string,
    postId: string,
    scheduledDate: Date,
  ): Promise<Post> {
    try {
      const post = await this.postRepository.findOne({
        where: { id: postId },
        relations: ['user'],
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      if (post.userId !== userId) {
        throw new ForbiddenException('You can only schedule your own posts');
      }

      if (scheduledDate <= new Date()) {
        throw new BadRequestException('Scheduled date must be in the future');
      }

      post.scheduledDate = scheduledDate;
      post.isDraft = true; // Mark as draft until scheduled time
      const updatedPost = await this.postRepository.save(post);

      // Invalidate cache
      await this.cachingService.invalidateByTags('post', `post:${postId}`, `user:${userId}:posts`);

      this.loggingService.log('Post scheduled', 'PostsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: { postId, scheduledDate },
      });

      return updatedPost;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error scheduling post',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to schedule post');
    }
  }

  // #########################################################
  // ANALYTICS OPTIONS
  // #########################################################

  /**
   * Get post analytics
   */
  async getPostAnalytics(
    userId: string,
    postId: string,
  ): Promise<{
    post: Post;
    engagementRate: number;
    totalEngagements: number;
    reactionsBreakdown: Record<string, number>;
  }> {
    try {
      const post = await this.postRepository.findOne({
        where: { id: postId },
        relations: ['user'],
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      if (post.userId !== userId) {
        throw new ForbiddenException('You can only view analytics for your own posts');
      }

      // Get reactions breakdown
      const reactions = await this.reactionRepository.find({
        where: { postId },
      });

      const reactionsBreakdown: Record<string, number> = {
        like: 0,
        love: 0,
        laugh: 0,
        wow: 0,
        sad: 0,
        angry: 0,
      };

      reactions.forEach((reaction) => {
        reactionsBreakdown[reaction.reactionType] =
          (reactionsBreakdown[reaction.reactionType] || 0) + 1;
      });

      const totalEngagements =
        post.likesCount +
        post.commentsCount +
        post.sharesCount +
        reactions.length;

      const engagementRate =
        post.viewsCount > 0
          ? (totalEngagements / post.viewsCount) * 100
          : 0;

      return {
        post,
        engagementRate: Math.round(engagementRate * 100) / 100,
        totalEngagements,
        reactionsBreakdown,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error getting post analytics',
        error instanceof Error ? error.stack : undefined,
        'PostsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to get post analytics');
    }
  }
}
