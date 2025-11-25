import {
  Controller,
  Get,
  Delete,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
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
import { SecurityService } from './security.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@ApiTags('Administration | Security')
@Controller('admin/security')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('alerts')
  @ApiOperation({
    summary: 'Get security alerts',
    description: 'Returns active security alerts and threats',
  })
  @ApiResponse({
    status: 200,
    description: 'Security alerts retrieved successfully',
  })
  getAlerts() {
    return this.securityService.getAlerts();
  }

  @Get('events')
  @ApiOperation({
    summary: 'Get security events log',
    description: 'Returns paginated security events history',
  })
  @ApiQuery({ name: 'severity', required: false, enum: ['low', 'medium', 'high', 'critical'] })
  @ApiResponse({
    status: 200,
    description: 'Security events retrieved successfully',
  })
  getEvents(
    @Query() paginationDto: PaginationDto,
    @Query('severity') severity?: 'low' | 'medium' | 'high' | 'critical',
  ) {
    return this.securityService.getEvents(paginationDto, severity);
  }

  @Get('audit')
  @ApiOperation({
    summary: 'Get audit logs',
    description: 'Returns paginated audit logs for admin actions',
  })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
  })
  getAuditLogs(
    @Query() paginationDto: PaginationDto,
    @Query('category') category?: string,
  ) {
    return this.securityService.getAuditLogs(paginationDto, category);
  }

  @Get('sessions')
  @ApiOperation({
    summary: 'Get active user sessions',
    description: 'Returns list of users with active sessions',
  })
  @ApiResponse({
    status: 200,
    description: 'Active sessions retrieved successfully',
  })
  getSessions(@Query() paginationDto: PaginationDto) {
    return this.securityService.getSessions(paginationDto);
  }

  @Delete('sessions/:userId')
  @ApiOperation({
    summary: 'Terminate user session',
    description: 'Force logout a user by terminating their session',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Session terminated successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  terminateSession(
    @CurrentUser() user: User,
    @Param('userId') userId: string,
  ) {
    return this.securityService.terminateSession(userId, user.id);
  }

  @Get('ip-blocks')
  @ApiOperation({
    summary: 'Get blocked IP addresses',
    description: 'Returns list of blocked IP addresses',
  })
  @ApiResponse({
    status: 200,
    description: 'Blocked IPs retrieved successfully',
  })
  getBlockedIPs() {
    return this.securityService.getBlockedIPs();
  }

  @Post('ip-blocks')
  @ApiOperation({
    summary: 'Block IP address',
    description: 'Block an IP address from accessing the platform',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ip: { type: 'string' },
        reason: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'IP address blocked successfully',
  })
  blockIP(
    @CurrentUser() user: User,
    @Body('ip') ip: string,
    @Body('reason') reason?: string,
  ) {
    return this.securityService.blockIP(ip, reason, user.id);
  }

  @Delete('ip-blocks/:ip')
  @ApiOperation({
    summary: 'Unblock IP address',
    description: 'Remove an IP address from the blocked list',
  })
  @ApiParam({ name: 'ip', description: 'IP address' })
  @ApiResponse({
    status: 200,
    description: 'IP address unblocked successfully',
  })
  unblockIP(
    @CurrentUser() user: User,
    @Param('ip') ip: string,
  ) {
    return this.securityService.unblockIP(ip, user.id);
  }

  @Get('audit/:id')
  @ApiOperation({
    summary: 'Get specific audit log entry',
    description: 'Returns detailed information for a specific audit log entry',
  })
  @ApiParam({ name: 'id', description: 'Audit log ID' })
  @ApiResponse({
    status: 200,
    description: 'Audit log retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  getAuditLog(@Param('id') id: string) {
    return this.securityService.getAuditLog(id);
  }
}
