import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TwofaService } from './twofa.service';
import { TwofaController } from './twofa.controller';
import { Security } from '../../assets/entities/security/security.entity';
import { User } from '../../assets/entities/user.entity';
import { RedisModule } from '@redis/redis';

@Module({
  imports: [
    TypeOrmModule.forFeature([Security, User]),
    ConfigModule,
    RedisModule,
  ],
  controllers: [TwofaController],
  providers: [TwofaService],
  exports: [TwofaService], // Export for AuthModule to use
})
export class TwofaModule {}
