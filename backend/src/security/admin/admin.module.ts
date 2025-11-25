import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AnalyticsController } from './services/analytics/analytics.controller';
import { AnalyticsService as AdminAnalyticsService } from './services/analytics/analytics.service';
import { UsersController } from './services/users/users.controller';
import { UsersService as AdminUsersService } from './services/users/users.service';
import { SettingsController } from './services/settings/settings.controller';
import { SettingsService } from './services/settings/settings.service';
import { SecurityController } from './services/security/security.controller';
import { SecurityService } from './services/security/security.service';
import { ContentController } from './services/content/content.controller';
import { ContentService } from './services/content/content.service';
import { TrackingController } from './services/tracking/tracking.controller';
import { TrackingService } from './services/tracking/tracking.service';
// Import entities directly - no dependency on REST API modules
import { User } from 'src/rest/api/users/assets/entities/user.entity';
import { Profile } from 'src/rest/api/users/assets/entities/profile.entity';
import { Privacy } from 'src/rest/api/users/assets/entities/security/privacy.entity';
import { Security } from 'src/rest/api/users/assets/entities/security/security.entity';
import { Social } from 'src/rest/api/users/assets/entities/social.entity';
import { Post } from 'src/rest/api/users/services/posts/assets/entities/post.entity';
import { Video } from 'src/rest/api/users/services/videos/assets/entities/video.entity';
import { Photo } from 'src/rest/api/users/services/photos/assets/entities/photo.entity';
import { Report } from 'src/services/reporting/assets/entities/report.entity';
import { ViewTrack } from 'src/services/tracking/assets/entities/view-track.entity';
import { UserAnalytics } from 'src/services/analytics/assets/entities/user-analytics.entity';
import { PostAnalytics } from 'src/services/analytics/assets/entities/post-analytics.entity';
import { VideoAnalytics } from 'src/services/analytics/assets/entities/video-analytics.entity';
import { PhotoAnalytics } from 'src/services/analytics/assets/entities/photo-analytics.entity';
// Import shared services (not REST API specific)
import { LoggingModule } from '@logging/logging';
import { CachingModule } from '@caching/caching';
import { RedisModule } from '@redis/redis';
import { MonitoringModule } from 'src/common/monitoring/monitoring.module';
import { TerminusModule } from '@nestjs/terminus';
import { WebsocketModule } from 'src/rest/websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Profile,
      Privacy,
      Security,
      Social,
      Post,
      Video,
      Photo,
      Report,
      ViewTrack,
      UserAnalytics,
      PostAnalytics,
      VideoAnalytics,
      PhotoAnalytics,
    ]),
    TerminusModule,
    LoggingModule,
    CachingModule,
    RedisModule,
    MonitoringModule,
    WebsocketModule,
  ],
  controllers: [
    AdminController,
    AnalyticsController,
    UsersController,
    SettingsController,
    SecurityController,
    ContentController,
    TrackingController,
  ],
  providers: [
    AdminAnalyticsService,
    AdminUsersService,
    SettingsService,
    SecurityService,
    ContentService,
    TrackingService,
  ],
})
export class AdminModule {}
