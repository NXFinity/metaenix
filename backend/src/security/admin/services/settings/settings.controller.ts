import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminGuard } from 'src/security/auth/guards/admin.guard';
import { CurrentUser } from 'src/security/auth/decorators/currentUser.decorator';
import { User } from 'src/rest/api/users/assets/entities/user.entity';
import { SettingsService } from './settings.service';

@ApiTags('Administration | Settings')
@Controller('admin/settings')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get system settings',
    description: 'Returns current system configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Settings retrieved successfully',
  })
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @ApiOperation({
    summary: 'Update system settings',
    description: 'Update system-wide configuration',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        maintenanceMode: { type: 'boolean' },
        registrationEnabled: { type: 'boolean' },
        maxFileSize: { type: 'number' },
        allowedFileTypes: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Settings updated successfully',
  })
  updateSettings(
    @CurrentUser() user: User,
    @Body() settings: Record<string, any>,
  ) {
    return this.settingsService.updateSettings(settings, user.id);
  }

  @Get('feature-flags')
  @ApiOperation({
    summary: 'Get feature flags',
    description: 'Returns current feature flag configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Feature flags retrieved successfully',
  })
  getFeatureFlags() {
    return this.settingsService.getFeatureFlags();
  }

  @Patch('feature-flags/:flag')
  @ApiOperation({
    summary: 'Update feature flag',
    description: 'Enable or disable a specific feature flag',
  })
  @ApiParam({ name: 'flag', description: 'Feature flag name' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Feature flag updated successfully',
  })
  updateFeatureFlag(
    @CurrentUser() user: User,
    @Param('flag') flag: string,
    @Body('enabled') enabled: boolean,
  ) {
    return this.settingsService.updateFeatureFlag(flag, enabled, user.id);
  }

  @Get('rate-limits')
  @ApiOperation({
    summary: 'Get rate limit configurations',
    description: 'Returns current rate limit settings',
  })
  @ApiResponse({
    status: 200,
    description: 'Rate limits retrieved successfully',
  })
  getRateLimits() {
    return this.settingsService.getRateLimits();
  }

  @Patch('rate-limits')
  @ApiOperation({
    summary: 'Update rate limit configurations',
    description: 'Update rate limiting settings',
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          ttl: { type: 'number' },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Rate limits updated successfully',
  })
  updateRateLimits(
    @CurrentUser() user: User,
    @Body() limits: Record<string, { limit: number; ttl: number }>,
  ) {
    return this.settingsService.updateRateLimits(limits, user.id);
  }

  @Get('cache')
  @ApiOperation({
    summary: 'Get cache status',
    description: 'Returns cache statistics and status',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache status retrieved successfully',
  })
  getCacheStatus() {
    return this.settingsService.getCacheStatus();
  }

  @Post('cache/clear')
  @ApiOperation({
    summary: 'Clear cache',
    description: 'Clear all cached data',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache cleared successfully',
  })
  clearCache(@CurrentUser() user: User) {
    return this.settingsService.clearCache(user.id);
  }
}
