import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharesService } from './shares.service';
import { SharesController } from './shares.controller';
import { Share } from './assets/entities/share.entity';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { Post } from '../../rest/api/users/services/posts/assets/entities/post.entity';
import { Video } from '../../rest/api/users/services/videos/assets/entities/video.entity';
import { Photo } from '../../rest/api/users/services/photos/assets/entities/photo.entity';
import { LoggingModule } from '@logging/logging';
import { CachingModule } from '@caching/caching';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AnalyticsModule } from '../analytics/analytics.module';
import { SharesGateway } from './shares.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Share, User, Post, Video, Photo]),
    LoggingModule,
    CachingModule,
    EventEmitterModule,
    AnalyticsModule,
  ],
  controllers: [SharesController],
  providers: [SharesService, SharesGateway],
  exports: [SharesService],
})
export class SharesModule {}
