import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedSocket } from 'src/common/interfaces/authenticated-socket.interface';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../assets/entities/user.entity';

@WebSocketGateway({
  namespace: 'posts',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class PostsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(PostsGateway.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

      this.logger.log(`User ${user.id} connected to posts namespace`);
    } catch (error) {
      this.logger.error(`Error handling connection: ${error}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.user?.id) {
      this.logger.log(
        `User ${client.user.id} disconnected from posts namespace`,
      );
    }
  }

  /**
   * Notify a user that someone liked their post via WebSocket (real-time only, no persistence)
   * Note: Persistence is handled by NotificationsService listening to post.liked event
   */
  async notifyPostLiked(postOwnerId: string, likerId: string, postId: string): Promise<void> {
    try {
      // Send real-time WebSocket event to /posts namespace (no persistence here)
      // Persistence is handled by NotificationsService listening to post.liked event
      this.server.to(`user:${postOwnerId}`).emit('post_liked', {
        likerId,
        postId,
        timestamp: new Date().toISOString(),
      });

      this.loggingService.log('Post like alert sent via WebSocket', 'PostsGateway', {
        category: LogCategory.USER_MANAGEMENT,
        userId: postOwnerId,
        metadata: { likerId, postId },
      });
    } catch (error) {
      this.logger.error(`Error sending post like alert: ${error}`);
    }
  }

  /**
   * Notify a user that someone commented on their post via WebSocket (real-time only, no persistence)
   * Note: Persistence is handled by NotificationsService listening to post.commented event
   */
  async notifyPostCommented(
    postOwnerId: string,
    commenterId: string,
    postId: string,
    commentId: string,
  ): Promise<void> {
    try {
      // Send real-time WebSocket event to /posts namespace (no persistence here)
      // Persistence is handled by NotificationsService listening to post.commented event
      this.server.to(`user:${postOwnerId}`).emit('post_commented', {
        commenterId,
        postId,
        commentId,
        timestamp: new Date().toISOString(),
      });

      this.loggingService.log('Post comment alert sent via WebSocket', 'PostsGateway', {
        category: LogCategory.USER_MANAGEMENT,
        userId: postOwnerId,
        metadata: { commenterId, postId, commentId },
      });
    } catch (error) {
      this.logger.error(`Error sending post comment alert: ${error}`);
    }
  }

  /**
   * Notify a user that someone shared their post via WebSocket (real-time only, no persistence)
   * Note: Persistence is handled by NotificationsService listening to post.shared event
   */
  async notifyPostShared(
    postOwnerId: string,
    sharerId: string,
    postId: string,
    shareId: string,
  ): Promise<void> {
    try {
      // Send real-time WebSocket event to /posts namespace (no persistence here)
      // Persistence is handled by NotificationsService listening to post.shared event
      this.server.to(`user:${postOwnerId}`).emit('post_shared', {
        sharerId,
        postId,
        shareId,
        timestamp: new Date().toISOString(),
      });

      this.loggingService.log('Post share alert sent via WebSocket', 'PostsGateway', {
        category: LogCategory.USER_MANAGEMENT,
        userId: postOwnerId,
        metadata: { sharerId, postId, shareId },
      });
    } catch (error) {
      this.logger.error(`Error sending post share alert: ${error}`);
    }
  }

  @SubscribeMessage('subscribe_posts')
  async handleSubscribePosts(@ConnectedSocket() client: AuthenticatedSocket) {
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

  @OnEvent('post.liked')
  async handlePostLiked(payload: {
    likerId: string;
    postId: string;
    postOwnerId: string;
  }) {
    await this.notifyPostLiked(payload.postOwnerId, payload.likerId, payload.postId);
  }

  @OnEvent('post.commented')
  async handlePostCommented(payload: {
    commenterId: string;
    postId: string;
    commentId: string;
    postOwnerId: string;
    parentCommentId: string | null;
  }) {
    await this.notifyPostCommented(
      payload.postOwnerId,
      payload.commenterId,
      payload.postId,
      payload.commentId,
    );
  }

  @OnEvent('post.shared')
  async handlePostShared(payload: {
    sharerId: string;
    postId: string;
    postOwnerId: string;
    shareId: string;
  }) {
    await this.notifyPostShared(
      payload.postOwnerId,
      payload.sharerId,
      payload.postId,
      payload.shareId,
    );
  }
}
