import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';
import { Like } from './assets/entities/like.entity';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { Post } from '../../rest/api/users/services/posts/assets/entities/post.entity';
import { Video } from '../../rest/api/users/services/videos/assets/entities/video.entity';
import { Photo } from '../../rest/api/users/services/photos/assets/entities/photo.entity';
import { Comment } from '../comments/assets/entities/comment.entity';
import { LoggingModule } from '@logging/logging';
import { CachingModule } from '@caching/caching';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AnalyticsModule } from '../analytics/analytics.module';
import { LikesGateway } from './likes.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Like, User, Post, Video, Photo, Comment]),
    LoggingModule,
    CachingModule,
    EventEmitterModule,
    AnalyticsModule,
  ],
  controllers: [LikesController],
  providers: [LikesService, LikesGateway],
  exports: [LikesService],
})
export class LikesModule {}
