import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideosService } from './videos.service';
import { VideosController } from './videos.controller';
import { Video } from './assets/entities/video.entity';
import { User } from '../../assets/entities/user.entity';
import { StorageModule } from 'src/rest/storage/storage.module';
import { RedisModule } from '@redis/redis';
import { CachingModule } from '@caching/caching';
import { AnalyticsModule } from 'src/services/analytics/analytics.module';
import { TrackingModule } from 'src/services/tracking/tracking.module';
import { CommentsModule } from 'src/services/comments/comments.module';
import { LikesModule } from 'src/services/likes/likes.module';
import { SharesModule } from 'src/services/shares/shares.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Video, User]),
    StorageModule,
    RedisModule,
    CachingModule,
    AnalyticsModule,
    TrackingModule,
    CommentsModule,
    LikesModule,
    SharesModule,
  ],
  controllers: [VideosController],
  providers: [VideosService],
  exports: [VideosService],
})
export class VideosModule {}
