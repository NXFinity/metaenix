import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DeveloperService } from './developer.service';
import { DeveloperController } from './developer.controller';
import { OAuthController } from './services/oauth/oauth.controller';
import { OAuthService } from './services/oauth/oauth.service';
import { OAuthStrategy } from './services/oauth/oauth.strategy';
import { ScopeService } from './services/scopes/scope.service';
import { ScopeGuard } from './services/scopes/scope.guard';
import { ScopesController } from './services/scopes/scopes.controller';
import { OAuthRateLimitService } from './services/rate-limit/oauth-rate-limit.service';
import { OAuthRateLimitGuard } from './services/rate-limit/oauth-rate-limit.guard';
import { DeveloperWebsocketGateway } from './services/websocket/developer-websocket.gateway';
import { Application } from './assets/entities/application.entity';
import { OAuthToken } from './assets/entities/oauth-token.entity';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { Security } from '../../rest/api/users/assets/entities/security/security.entity';
import { UsersModule } from '../../rest/api/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, OAuthToken, User, Security]),
    UsersModule,
    PassportModule.register({ defaultStrategy: 'oauth' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '1h', // OAuth access tokens expire in 1 hour
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [DeveloperController, OAuthController, ScopesController],
  providers: [
    DeveloperService,
    OAuthService,
    OAuthStrategy,
    ScopeService,
    ScopeGuard,
    OAuthRateLimitService,
    OAuthRateLimitGuard,
    DeveloperWebsocketGateway,
  ],
  exports: [
    DeveloperService,
    OAuthService,
    ScopeService,
    ScopeGuard,
    OAuthRateLimitService,
    OAuthRateLimitGuard,
  ],
})
export class DeveloperModule {}
