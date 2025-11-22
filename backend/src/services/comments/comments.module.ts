import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { Comment } from './assets/entities/comment.entity';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { Post } from '../../rest/api/users/services/posts/assets/entities/post.entity';
import { Video } from '../../rest/api/users/services/videos/assets/entities/video.entity';
import { LoggingModule } from '@logging/logging';
import { CachingModule } from '@caching/caching';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, User, Post, Video]),
    LoggingModule,
    CachingModule,
    EventEmitterModule,
    AnalyticsModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
