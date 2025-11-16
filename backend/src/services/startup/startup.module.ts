import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StartupService } from './startup.service';
import { UsersModule } from '../../rest/api/users/users.module';
import { CachingModule } from '@caching/caching';
import { Post } from '../../rest/api/users/services/posts/assets/entities/post.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    UsersModule,
    CachingModule,
    TypeOrmModule.forFeature([Post]),
  ],
  providers: [StartupService],
})
export class StartupModule {}

