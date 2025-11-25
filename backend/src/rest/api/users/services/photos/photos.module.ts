import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PhotosService } from './photos.service';
import { PhotosController } from './photos.controller';
import { Photo } from './assets/entities/photo.entity';
import { User } from '../../assets/entities/user.entity';
import { Post } from '../posts/assets/entities/post.entity';
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
    TypeOrmModule.forFeature([Photo, User, Post]),
    StorageModule,
    RedisModule,
    CachingModule,
    AnalyticsModule,
    TrackingModule,
    CommentsModule,
    LikesModule,
    SharesModule,
  ],
  controllers: [PhotosController],
  providers: [PhotosService],
  exports: [PhotosService],
})
export class PhotosModule {}
