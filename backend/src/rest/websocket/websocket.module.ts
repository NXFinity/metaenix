import { Module } from '@nestjs/common';
import { WebsocketService } from './websocket.service';
import { WebsocketGateway } from './websocket.gateway';
import { UsersModule } from '../api/users/users.module';
import { RedisModule } from '@redis/redis';
import { SessionStoreConfig } from '../../config/session-store.config';

@Module({
  imports: [UsersModule, RedisModule],
  providers: [WebsocketGateway, WebsocketService, SessionStoreConfig],
  exports: [WebsocketService],
})
export class WebsocketModule {}
