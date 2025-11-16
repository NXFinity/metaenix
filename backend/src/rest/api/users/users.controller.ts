import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './assets/dto/createUser.dto';
import { AuthenticatedRequest } from '../../../common/interfaces/authenticated-request.interface';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminGuard } from '../../../security/auth/guards/admin.guard';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { Public } from '../../../security/auth/decorators/public.decorator';
import { RequireScope } from '../../../security/developer/services/scopes/decorators/require-scope.decorator';

@ApiTags('Account Management | Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // #########################################################
  // CREATE OPTIONS - ALWAYS AT THE TOP
  // #########################################################

  // @Post()
  // create(@Body() createUserDto: CreateUserDto) {
  //   return this.usersService.create(createUserDto);
  // }

  // #########################################################
  // FIND OPTIONS - AFTER CREATE
  // #########################################################

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all users with pagination',
    description:
      'Returns paginated list of users. Supports pagination with page, limit, sortBy, and sortOrder query parameters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of users',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { type: 'object' },
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            total: { type: 'number', example: 100 },
            totalPages: { type: 'number', example: 10 },
            hasNextPage: { type: 'boolean', example: true },
            hasPreviousPage: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Administrator privileges required',
  })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.usersService.findAll(paginationDto);
  }

  @Get('me')
  @RequireScope('read:profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current authenticated user with full access',
    description:
      'Retrieves the complete profile, privacy, and security details of the currently authenticated user. Requires authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        username: { type: 'string', example: 'johndoe' },
        displayName: { type: 'string', example: 'John Doe' },
        email: { type: 'string', example: 'john.doe@example.com' },
        websocketId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174001',
        },
        role: { type: 'string', example: 'Member' },
        isPublic: { type: 'boolean', example: true },
        dateCreated: { type: 'string', format: 'date-time' },
        profile: {
          type: 'object',
          properties: {
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            bio: { type: 'string', example: 'Software developer' },
            location: { type: 'string', example: 'New York, USA' },
            website: { type: 'string', example: 'https://johndoe.com' },
          },
        },
        privacy: {
          type: 'object',
          properties: {
            isFollowerOnly: { type: 'boolean', example: false },
            isSubscriberOnly: { type: 'boolean', example: false },
            allowMessages: { type: 'boolean', example: true },
          },
        },
        security: {
          type: 'object',
          properties: {
            isVerified: { type: 'boolean', example: true },
            isTwoFactorEnabled: { type: 'boolean', example: false },
            isBanned: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - User not logged in',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['Unauthorized'],
        },
        error: { type: 'string', example: 'Unauthorized' },
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
  getMe(@Req() request: AuthenticatedRequest) {
    const userId = request.user?.id || request.session?.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not found in session');
    }
    return this.usersService.getMe(userId);
  }

  @Public()
  @RequireScope('read:profile') // Required for OAuth tokens accessing private profiles
  @Get('username/:username')
  @ApiOperation({
    summary: 'Find user by username (public profile)',
    description:
      'Retrieves a user profile by username. Returns public profile information.',
  })
  @ApiParam({
    name: 'username',
    description: 'Username of the user to find',
    example: 'johndoe',
  })
  @ApiResponse({
    status: 200,
    description: 'User found successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        username: { type: 'string', example: 'johndoe' },
        displayName: { type: 'string', example: 'John Doe' },
        email: { type: 'string', example: 'john.doe@example.com' },
        role: { type: 'string', example: 'Member' },
        isPublic: { type: 'boolean', example: true },
        dateCreated: { type: 'string', format: 'date-time' },
        profile: {
          type: 'object',
          properties: {
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            bio: { type: 'string', example: 'Software developer' },
          },
        },
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
          example: ['User with username johndoe not found'],
        },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  findByUsername(@Param('username') username: string) {
    return this.usersService.findByUsername(username);
  }

  @Public()
  @RequireScope('read:profile') // Required for OAuth tokens accessing private profiles
  @Get(':id')
  @ApiOperation({
    summary: 'Find user by ID',
    description: 'Retrieves a user profile by their unique ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the user',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'User found successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        username: { type: 'string', example: 'johndoe' },
        displayName: { type: 'string', example: 'John Doe' },
        email: { type: 'string', example: 'john.doe@example.com' },
        role: { type: 'string', example: 'Member' },
        isPublic: { type: 'boolean', example: true },
        dateCreated: { type: 'string', format: 'date-time' },
        profile: {
          type: 'object',
          properties: {
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
          },
        },
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
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  // #########################################################
  // UPDATE OPTIONS - AFTER FIND OPTIONS
  // #########################################################

  @Patch('me')
  @RequireScope('write:profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update current authenticated user',
    description:
      'Updates the profile, privacy settings, or basic information of the currently authenticated user. Only provided fields will be updated. Requires authentication.',
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
        isPublic: { type: 'boolean', example: true },
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
    status: 401,
    description: 'Unauthorized - User not logged in',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['Unauthorized'],
        },
        error: { type: 'string', example: 'Unauthorized' },
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
          example: ['User not found'],
        },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  updateMe(
    @Req() request: AuthenticatedRequest,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const userId = request.user?.id || request.session?.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not found in session');
    }
    return this.usersService.updateUser(userId, updateUserDto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
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

  // #########################################################
  // DELETE OPTIONS - AFTER UPDATE OPTIONS - ALWAYS AT END
  // #########################################################

  @Delete('me')
  @RequireScope('write:account')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete current authenticated user account',
    description:
      'Permanently deletes the currently authenticated user account and all associated data (hard delete). This action cannot be undone. Requires authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'User account deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'User account deleted successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - User not logged in',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['Unauthorized'],
        },
        error: { type: 'string', example: 'Unauthorized' },
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
          example: ['User not found'],
        },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  deleteMe(@Req() request: AuthenticatedRequest) {
    const userId = request.user?.id || request.session?.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not found in session');
    }
    return this.usersService.delete(userId);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
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
}
