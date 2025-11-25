import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { Report } from './assets/entities/report.entity';
import { ReportResourceType } from './assets/enum/resource-type.enum';
import { ReportStatus } from './assets/enum/report-status.enum';
import { CreateReportDto } from './assets/dto/create-report.dto';
import { UpdateReportStatusDto } from './assets/dto/update-report-status.dto';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { Post } from '../../rest/api/users/services/posts/assets/entities/post.entity';
import { Video } from '../../rest/api/users/services/videos/assets/entities/video.entity';
import { Photo } from '../../rest/api/users/services/photos/assets/entities/photo.entity';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  PaginationResponse,
  PaginationMeta,
} from '../../common/interfaces/pagination-response.interface';
import { ReportingGateway } from './reporting.gateway';
import { NotificationsService } from '../../rest/api/users/services/notifications/notifications.service';
import { NotificationType } from '../../rest/api/users/services/notifications/assets/enum/notification-type.enum';
import { ROLE } from '../../security/roles/assets/enum/role.enum';

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(Photo)
    private readonly photoRepository: Repository<Photo>,
    private readonly loggingService: LoggingService,
    private readonly reportingGateway: ReportingGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Validate that a resource exists and is not deleted
   */
  private async validateResource(
    resourceType: ReportResourceType,
    resourceId: string,
  ): Promise<{ exists: boolean; ownerId?: string }> {
    try {
      switch (resourceType) {
        case ReportResourceType.POST:
          const post = await this.postRepository.findOne({
            where: { id: resourceId, dateDeleted: IsNull() },
            select: ['id', 'userId'],
          });
          if (!post) {
            return { exists: false };
          }
          return {
            exists: true,
            ownerId: post.userId,
          };

        case ReportResourceType.VIDEO:
          const video = await this.videoRepository.findOne({
            where: { id: resourceId, dateDeleted: IsNull() },
            select: ['id', 'userId'],
          });
          if (!video) {
            return { exists: false };
          }
          return {
            exists: true,
            ownerId: video.userId,
          };

        case ReportResourceType.PHOTO:
          const photo = await this.photoRepository.findOne({
            where: { id: resourceId, dateDeleted: IsNull() },
            select: ['id', 'userId'],
          });
          if (!photo) {
            return { exists: false };
          }
          return {
            exists: true,
            ownerId: photo.userId,
          };

        default:
          return { exists: false };
      }
    } catch (error) {
      this.loggingService.error(
        `Error validating resource: ${resourceType}:${resourceId}`,
        error instanceof Error ? error.stack : undefined,
        'ReportingService',
        {
          category: LogCategory.DATABASE,
          metadata: { resourceType, resourceId },
        },
      );
      return { exists: false };
    }
  }

  /**
   * Check if user has already reported this resource
   */
  private async hasUserReported(
    userId: string,
    resourceType: ReportResourceType,
    resourceId: string,
  ): Promise<boolean> {
    const existingReport = await this.reportRepository.findOne({
      where: {
        userId,
        resourceType,
        resourceId,
      },
    });

    return !!existingReport;
  }

  /**
   * Create a new report
   */
  async createReport(userId: string, createReportDto: CreateReportDto): Promise<Report> {
    try {
      // Validate user exists
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id'],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Validate resource exists
      const resourceValidation = await this.validateResource(
        createReportDto.resourceType,
        createReportDto.resourceId,
      );

      if (!resourceValidation.exists) {
        throw new NotFoundException(
          `${createReportDto.resourceType} with ID ${createReportDto.resourceId} not found`,
        );
      }

      // Prevent users from reporting their own content
      if (resourceValidation.ownerId === userId) {
        throw new BadRequestException('You cannot report your own content');
      }

      // Check if user has already reported this resource
      const alreadyReported = await this.hasUserReported(
        userId,
        createReportDto.resourceType,
        createReportDto.resourceId,
      );

      if (alreadyReported) {
        throw new ConflictException('You have already reported this content');
      }

      // Create the report
      const report = this.reportRepository.create({
        userId,
        resourceType: createReportDto.resourceType,
        resourceId: createReportDto.resourceId,
        reason: createReportDto.reason,
        description: createReportDto.description || null,
        status: ReportStatus.PENDING,
      });

      const savedReport = await this.reportRepository.save(report);

      // Get reporter info for notifications
      const reporter = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'username', 'displayName'],
      });

      // Update reportsCount on the resource
      await this.updateResourceReportsCount(
        createReportDto.resourceType,
        createReportDto.resourceId,
      );

      // Notify all administrators via WebSocket and create persistent notifications
      await this.notifyAdministrators(savedReport, reporter);

      // Log the report creation
      this.loggingService.log(
        `User ${userId} reported ${createReportDto.resourceType} ${createReportDto.resourceId}`,
        'ReportingService',
        {
          category: LogCategory.SECURITY,
          metadata: {
            userId,
            resourceType: createReportDto.resourceType,
            resourceId: createReportDto.resourceId,
            reason: createReportDto.reason,
            reportId: savedReport.id,
          },
        },
      );

      return savedReport;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      this.loggingService.error(
        `Error creating report: ${error}`,
        error instanceof Error ? error.stack : undefined,
        'ReportingService',
        {
          category: LogCategory.DATABASE,
          metadata: { userId, createReportDto },
        },
      );

      throw new InternalServerErrorException('Failed to create report');
    }
  }

  /**
   * Update report status (admin only)
   */
  async updateReportStatus(
    reportId: string,
    updateDto: UpdateReportStatusDto,
    reviewedBy: string,
  ): Promise<Report> {
    try {
      const report = await this.reportRepository.findOne({
        where: { id: reportId },
        relations: ['reporter'],
      });

      if (!report) {
        throw new NotFoundException('Report not found');
      }

      report.status = updateDto.status;
      report.reviewedBy = reviewedBy;
      report.reviewedAt = new Date();

      const updatedReport = await this.reportRepository.save(report);

      // Log the status update
      this.loggingService.log(
        `Report ${reportId} status updated to ${updateDto.status} by ${reviewedBy}`,
        'ReportingService',
        {
          category: LogCategory.SECURITY,
          metadata: {
            reportId,
            status: updateDto.status,
            reviewedBy,
            resourceType: report.resourceType,
            resourceId: report.resourceId,
          },
        },
      );

      return updatedReport;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        `Error updating report status: ${error}`,
        error instanceof Error ? error.stack : undefined,
        'ReportingService',
        {
          category: LogCategory.DATABASE,
          metadata: { reportId, updateDto, reviewedBy },
        },
      );

      throw new InternalServerErrorException('Failed to update report status');
    }
  }

  /**
   * Get reports with pagination and filters
   */
  async getReports(
    paginationDto: PaginationDto = {},
    filters?: {
      status?: ReportStatus;
      resourceType?: ReportResourceType;
      userId?: string;
    },
  ): Promise<PaginationResponse<Report>> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 20;
      const skip = (page - 1) * limit;

      const queryBuilder = this.reportRepository
        .createQueryBuilder('report')
        .leftJoinAndSelect('report.reporter', 'reporter')
        .orderBy('report.dateCreated', 'DESC');

      // Apply filters
      if (filters?.status) {
        queryBuilder.andWhere('report.status = :status', { status: filters.status });
      }

      if (filters?.resourceType) {
        queryBuilder.andWhere('report.resourceType = :resourceType', {
          resourceType: filters.resourceType,
        });
      }

      if (filters?.userId) {
        queryBuilder.andWhere('report.userId = :userId', { userId: filters.userId });
      }

      // Get total count
      const total = await queryBuilder.getCount();

      // Get paginated results
      const reports = await queryBuilder.skip(skip).take(limit).getMany();

      const totalPages = Math.ceil(total / limit);
      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      return { data: reports, meta };
    } catch (error) {
      this.loggingService.error(
        `Error getting reports: ${error}`,
        error instanceof Error ? error.stack : undefined,
        'ReportingService',
        {
          category: LogCategory.DATABASE,
          metadata: { paginationDto, filters },
        },
      );

      throw new InternalServerErrorException('Failed to get reports');
    }
  }

  /**
   * Get a single report by ID
   */
  async getReportById(reportId: string): Promise<Report> {
    try {
      const report = await this.reportRepository.findOne({
        where: { id: reportId },
        relations: ['reporter'],
      });

      if (!report) {
        throw new NotFoundException('Report not found');
      }

      return report;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        `Error getting report: ${error}`,
        error instanceof Error ? error.stack : undefined,
        'ReportingService',
        {
          category: LogCategory.DATABASE,
          metadata: { reportId },
        },
      );

      throw new InternalServerErrorException('Failed to get report');
    }
  }

  /**
   * Get reports for a specific resource
   */
  async getResourceReports(
    resourceType: ReportResourceType,
    resourceId: string,
    paginationDto: PaginationDto = {},
  ): Promise<PaginationResponse<Report>> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 20;
      const skip = (page - 1) * limit;

      const queryBuilder = this.reportRepository
        .createQueryBuilder('report')
        .leftJoinAndSelect('report.reporter', 'reporter')
        .where('report.resourceType = :resourceType', { resourceType })
        .andWhere('report.resourceId = :resourceId', { resourceId })
        .orderBy('report.dateCreated', 'DESC');

      // Get total count
      const total = await queryBuilder.getCount();

      // Get paginated results
      const reports = await queryBuilder.skip(skip).take(limit).getMany();

      const totalPages = Math.ceil(total / limit);
      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      return { data: reports, meta };
    } catch (error) {
      this.loggingService.error(
        `Error getting resource reports: ${error}`,
        error instanceof Error ? error.stack : undefined,
        'ReportingService',
        {
          category: LogCategory.DATABASE,
          metadata: { resourceType, resourceId, paginationDto },
        },
      );

      throw new InternalServerErrorException('Failed to get resource reports');
    }
  }

  /**
   * Update reportsCount on the resource
   */
  private async updateResourceReportsCount(
    resourceType: ReportResourceType,
    resourceId: string,
  ): Promise<void> {
    try {
      const count = await this.reportRepository.count({
        where: {
          resourceType,
          resourceId,
        },
      });

      switch (resourceType) {
        case ReportResourceType.POST:
          await this.postRepository.update(resourceId, { reportsCount: count });
          break;

        // Note: Video and Photo entities don't have reportsCount field
        // If needed, add reportsCount column to these entities in a migration
        case ReportResourceType.VIDEO:
          // await this.videoRepository.update(resourceId, { reportsCount: count });
          break;

        case ReportResourceType.PHOTO:
          // await this.photoRepository.update(resourceId, { reportsCount: count });
          break;
      }
    } catch (error) {
      this.loggingService.error(
        `Error updating resource reports count: ${error}`,
        error instanceof Error ? error.stack : undefined,
        'ReportingService',
        {
          category: LogCategory.DATABASE,
          metadata: { resourceType, resourceId },
        },
      );
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Notify all administrators about a new report
   */
  private async notifyAdministrators(
    report: Report,
    reporter: User | null,
  ): Promise<void> {
    try {
      // Get all admin users
      const adminRoles = [ROLE.Administrator, ROLE.Founder, ROLE.Chief_Executive];
      const adminUsers = await this.userRepository.find({
        where: {
          role: In(adminRoles),
          dateDeleted: IsNull(),
        },
        select: ['id', 'username', 'displayName'],
      });

      if (adminUsers.length === 0) {
        this.loggingService.log(
          'No administrators found to notify about new report',
          'ReportingService',
          {
            category: LogCategory.SECURITY,
            metadata: { reportId: report.id },
          },
        );
        return;
      }

      // Prepare report data for WebSocket notification
      const reportData = {
        id: report.id,
        resourceType: report.resourceType,
        resourceId: report.resourceId,
        reason: report.reason,
        reporterId: report.userId,
        reporterUsername: reporter?.username || reporter?.displayName || 'Unknown',
        timestamp: report.dateCreated.toISOString(),
      };

      // Send real-time WebSocket notification to all connected admins
      this.reportingGateway.notifyNewReport(reportData);

      // Create persistent notifications for all admins
      const resourceTypeLabel =
        report.resourceType.charAt(0).toUpperCase() + report.resourceType.slice(1);
      const reasonLabel = report.reason.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

      // Build action URL based on resource type
      let actionUrl = `/admin/content`;
      if (report.resourceType === 'post') {
        actionUrl = `/admin/content?tab=posts&reportId=${report.id}`;
      } else if (report.resourceType === 'video') {
        actionUrl = `/admin/content?tab=videos&reportId=${report.id}`;
      } else if (report.resourceType === 'photo') {
        actionUrl = `/admin/content?tab=photos&reportId=${report.id}`;
      }

      // Create notification for each admin
      const notificationPromises = adminUsers.map((admin) => {
        const notificationData: any = {
          type: NotificationType.CONTENT_REPORT,
          title: `New ${resourceTypeLabel} Report`,
          message: `${reporter?.username || reporter?.displayName || 'A user'} reported a ${report.resourceType} for: ${reasonLabel}`,
          metadata: {
            reportId: report.id,
            resourceType: report.resourceType,
            resourceId: report.resourceId,
            reason: report.reason,
            reporterId: report.userId,
            reporterUsername: reporter?.username || reporter?.displayName,
            description: report.description,
          },
          relatedUserId: report.userId,
          actionUrl,
        };

        // Use relatedPostId for posts, metadata for videos and photos
        if (report.resourceType === 'post') {
          notificationData.relatedPostId = report.resourceId;
        }

        return this.notificationsService.createNotification(admin.id, notificationData);
      });

      await Promise.all(notificationPromises);

      this.loggingService.log(
        `Notified ${adminUsers.length} administrator(s) about new report: ${report.id}`,
        'ReportingService',
        {
          category: LogCategory.SECURITY,
          metadata: {
            reportId: report.id,
            adminCount: adminUsers.length,
          },
        },
      );
    } catch (error) {
      // Don't throw - notification failure shouldn't break report creation
      this.loggingService.error(
        `Error notifying administrators about report: ${error}`,
        error instanceof Error ? error.stack : undefined,
        'ReportingService',
        {
          category: LogCategory.SECURITY,
          metadata: { reportId: report.id },
        },
      );
    }
  }
}
