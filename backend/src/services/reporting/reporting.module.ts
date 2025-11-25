import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { Report } from './assets/entities/report.entity';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { Post } from '../../rest/api/users/services/posts/assets/entities/post.entity';
import { Video } from '../../rest/api/users/services/videos/assets/entities/video.entity';
import { Photo } from '../../rest/api/users/services/photos/assets/entities/photo.entity';
import { LoggingModule } from '@logging/logging';
import { ReportingGateway } from './reporting.gateway';
import { NotificationsModule } from '../../rest/api/users/services/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report, User, Post, Video, Photo]),
    LoggingModule,
    NotificationsModule,
  ],
  controllers: [ReportingController],
  providers: [ReportingService, ReportingGateway],
  exports: [ReportingService],
})
export class ReportingModule {}
