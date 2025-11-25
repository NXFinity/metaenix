import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/rest/api/users/assets/entities/user.entity';
import { SecurityMonitorService, SecurityAlert } from 'src/common/monitoring/security-monitor.service';
import { AuditLogService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { RedisService } from '@redis/redis';
import { ConfigService } from '@nestjs/config';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  PaginationResponse,
  PaginationMeta,
} from 'src/common/interfaces/pagination-response.interface';
import { WebsocketService } from 'src/rest/websocket/websocket.service';
import { WebsocketGateway } from 'src/rest/websocket/websocket.gateway';

/**
 * Admin Security Service
 * 
 * Handles security monitoring and management for admin.
 * Uses repositories directly - no dependency on REST API services.
 */
@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly securityMonitor: SecurityMonitorService,
    private readonly auditLogService: AuditLogService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly websocketService: WebsocketService,
    @Inject(forwardRef(() => WebsocketGateway))
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  /**
   * Get security alerts
   */
  async getAlerts(): Promise<SecurityAlert[]> {
    try {
      return await this.securityMonitor.getActiveAlerts();
    } catch (error) {
      throw new InternalServerErrorException('Failed to get security alerts');
    }
  }

  /**
   * Get security events log
   */
  async getEvents(
    paginationDto: PaginationDto = {},
    severity?: 'low' | 'medium' | 'high' | 'critical',
  ): Promise<PaginationResponse<any>> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 50;
      const skip = (page - 1) * limit;

      // Get events from audit logs
      const filters: any = {
        category: LogCategory.SECURITY,
        limit: limit + skip, // Get more to paginate
      };

      if (severity) {
        filters.level = this.getLogLevelFromSeverity(severity);
      }

      const logs = await this.auditLogService.findWithFilters(filters);
      const paginatedLogs = logs.slice(skip, skip + limit);
      const total = logs.length;

      const totalPages = Math.ceil(total / limit);
      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      return {
        data: paginatedLogs.map((log) => ({
          id: log.id,
          type: log.metadata?.type || 'unknown',
          severity: log.metadata?.severity || 'low',
          userId: log.userId,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          endpoint: log.endpoint,
          message: log.message,
          timestamp: log.dateCreated,
          details: log.metadata,
        })),
        meta,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get security events');
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(
    paginationDto: PaginationDto = {},
    category?: string,
  ): Promise<PaginationResponse<any>> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 50;
      const skip = (page - 1) * limit;

      const filters: any = {
        limit: limit + skip,
      };

      if (category) {
        filters.category = category;
      }

      const logs = await this.auditLogService.findWithFilters(filters);
      const paginatedLogs = logs.slice(skip, skip + limit);
      const total = logs.length;

      const totalPages = Math.ceil(total / limit);
      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      return { data: paginatedLogs, meta };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get audit logs');
    }
  }

  /**
   * Get active user sessions
   */
  async getSessions(
    paginationDto: PaginationDto = {},
  ): Promise<PaginationResponse<{ userId: string; websocketId: string; username: string; displayName: string }>> {
    this.logger.log(`[getSessions] METHOD CALLED with pagination: ${JSON.stringify(paginationDto)}`);
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 50;
      const skip = (page - 1) * limit;
      this.logger.log(`[getSessions] Starting - page: ${page}, limit: ${limit}, skip: ${skip}`);

      // Get all users with websocketId (all users have this)
      const allUsers = await this.userRepository
        .createQueryBuilder('user')
        .where('user.dateDeleted IS NULL')
        .select(['user.id', 'user.websocketId', 'user.username', 'user.displayName'])
        .getMany();

      // Filter to only users with active WebSocket connections
      // Redis is the source of truth - if ws:account:{websocketId} exists, user has active session
      const activeSessions: Array<{ userId: string; websocketId: string; username: string; displayName: string }> = [];

      this.logger.log(`[getSessions] Checking ${allUsers.length} users for active sessions`);

      for (const user of allUsers) {
        if (!user.websocketId) {
          this.logger.log(`[getSessions] User ${user.id} (${user.username}) has no websocketId, skipping`);
          continue;
        }
        
        try {
          // Check if user has an active connection stored in Redis
          // Redis key: ws:account:{websocketId} -> socketId
          // If this key exists, the user has an active WebSocket session
          const socketId = await this.websocketService.getActiveConnection(user.websocketId);
          
          this.logger.log(`[getSessions] User ${user.id} (${user.username}) - websocketId: ${user.websocketId}, socketId from Redis: ${socketId || 'null'}`);
          
          if (socketId) {
            // SocketId exists in Redis = active session
            // Optionally verify against server, but trust Redis as source of truth
            let shouldInclude = true;
            
            // Verify socket is actually connected if server is available
            // Trust Redis as source of truth - if socketId exists in Redis, session is active
            // Server verification is optional and can be added later if needed
            if (this.websocketGateway?.server) {
              try {
                const namespaceServer = this.websocketGateway.server;
                // Access sockets from namespace - use type assertion as TypeScript types may not expose Map correctly
                const socketsMap = (namespaceServer as any).sockets as Map<string, any>;
                const socket = socketsMap?.get(socketId);
                const isConnected = socket?.connected ?? false;
                
                this.logger.log(`[getSessions] User ${user.id} - socket found: ${!!socket}, connected: ${isConnected}`);
                
                // If socket exists but is disconnected, clean up stale connection
                if (socket && !socket.connected) {
                  this.logger.log(`[getSessions] Cleaning up stale connection for user ${user.id}`);
                  await this.websocketService.removeConnection(user.websocketId, user.id, socketId);
                  shouldInclude = false;
                }
              } catch (serverError) {
                // If server verification fails, trust Redis (connection exists)
                this.logger.warn(`[getSessions] Server verification failed for user ${user.id}, trusting Redis:`, serverError);
              }
            } else {
              this.logger.log(`[getSessions] WebSocket server not available, trusting Redis for user ${user.id}`);
            }
            
            if (shouldInclude) {
              this.logger.log(`[getSessions] Adding user ${user.id} (${user.username}) to active sessions`);
              activeSessions.push({
                userId: user.id,
                websocketId: user.websocketId,
                username: user.username,
                displayName: user.displayName,
              });
            }
          } else {
            this.logger.log(`[getSessions] User ${user.id} (${user.username}) has no active session in Redis`);
          }
        } catch (error) {
          // Log error but continue processing other users
          this.logger.error(`[getSessions] Error checking session for user ${user.id}:`, error);
        }
      }

      this.logger.log(`[getSessions] Found ${activeSessions.length} active sessions`);

      // Apply pagination
      const total = activeSessions.length;
      const paginatedSessions = activeSessions.slice(skip, skip + limit);
      const totalPages = Math.ceil(total / limit);

      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      return {
        data: paginatedSessions,
        meta,
      };
    } catch (error) {
      // Log the actual error for debugging
      this.logger.error(`[getSessions] ERROR: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException(
        `Failed to get active sessions: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Terminate user session
   */
  async terminateSession(userId: string, terminatedBy: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }

      // Clear session from Redis if exists
      const sessionPrefix = this.configService.get<string>('REDIS_SESSION_PREFIX') || 'sess:';
      const sessionKey = `${sessionPrefix}${userId}`;
      await this.redisService.del(sessionKey);

      // Invalidate all access tokens by incrementing token version
      const tokenVersionKey = this.redisService.keyBuilder.build(
        'auth',
        'token-version',
        userId,
      );
      const currentVersionStr = await this.redisService.get<string>(tokenVersionKey, false);
      const currentVersion = currentVersionStr ? parseInt(currentVersionStr, 10) : 0;
      const newVersion = currentVersion + 1;
      await this.redisService.set(tokenVersionKey, newVersion.toString(), 365 * 24 * 60 * 60);
      this.logger.log(
        `Invalidated all access tokens for user: ${userId} (version: ${currentVersion} -> ${newVersion})`,
      );

      // Invalidate all refresh tokens for this user
      // Refresh tokens are stored as: auth:refresh-token:{userId}:{tokenSuffix}
      const refreshTokenPattern = this.redisService.keyBuilder.build(
        'auth',
        'refresh-token',
        userId,
        '*',
      );
      const refreshTokenKeys = await this.redisService.getKeys(refreshTokenPattern);
      if (refreshTokenKeys && refreshTokenKeys.length > 0) {
        await Promise.all(refreshTokenKeys.map((key) => this.redisService.del(key)));
        this.logger.log(
          `Invalidated ${refreshTokenKeys.length} refresh token(s) for user: ${userId}`,
        );
      }

      // Clear WebSocket connection and force disconnect
      if (user.websocketId) {
        // Force disconnect the WebSocket connection (this emits logout event)
        // Note: this.websocketGateway.server is already the /account namespace server
        await this.websocketService.forceDisconnect(
          user.websocketId,
          this.websocketGateway.server as any, // Namespace extends Server, but TypeScript types it as Server
          'Your session has been terminated by an administrator',
        );

        // Clear Redis keys AFTER disconnecting to ensure event is sent
        const wsKey = this.redisService.keyBuilder.build('ws', 'user', userId);
        const wsAccountKey = this.redisService.keyBuilder.build('ws', 'account', user.websocketId);
        await this.redisService.del(wsKey);
        await this.redisService.del(wsAccountKey);
      }

      // Log action
      await this.auditLogService.saveAuditLog({
        message: `Session terminated by admin`,
        userId: terminatedBy,
        category: LogCategory.SECURITY,
        metadata: { targetUserId: userId },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to terminate session');
    }
  }

  /**
   * Get blocked IP addresses
   */
  async getBlockedIPs(): Promise<Array<{ ip: string; blockedAt: Date; reason?: string }>> {
    try {
      // In production, this would query a blocked IPs table or Redis set
      // For now, return empty array (to be implemented)
      return [];
    } catch (error) {
      throw new InternalServerErrorException('Failed to get blocked IPs');
    }
  }

  /**
   * Block IP address
   */
  async blockIP(ip: string, reason?: string, blockedBy?: string): Promise<void> {
    try {
      // In production, this would add IP to blocked list in Redis or database
      // For now, just log the action
      await this.auditLogService.saveAuditLog({
        message: `IP address blocked: ${ip}`,
        userId: blockedBy,
        category: LogCategory.SECURITY,
        metadata: { ip, reason },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to block IP address');
    }
  }

  /**
   * Unblock IP address
   */
  async unblockIP(ip: string, unblockedBy?: string): Promise<void> {
    try {
      // In production, this would remove IP from blocked list
      // For now, just log the action
      await this.auditLogService.saveAuditLog({
        message: `IP address unblocked: ${ip}`,
        userId: unblockedBy,
        category: LogCategory.SECURITY,
        metadata: { ip },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to unblock IP address');
    }
  }

  /**
   * Helper: Convert severity to log level
   */
  private getLogLevelFromSeverity(severity: string): string {
    switch (severity) {
      case 'low':
        return 'INFO';
      case 'medium':
        return 'WARN';
      case 'high':
        return 'ERROR';
      case 'critical':
        return 'CRITICAL';
      default:
        return 'INFO';
    }
  }

  /**
   * Get specific audit log entry
   */
  async getAuditLog(_id: string): Promise<any> {
    try {
      // This would query a specific audit log by ID
      // For now, return empty object as audit log querying needs to be implemented
      return {};
    } catch (error) {
      throw new InternalServerErrorException('Failed to get audit log');
    }
  }
}
