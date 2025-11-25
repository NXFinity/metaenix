import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

// User Entities
import { User } from './assets/entities/user.entity';
import { Privacy } from './assets/entities/security/privacy.entity';
import { Security } from './assets/entities/security/security.entity';
import { Profile } from './assets/entities/profile.entity';
import { Social } from './assets/entities/social.entity';
import { PostsModule } from './services/posts/posts.module';
import { FollowsModule } from './services/follows/follows.module';
import { TwofaModule } from './security/twofa/twofa.module';
import { NotificationsModule } from './services/notifications/notifications.module';
import { VideosModule } from './services/videos/videos.module';
import { TrackingModule } from 'src/services/tracking/tracking.module';
import { AnalyticsModule } from 'src/services/analytics/analytics.module';
import { PhotosModule } from './services/photos/photos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Profile, Privacy, Security, Social]),
    PostsModule,
    FollowsModule,
    TwofaModule,
    NotificationsModule,
    VideosModule,
    TrackingModule,
    AnalyticsModule,
    PhotosModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
