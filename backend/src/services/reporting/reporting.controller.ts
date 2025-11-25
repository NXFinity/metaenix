import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { CreateReportDto } from './assets/dto/create-report.dto';
import { UpdateReportStatusDto } from './assets/dto/update-report-status.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AdminGuard } from '../../security/auth/guards/admin.guard';
import { CurrentUser } from '../../security/auth/decorators/currentUser.decorator';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { ReportResourceType } from './assets/enum/resource-type.enum';
import { ReportStatus } from './assets/enum/report-status.enum';

@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  /**
   * Create a new report
   * POST /reporting
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createReport(@CurrentUser() user: User, @Body() createReportDto: CreateReportDto) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.reportingService.createReport(userId, createReportDto);
  }

  /**
   * Get all reports (admin only)
   * GET /reporting
   */
  @Get()
  @UseGuards(AdminGuard)
  async getReports(
    @Query() paginationDto: PaginationDto,
    @Query('status') status?: ReportStatus,
    @Query('resourceType') resourceType?: ReportResourceType,
    @Query('userId') userId?: string,
  ) {
    return this.reportingService.getReports(paginationDto, {
      status,
      resourceType,
      userId,
    });
  }

  /**
   * Get a single report by ID (admin only)
   * GET /reporting/:id
   */
  @Get(':id')
  @UseGuards(AdminGuard)
  async getReportById(@Param('id') id: string) {
    return this.reportingService.getReportById(id);
  }

  /**
   * Get reports for a specific resource
   * GET /reporting/resource/:resourceType/:resourceId
   */
  @Get('resource/:resourceType/:resourceId')
  @UseGuards(AdminGuard)
  async getResourceReports(
    @Param('resourceType') resourceType: ReportResourceType,
    @Param('resourceId') resourceId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.reportingService.getResourceReports(resourceType, resourceId, paginationDto);
  }

  /**
   * Update report status (admin only)
   * PATCH /reporting/:id/status
   */
  @Patch(':id/status')
  @UseGuards(AdminGuard)
  async updateReportStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateReportStatusDto,
    @CurrentUser() user: User,
  ) {
    const reviewedBy = user?.id;
    if (!reviewedBy) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.reportingService.updateReportStatus(id, updateDto, reviewedBy);
  }
}
