import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DatabaseModule } from '@database/database';
import { RedisModule } from '@redis/redis';

@Module({
  imports: [
    TerminusModule,
    DatabaseModule,
    RedisModule,
  ],
  controllers: [HealthController],
})
export class HealthModule {}
