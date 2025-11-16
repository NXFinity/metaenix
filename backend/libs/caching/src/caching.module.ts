import { Module, Global } from '@nestjs/common';
import { CachingService } from './caching.service';
import { RedisModule } from '@redis/redis';
import { LoggingModule } from '@logging/logging';

@Global()
@Module({
  imports: [RedisModule, LoggingModule],
  providers: [CachingService],
  exports: [CachingService],
})
export class CachingModule {}
