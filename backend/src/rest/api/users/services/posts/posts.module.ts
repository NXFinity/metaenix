import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { Post } from './assets/entities/post.entity';
import { Comment } from 'src/services/comments/assets/entities/comment.entity';
import { Like } from 'src/services/likes/assets/entities/like.entity';
import { Share } from 'src/services/shares/assets/entities/share.entity';
import { Bookmark } from './assets/entities/bookmark.entity';
import { Report } from './assets/entities/report.entity';
import { Reaction } from './assets/entities/reaction.entity';
import { Collection } from './assets/entities/collection.entity';
import { User } from '../../assets/entities/user.entity';
import { Follow } from '../follows/assets/entities/follow.entity';
import { StorageModule } from 'src/rest/storage/storage.module';
import { PostsGateway } from './posts.gateway';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { VideosModule } from '../videos/videos.module';
import { TrackingModule } from 'src/services/tracking/tracking.module';
import { AnalyticsModule } from 'src/services/analytics/analytics.module';
import { CommentsModule } from 'src/services/comments/comments.module';
import { LikesModule } from 'src/services/likes/likes.module';
import { SharesModule } from 'src/services/shares/shares.module';
import { HttpModule } from '@nestjs/axios';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      Post,
      Comment,
      Like,
      Share,
      Bookmark,
      Report,
      Reaction,
      Collection,
      User,
      Follow,
    ]),
    StorageModule,
    EventEmitterModule,
    VideosModule,
    TrackingModule,
    AnalyticsModule,
    CommentsModule,
    LikesModule,
    SharesModule,
    HttpModule,
  ],
  controllers: [PostsController],
  providers: [PostsService, PostsGateway],
  exports: [PostsService],
})
export class PostsModule {}
