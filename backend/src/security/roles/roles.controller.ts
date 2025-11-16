import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { RoleGuard } from './assets/guard/role.guard';
import { Roles } from './assets/decorator/role.decorator';
import { CheckPermission } from './assets/decorators/check-permission.decorator';
import { ROLE } from './assets/enum/role.enum';
import { Permission } from './assets/enum/permission.enum';

@ApiTags('Security Management | Roles & Permissions')
@Controller('roles')
@UseGuards(RoleGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles(ROLE.Administrator, ROLE.Founder, ROLE.Chief_Executive)
  @ApiOperation({ summary: 'Get all available roles' })
  @ApiResponse({
    status: 200,
    description: 'List of all roles',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  getAllRoles() {
    return {
      roles: this.rolesService.getAllRoles(),
    };
  }

  @Get('permissions')
  @CheckPermission(Permission.ROLE_READ)
  @ApiOperation({ summary: 'Get all available permissions' })
  @ApiResponse({
    status: 200,
    description: 'List of all permissions',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  getAllPermissions() {
    return {
      permissions: this.rolesService.getAllPermissions(),
    };
  }

  @Get('permissions/:role')
  @CheckPermission(Permission.ROLE_READ)
  @ApiOperation({ summary: 'Get permissions for a specific role' })
  @ApiResponse({
    status: 200,
    description: 'Permissions for the role',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  getRolePermissions(@Param('role') role: ROLE) {
    return {
      role,
      permissions: this.rolesService.getRolePermissions(role),
    };
  }
}
