import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottleService } from './throttle.service';
import { ThrottleGuard } from './guards/throttle.guard';
import { RedisModule } from '@redis/redis';

@Global()
@Module({
  imports: [RedisModule, ConfigModule],
  providers: [ThrottleService, ThrottleGuard],
  exports: [ThrottleService, ThrottleGuard],
})
export class ThrottleModule {}
