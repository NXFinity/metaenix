import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notificaitons.service';
import { NotificationsController } from './notificaitons.controller';
import { Notification } from './assets/entities/notification.entity';
import { User } from '../users/assets/entities/user.entity';
import { RedisModule } from '@redis/redis';
import { CachingModule } from '@caching/caching';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User]),
    RedisModule,
    CachingModule,
    EventEmitterModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
