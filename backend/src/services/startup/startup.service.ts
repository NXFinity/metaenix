import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { CachingService } from '@caching/caching';
import { UsersService } from '../../rest/api/users/users.service';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { ROLE } from '../../security/roles/assets/enum/role.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Post } from '../../rest/api/users/services/posts/assets/entities/post.entity';

@Injectable()
export class StartupService implements OnModuleInit {
  private readonly logger = new Logger(StartupService.name);

  constructor(
    private readonly cachingService: CachingService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly loggingService: LoggingService,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  async onModuleInit() {
    // Wait a bit for all modules to be fully initialized
    setTimeout(async () => {
      await this.warmCache();
    }, 2000);
  }

  /**
   * Warm cache with frequently accessed users
   */
  private async warmCache(): Promise<void> {
    this.logger.log('Starting cache warming...');

    try {
      const tasks: Promise<void>[] = [];

      // Warm system user cache
      const systemEmail = this.configService.get<string>('SYSTEM_EMAIL');
      const systemUsername = this.configService.get<string>('SYSTEM_USERNAME');

      if (systemEmail) {
        tasks.push(this.warmUserByEmail(systemEmail, 'system user'));
      }

      if (systemUsername && systemUsername !== systemEmail) {
        tasks.push(this.warmUserByUsername(systemUsername, 'system user'));
      }

      // Warm admin users cache
      tasks.push(this.warmAdminUsers());

      await Promise.allSettled(tasks);

      this.logger.log('Cache warming completed');
    } catch (error) {
      this.loggingService.error(
        'Error during cache warming',
        error instanceof Error ? error.stack : undefined,
        'StartupService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      this.logger.warn('Cache warming failed, but application will continue');
    }
  }

  /**
   * Warm cache for a user by email
   */
  private async warmUserByEmail(
    email: string,
    label: string,
  ): Promise<void> {
    try {
      const user = await this.usersService.findByEmail(email);
      if (user) {
        this.logger.debug(`Cache warmed for ${label} (email: ${email})`);
      }
    } catch (error) {
      // User might not exist yet, which is fine
      this.logger.debug(
        `Could not warm cache for ${label} (email: ${email}): ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Warm cache for a user by username
   */
  private async warmUserByUsername(
    username: string,
    label: string,
  ): Promise<void> {
    try {
      const user = await this.usersService.findByUsername(username);
      if (user) {
        this.logger.debug(`Cache warmed for ${label} (username: ${username})`);
      }
    } catch (error) {
      // User might not exist yet, which is fine
      this.logger.debug(
        `Could not warm cache for ${label} (username: ${username}): ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Warm cache for admin users
   */
  private async warmAdminUsers(): Promise<void> {
    try {
      // Get paginated list of admin users
      const adminRoles = [
        ROLE.Administrator,
        ROLE.Founder,
        ROLE.Chief_Executive,
      ];

      const result = await this.usersService.findAll({
        page: 1,
        limit: 50, // Limit to first 50 admin users
        sortBy: 'dateCreated',
        sortOrder: 'ASC',
      });

      // Filter admin users and warm their cache
      const adminUsers = result.data.filter((user) =>
        adminRoles.includes(user.role),
      );

      const warmTasks = adminUsers.map(async (user) => {
        try {
          // Warm cache by ID (which will also cache by username and email)
          await this.usersService.findOne(user.id);
          this.logger.debug(`Cache warmed for admin user: ${user.username}`);
        } catch (error) {
          // Ignore individual failures
          this.logger.debug(
            `Could not warm cache for admin user ${user.username}`,
          );
        }
      });

      await Promise.allSettled(warmTasks);

      if (adminUsers.length > 0) {
        this.logger.log(`Cache warmed for ${adminUsers.length} admin users`);
      }
    } catch (error) {
      this.logger.warn(
        `Could not warm admin users cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Publish scheduled posts (runs every minute)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async publishScheduledPosts(): Promise<void> {
    try {
      const now = new Date();
      const scheduledPosts = await this.postRepository.find({
        where: {
          isDraft: true,
          scheduledDate: LessThanOrEqual(now),
        },
      });

      if (scheduledPosts.length === 0) {
        return;
      }

      for (const post of scheduledPosts) {
        post.isDraft = false;
        post.scheduledDate = null;
        await this.postRepository.save(post);

        // Invalidate cache
        await this.cachingService.invalidateByTags(
          'post',
          `post:${post.id}`,
          `user:${post.userId}:posts`,
        );

        this.loggingService.log('Scheduled post published', 'StartupService', {
          category: LogCategory.USER_MANAGEMENT,
          userId: post.userId,
          metadata: { postId: post.id },
        });
      }

      this.logger.log(`Published ${scheduledPosts.length} scheduled post(s)`);
    } catch (error) {
      this.loggingService.error(
        'Error publishing scheduled posts',
        error instanceof Error ? error.stack : undefined,
        'StartupService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
    }
  }
}

