import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminGuard } from 'src/security/auth/guards/admin.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('Administration | Analytics')
@Controller('admin/analytics')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get platform-wide analytics overview',
    description: 'Returns high-level platform metrics for admin dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics overview retrieved successfully',
  })
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('users')
  @ApiOperation({
    summary: 'Get user analytics',
    description: 'Returns user growth, retention, and activity metrics',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to analyze (default: 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'User analytics retrieved successfully',
  })
  getUserAnalytics(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.analyticsService.getUserAnalytics(daysNum);
  }

  @Get('content')
  @ApiOperation({
    summary: 'Get content analytics',
    description: 'Returns content statistics for posts, videos, and photos',
  })
  @ApiResponse({
    status: 200,
    description: 'Content analytics retrieved successfully',
  })
  getContentAnalytics() {
    return this.analyticsService.getContentAnalytics();
  }

  @Get('engagement')
  @ApiOperation({
    summary: 'Get engagement metrics',
    description: 'Returns platform-wide engagement metrics (likes, comments, shares, views)',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to analyze (default: 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'Engagement metrics retrieved successfully',
  })
  getEngagementMetrics(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.analyticsService.getEngagementMetrics(daysNum);
  }

  @Get('reports')
  @ApiOperation({
    summary: 'Get report analytics',
    description: 'Returns moderation metrics and report statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Report analytics retrieved successfully',
  })
  getReportAnalytics() {
    return this.analyticsService.getReportAnalytics();
  }

  @Get('growth')
  @ApiOperation({
    summary: 'Get growth metrics',
    description: 'Returns growth metrics for users, content, and engagement',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to analyze (default: 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'Growth metrics retrieved successfully',
  })
  getGrowthMetrics(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.analyticsService.getGrowthMetrics(daysNum);
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export analytics data',
    description: 'Exports analytics data in CSV or JSON format',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'json'],
    description: 'Export format (default: json)',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics data exported successfully',
  })
  async exportAnalytics(
    @Query('format') format: 'csv' | 'json' = 'json',
  ) {
    const overview = await this.analyticsService.getOverview();
    const userAnalytics = await this.analyticsService.getUserAnalytics(30);
    const contentAnalytics = await this.analyticsService.getContentAnalytics();
    const engagementMetrics = await this.analyticsService.getEngagementMetrics(30);
    const reportAnalytics = await this.analyticsService.getReportAnalytics();

    const data = {
      overview,
      userAnalytics,
      contentAnalytics,
      engagementMetrics,
      reportAnalytics,
      exportedAt: new Date().toISOString(),
    };

    if (format === 'csv') {
      // Simple CSV conversion (in production, use a proper CSV library)
      return {
        data: JSON.stringify(data, null, 2),
        format: 'csv',
        filename: `analytics-export-${new Date().toISOString().split('T')[0]}.csv`,
      };
    }

    return {
      data,
      format: 'json',
      filename: `analytics-export-${new Date().toISOString().split('T')[0]}.json`,
    };
  }
}
