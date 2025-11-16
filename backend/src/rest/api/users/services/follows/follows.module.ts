import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowsService } from './follows.service';
import { FollowsController } from './follows.controller';
import { Follow } from './assets/entities/follow.entity';
import { User } from '../../assets/entities/user.entity';
import { Privacy } from '../../assets/entities/security/privacy.entity';
import { RedisModule } from '@redis/redis';
import { FollowsGateway } from './follows.gateway';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    TypeOrmModule.forFeature([Follow, User, Privacy]),
    RedisModule,
    EventEmitterModule,
  ],
  controllers: [FollowsController],
  providers: [FollowsService, FollowsGateway],
  exports: [FollowsService],
})
export class FollowsModule {}
