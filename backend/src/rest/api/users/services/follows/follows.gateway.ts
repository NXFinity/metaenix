import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FollowsService } from './follows.service';
import { AuthenticatedSocket } from 'src/common/interfaces/authenticated-socket.interface';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../assets/entities/user.entity';

@WebSocketGateway({
  namespace: 'follows',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class FollowsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FollowsGateway.name);

  constructor(
    private readonly followsService: FollowsService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly loggingService: LoggingService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract websocketId from handshake (same pattern as main websocket gateway)
      const websocketId =
        client.handshake.query.websocketId ||
        client.handshake.headers['x-websocket-id'] ||
        client.handshake.auth?.websocketId;

      if (!websocketId || typeof websocketId !== 'string') {
        this.logger.warn(
          `Unauthorized connection attempt from ${client.id} - No websocketId`,
        );
        client.disconnect();
        return;
      }

      // Validate websocketId format (UUID)
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(websocketId)) {
        this.logger.warn(
          `Connection rejected: Invalid websocketId format - Socket: ${client.id}`,
        );
        client.disconnect();
        return;
      }

      // Verify websocketId and get user
      const user = await this.userRepository.findOne({
        where: { websocketId },
        select: ['id', 'username', 'displayName', 'websocketId'],
      });

      if (!user) {
        this.logger.warn(
          `Unauthorized connection attempt from ${client.id} - Invalid websocketId`,
        );
        client.disconnect();
        return;
      }

      // Attach user to socket
      client.user = user;
      client.userId = user.id;
      client.websocketId = websocketId;

      // Join user's personal room for direct notifications
      await client.join(`user:${user.id}`);

      this.logger.log(`User ${user.id} connected to follows namespace`);
    } catch (error) {
      this.logger.error(`Error handling connection: ${error}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.user?.id) {
      this.logger.log(
        `User ${client.user.id} disconnected from follows namespace`,
      );
    }
  }

  /**
   * Notify a user that someone followed them (respects notification preferences)
   */
  async notifyNewFollower(
    followingId: string,
    followerId: string,
  ): Promise<void> {
    try {
      // Check user's notification preference
      const user = await this.userRepository.findOne({
        where: { id: followingId },
        relations: ['privacy'],
        select: ['id'],
      });

      if (user?.privacy && user.privacy.notifyOnFollow === false) {
        // User has disabled follow notifications
        return;
      }

      this.server.to(`user:${followingId}`).emit('new_follower', {
        followerId,
        timestamp: new Date().toISOString(),
      });

      this.loggingService.log('Follow notification sent', 'FollowsGateway', {
        category: LogCategory.USER_MANAGEMENT,
        userId: followingId,
        metadata: { followerId },
      });
    } catch (error) {
      this.logger.error(`Error sending follow notification: ${error}`);
    }
  }

  /**
   * Notify a user that someone unfollowed them
   */
  async notifyUnfollow(followingId: string, followerId: string): Promise<void> {
    try {
      this.server.to(`user:${followingId}`).emit('unfollow', {
        followerId,
        timestamp: new Date().toISOString(),
      });

      this.loggingService.log('Unfollow notification sent', 'FollowsGateway', {
        category: LogCategory.USER_MANAGEMENT,
        userId: followingId,
        metadata: { followerId },
      });
    } catch (error) {
      this.logger.error(`Error sending unfollow notification: ${error}`);
    }
  }

  @SubscribeMessage('subscribe_follows')
  async handleSubscribeFollows(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }

    const userId = client.user.id;
    await client.join(`user:${userId}`);

    return {
      event: 'subscribed',
      room: `user:${userId}`,
    };
  }

  @OnEvent('user.followed')
  async handleUserFollowed(payload: {
    followerId: string;
    followingId: string;
  }) {
    await this.notifyNewFollower(payload.followingId, payload.followerId);
  }

  @OnEvent('user.unfollowed')
  async handleUserUnfollowed(payload: {
    followerId: string;
    followingId: string;
  }) {
    await this.notifyUnfollow(payload.followingId, payload.followerId);
  }
}
