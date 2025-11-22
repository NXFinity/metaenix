import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { ViewTrack } from '../tracking/assets/entities/view-track.entity';
import { UserAnalytics } from './assets/entities';
import { PostAnalytics } from './assets/entities';
import { VideoAnalytics } from './assets/entities';
import { LoggingModule } from '@logging/logging';

@Module({
  imports: [
    TypeOrmModule.forFeature([ViewTrack, UserAnalytics, PostAnalytics, VideoAnalytics]),
    LoggingModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
