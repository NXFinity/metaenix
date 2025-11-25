import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminGuard } from 'src/security/auth/guards/admin.guard';
import { TrackingService } from './tracking.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@ApiTags('Administration | Tracking')
@Controller('admin/tracking')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get('activity')
  @ApiOperation({
    summary: 'Get recent platform activity',
    description: 'Returns recent user registrations and content creation activity',
  })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to look back (default: 7)' })
  @ApiResponse({
    status: 200,
    description: 'Activity retrieved successfully',
  })
  getActivity(
    @Query() paginationDto: PaginationDto,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 7;
    return this.trackingService.getActivity(paginationDto, daysNum);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get platform statistics',
    description: 'Returns platform-wide statistics for dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  getStats() {
    return this.trackingService.getStats();
  }

  @Get('logs/system')
  @ApiOperation({
    summary: 'Get system logs',
    description: 'Returns paginated system logs',
  })
  @ApiQuery({ name: 'level', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'System logs retrieved successfully',
  })
  getSystemLogs(
    @Query() paginationDto: PaginationDto,
    @Query('level') level?: string,
  ) {
    return this.trackingService.getSystemLogs(paginationDto, level);
  }

  @Get('logs/errors')
  @ApiOperation({
    summary: 'Get error logs',
    description: 'Returns paginated error logs',
  })
  @ApiResponse({
    status: 200,
    description: 'Error logs retrieved successfully',
  })
  getErrorLogs(@Query() paginationDto: PaginationDto) {
    return this.trackingService.getErrorLogs(paginationDto);
  }

  @Get('logs/export')
  @ApiOperation({
    summary: 'Export logs',
    description: 'Exports logs in CSV or JSON format',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'json'],
    description: 'Export format (default: json)',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['system', 'error', 'audit'],
    description: 'Log type to export',
  })
  @ApiResponse({
    status: 200,
    description: 'Logs exported successfully',
  })
  exportLogs(
    @Query('format') format?: 'csv' | 'json',
    @Query('type') type?: 'system' | 'error' | 'audit',
  ) {
    return this.trackingService.exportLogs(format || 'json', type);
  }
}
