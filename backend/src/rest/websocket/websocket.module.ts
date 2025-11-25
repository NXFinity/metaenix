import { Module } from '@nestjs/common';
import { WebsocketService } from './websocket.service';
import { WebsocketGateway } from './websocket.gateway';
import { UsersModule } from '../api/users/users.module';
import { RedisModule } from '@redis/redis';
import { SessionStoreConfig } from '../../config/session-store.config';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [UsersModule, RedisModule, EventEmitterModule],
  providers: [WebsocketGateway, WebsocketService, SessionStoreConfig],
  exports: [WebsocketService, WebsocketGateway],
})
export class WebsocketModule {}
