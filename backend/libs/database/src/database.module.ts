import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { SeedService } from './seed/seed.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('POSTGRES_HOST'),
        port: configService.get<number>('POSTGRES_PORT'),
        username: configService.get<string>('POSTGRES_USER'),
        password: configService.get<string>('POSTGRES_PASSWORD'),
        database:
          configService.get<string>('NODE_ENV') === 'development'
            ? configService.get<string>('POSTGRES_DB_DEV')
            : configService.get<string>('POSTGRES_DB'),
        synchronize: configService.get<string>('NODE_ENV') === 'development',
        logging: ['error', 'schema'], // Log schema creation and errors
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [DatabaseService, SeedService],
  exports: [DatabaseService, SeedService],
})
export class DatabaseModule {}
