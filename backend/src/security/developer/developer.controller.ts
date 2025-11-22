import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { DeveloperService } from './developer.service';
import {
  RegisterDeveloperDto,
  CreateApplicationDto,
  UpdateApplicationDto,
} from './assets/dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { Application } from './assets/entities/application.entity';

@ApiTags('Developer Management')
@Controller('developer')
@UseGuards(AuthGuard, AdminGuard)
@ApiBearerAuth()
export class DeveloperController {
  constructor(private readonly developerService: DeveloperService) {}

  // #########################################################
  // DEVELOPER REGISTRATION
  // #########################################################

  @Get('status')
  @ApiOperation({
    summary: 'Check developer status and requirements',
    description:
      'Check if the current user meets developer registration requirements',
  })
  @ApiResponse({
    status: 200,
    description: 'Developer status and requirements',
  })
  async getDeveloperStatus(@CurrentUser() user: User) {
    return this.developerService.checkDeveloperRequirements(user.id);
  }

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Register as developer',
    description:
      'Register the current user as a developer. Requires meeting all requirements and accepting terms.',
  })
  @ApiBody({ type: RegisterDeveloperDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully registered as developer',
  })
  @ApiResponse({
    status: 400,
    description: 'Requirements not met or already a developer',
  })
  async registerDeveloper(
    @CurrentUser() user: User,
    @Body() registerDto: RegisterDeveloperDto,
  ) {
    return this.developerService.registerDeveloper(user.id, registerDto);
  }

  // #########################################################
  // APPLICATION MANAGEMENT
  // #########################################################

  @Get('apps')
  @ApiOperation({
    summary: 'List developer applications',
    description: 'Get all applications for the current developer (max 2)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of applications',
    type: [Application],
  })
  async getApplications(@CurrentUser() user: User) {
    return this.developerService.getApplications(user.id);
  }

  @Get('apps/production')
  @ApiOperation({
    summary: 'Get production application',
    description: 'Get the production application if it exists',
  })
  @ApiResponse({
    status: 200,
    description: 'Production application',
    type: Application,
  })
  @ApiResponse({
    status: 404,
    description: 'Production application not found',
  })
  async getProductionApplication(@CurrentUser() user: User) {
    const app = await this.developerService.getProductionApplication(user.id);
    if (!app) {
      throw new NotFoundException('Production application not found');
    }
    return app;
  }

  @Get('apps/development')
  @ApiOperation({
    summary: 'Get development application',
    description: 'Get the development application if it exists',
  })
  @ApiResponse({
    status: 200,
    description: 'Development application',
    type: Application,
  })
  @ApiResponse({
    status: 404,
    description: 'Development application not found',
  })
  async getDevelopmentApplication(@CurrentUser() user: User) {
    const app = await this.developerService.getDevelopmentApplication(user.id);
    if (!app) {
      throw new NotFoundException('Development application not found');
    }
    return app;
  }

  @Post('apps')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new application',
    description:
      'Create a new application. Maximum 2 applications per developer (1 Production + 1 Development). Development apps are auto-approved, Production apps require admin approval.',
  })
  @ApiBody({ type: CreateApplicationDto })
  @ApiResponse({
    status: 201,
    description: 'Application created successfully',
    schema: {
      type: 'object',
      properties: {
        application: { type: 'object' },
        clientSecret: {
          type: 'string',
          description: 'Client secret (shown only once)',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Application limit reached or validation failed',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not a developer',
  })
  async createApplication(
    @CurrentUser() user: User,
    @Body() createDto: CreateApplicationDto,
  ) {
    return this.developerService.createApplication(user.id, createDto);
  }

  @Get('apps/:id')
  @ApiOperation({
    summary: 'Get application details',
    description: 'Get details of a specific application',
  })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({
    status: 200,
    description: 'Application details',
    type: Application,
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied',
  })
  async getApplication(
    @CurrentUser() user: User,
    @Param('id') applicationId: string,
  ) {
    return this.developerService.getApplication(applicationId, user.id);
  }

  @Patch('apps/:id')
  @ApiOperation({
    summary: 'Update application',
    description:
      'Update application details. Cannot change environment. Production apps in PENDING status can be updated before approval.',
  })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiBody({ type: UpdateApplicationDto })
  @ApiResponse({
    status: 200,
    description: 'Application updated successfully',
    type: Application,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or cannot change environment',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied',
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found',
  })
  async updateApplication(
    @CurrentUser() user: User,
    @Param('id') applicationId: string,
    @Body() updateDto: UpdateApplicationDto,
  ) {
    return this.developerService.updateApplication(
      applicationId,
      user.id,
      updateDto,
    );
  }

  @Delete('apps/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete application',
    description:
      'Delete an application. After deletion, you can upload a new one (still limited to max 2 total).',
  })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({
    status: 204,
    description: 'Application deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied',
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found',
  })
  async deleteApplication(
    @CurrentUser() user: User,
    @Param('id') applicationId: string,
  ) {
    await this.developerService.deleteApplication(applicationId, user.id);
  }

  @Post('apps/:id/regenerate-secret')
  @ApiOperation({
    summary: 'Regenerate client secret',
    description:
      'Regenerate the client secret for an application. The old secret will be invalidated. New secret is shown only once.',
  })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({
    status: 200,
    description: 'Client secret regenerated',
    schema: {
      type: 'object',
      properties: {
        clientSecret: {
          type: 'string',
          description: 'New client secret (shown only once)',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied',
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found',
  })
  async regenerateSecret(
    @CurrentUser() user: User,
    @Param('id') applicationId: string,
  ) {
    return this.developerService.regenerateClientSecret(applicationId, user.id);
  }
}
