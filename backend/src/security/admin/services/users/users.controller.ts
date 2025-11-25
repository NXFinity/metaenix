import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UnauthorizedException,
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
import { UpdateUserDto } from 'src/rest/api/users/assets/dto/createUser.dto';
import { UsersService } from './users.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@ApiTags('Administration | Users')
@Controller('admin/users')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  // #########################################################
  // USER MANAGEMENT
  // #########################################################

  @Patch(':id')
  @ApiOperation({
    summary: 'Update user by ID (admin only)',
    description:
      'Updates any user by their ID. Administrator privileges required. Only provided fields will be updated.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the user to update',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        username: { type: 'string', example: 'johndoe' },
        displayName: { type: 'string', example: 'John Doe' },
        email: { type: 'string', example: 'john.doe@example.com' },
        role: { type: 'string', example: 'Member' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Validation failed or field already taken',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['Username is already taken'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Administrator privileges required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['Access denied. Administrator privileges required.'],
        },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'User with id 123e4567-e89b-12d3-a456-426614174000 not found',
          ],
        },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateUser(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete user by ID (admin only)',
    description:
      'Permanently deletes a user account and all associated data by ID (hard delete). Administrator privileges required. This action cannot be undone.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the user to delete',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Administrator privileges required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['Access denied. Administrator privileges required.'],
        },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'User with id 123e4567-e89b-12d3-a456-426614174000 not found',
          ],
        },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  deleteUser(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

  // #########################################################
  // FOLLOWS MANAGEMENT
  // #########################################################

  @Delete(':id/cooldown/:followingId')
  @ApiOperation({ summary: 'Clear follow cooldown (admin only)' })
  @ApiParam({ name: 'id', description: 'Follower User ID' })
  @ApiParam({ name: 'followingId', description: 'Following User ID' })
  @ApiResponse({
    status: 200,
    description: 'Cooldown cleared successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (admin only)' })
  clearCooldown(
    @CurrentUser() user: User,
    @Param('id') followerId: string,
    @Param('followingId') followingId: string,
  ) {
    const currentUserId = user?.id;
    if (!currentUserId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.usersService.clearCooldown(followerId, followingId);
  }

  // #########################################################
  // USER SEARCH & DETAILS
  // #########################################################

  @Get('search')
  @ApiOperation({
    summary: 'Search users (admin only)',
    description: 'Search users by username, email, or display name',
  })
  @ApiQuery({ name: 'q', description: 'Search query', required: false })
  @ApiResponse({
    status: 200,
    description: 'Users found successfully',
  })
  searchUsers(
    @Query('q') query?: string,
    @Query() paginationDto?: PaginationDto,
  ) {
    return this.usersService.searchUsers(query || '', paginationDto || {});
  }

  @Get(':id/details')
  @ApiOperation({
    summary: 'Get full admin view of user (admin only)',
    description: 'Returns complete user information including private data and security info',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserDetails(@Param('id') id: string) {
    return this.usersService.getUserDetails(id);
  }

  // #########################################################
  // USER MODERATION
  // #########################################################

  @Post(':id/ban')
  @ApiOperation({
    summary: 'Ban a user (admin only)',
    description: 'Permanently ban a user account',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string' },
        bannedUntil: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User banned successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  banUser(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Body('bannedUntil') bannedUntil?: string,
  ) {
    const bannedUntilDate = bannedUntil ? new Date(bannedUntil) : undefined;
    return this.usersService.banUser(id, reason, bannedUntilDate, user.id);
  }

  @Post(':id/unban')
  @ApiOperation({
    summary: 'Unban a user (admin only)',
    description: 'Remove ban from a user account',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User unbanned successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  unbanUser(@CurrentUser() user: User, @Param('id') id: string) {
    return this.usersService.unbanUser(id, user.id);
  }

  @Post(':id/timeout')
  @ApiOperation({
    summary: 'Timeout a user (admin only)',
    description: 'Temporarily ban a user for a specified duration',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string' },
        timedOutUntil: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User timed out successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  timeoutUser(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Body('timedOutUntil') timedOutUntil: string,
  ) {
    return this.usersService.timeoutUser(id, reason, new Date(timedOutUntil), user.id);
  }

  // #########################################################
  // USER ACTIVITY & ROLE
  // #########################################################

  @Get(':id/activity')
  @ApiOperation({
    summary: 'Get user activity logs (admin only)',
    description: 'Returns activity logs for a specific user',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User activity retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserActivity(
    @Param('id') id: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.usersService.getUserActivity(id, paginationDto);
  }

  @Patch(':id/role')
  @ApiOperation({
    summary: 'Change user role (admin only)',
    description: 'Update a user\'s role (Member, Moderator, Admin, Developer)',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['Member', 'Moderator', 'Admin', 'Developer'] },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User role updated successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  changeUserRole(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('role') role: string,
  ) {
    return this.usersService.changeUserRole(id, role, user.id);
  }

  // #########################################################
  // USER STATISTICS
  // #########################################################

  @Get('stats')
  @ApiOperation({
    summary: 'Get user statistics (admin only)',
    description: 'Returns platform-wide user statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
  })
  getUserStats() {
    return this.usersService.getUserStats();
  }
}
