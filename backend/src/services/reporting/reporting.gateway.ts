import {
  WebSocketGateway,
  WebSocketServer as WsServerDecorator,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Namespace } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { AuthenticatedSocket } from 'src/common/interfaces/authenticated-socket.interface';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { ROLE } from '../../security/roles/assets/enum/role.enum';
import { getCorsOriginFunction } from '../../config/cors.config';

const corsOriginFunction = getCorsOriginFunction(process.env.NODE_ENV || 'development');

@WebSocketGateway({
  namespace: 'reporting',
  cors: {
    origin: corsOriginFunction,
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
})
@Injectable()
export class ReportingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WsServerDecorator()
  server!: Namespace;

  private connectedClients = new Map<string, AuthenticatedSocket>();
  private readonly logger = new Logger(ReportingGateway.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly loggingService: LoggingService,
  ) {}

  async handleConnection(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      // Client should already be authenticated via the account gateway
      // We just need to verify they're an admin
      if (!client.userId || !client.user) {
        this.logger.warn(
          `Unauthenticated connection attempt to reporting gateway: ${client.id}`,
        );
        client.emit('error', {
          type: 'error',
          message: 'Authentication required',
        });
        client.disconnect(true);
        return;
      }

      // Check if user is an admin
      const user = await this.userRepository.findOne({
        where: { id: client.userId },
        select: ['id', 'role', 'username'],
      });

      if (!user) {
        client.emit('error', {
          type: 'error',
          message: 'User not found',
        });
        client.disconnect(true);
        return;
      }

      // Verify admin role
      const adminRoles = [ROLE.Administrator, ROLE.Founder, ROLE.Chief_Executive];
      if (!adminRoles.includes(user.role as ROLE)) {
        this.logger.warn(
          `Non-admin user attempted to connect to reporting gateway: ${user.id}`,
        );
        client.emit('error', {
          type: 'error',
          message: 'Admin access required',
        });
        client.disconnect(true);
        return;
      }

      // Store client
      this.connectedClients.set(client.id, client);

      // Join admin room for broadcasting
      client.join('admins');

      // Join user-specific room
      client.join(`user:${user.id}`);

      this.logger.log(
        `Admin connected to reporting gateway: userId=${user.id}, username=${user.username}, socketId=${client.id}`,
      );

      // Send success message
      client.emit('connected', {
        type: 'connected',
        message: 'Connected to reporting gateway',
        userId: user.id,
        username: user.username,
      });
    } catch (error) {
      this.loggingService.error(
        'Error during reporting gateway connection',
        error instanceof Error ? error.stack : undefined,
        'ReportingGateway',
        {
          category: LogCategory.AUTHENTICATION,
          metadata: { socketId: client.id },
        },
      );
      client.emit('error', {
        type: 'error',
        message: 'Connection failed: Internal server error',
      });
      client.disconnect(true);
    }
  }

  async handleDisconnect(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      this.connectedClients.delete(client.id);
      if (client.userId) {
        this.logger.log(
          `Admin disconnected from reporting gateway: userId=${client.userId}, socketId=${client.id}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error handling disconnect: ${error}`);
    }
  }

  /**
   * Broadcast report notification to all connected admins
   */
  notifyNewReport(report: {
    id: string;
    resourceType: string;
    resourceId: string;
    reason: string;
    reporterId: string;
    reporterUsername?: string;
    timestamp: string;
  }): void {
    try {
      const notificationData = {
        type: 'new_report',
        report: {
          id: report.id,
          resourceType: report.resourceType,
          resourceId: report.resourceId,
          reason: report.reason,
          reporterId: report.reporterId,
          reporterUsername: report.reporterUsername,
          timestamp: report.timestamp,
        },
      };

      // Broadcast to all admins
      this.server.to('admins').emit('new_report', notificationData);

      this.logger.log(
        `Report notification sent to admins: reportId=${report.id}, resourceType=${report.resourceType}, resourceId=${report.resourceId}`,
      );
    } catch (error) {
      this.loggingService.error(
        'Error sending report notification',
        error instanceof Error ? error.stack : undefined,
        'ReportingGateway',
        {
          category: LogCategory.USER_MANAGEMENT,
          metadata: { reportId: report.id },
        },
      );
    }
  }
}
