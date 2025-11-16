import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Application Modules & Services
import { DatabaseModule } from '@database/database';
import { RedisModule } from '@redis/redis';
import { ThrottleModule } from '@throttle/throttle';
import { CachingModule } from '@caching/caching';
import { AuthModule } from './security/auth/auth.module';
import { RolesModule } from './security/roles';
import { UsersModule } from './rest/api/users/users.module';
import { WebsocketModule } from './rest/websocket/websocket.module';
import { SessionStoreConfig } from './config/session-store.config';
import { HealthModule } from './services/health/health.module';
import { StartupModule } from './services/startup/startup.module';
import { StorageModule } from './rest/storage/storage.module';
import { DeveloperModule } from './security/developer/developer.module';

// Validation
import * as Joi from 'joi';
// Guards
import { AuthGuard } from './security/auth/guards/auth.guard';
import { ThrottleGuard } from '@throttle/throttle';
import { OAuthRateLimitGuard } from './security/developer/services/rate-limit';
import { OAuthGuard } from './security/developer/services/oauth';
import { ScopeGuard } from './security/developer/services/scopes';

// Configuration Variables

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({
      envFilePath: ['.env.development'],
      isGlobal: true,
      load: [],
      validationSchema: Joi.object({
        // ============================================
        // BASIC VALIDATION
        // ============================================
        NODE_ENV: Joi.string()
          .required()
          .valid('development', 'production', 'test')
          .default('development'),
        NODE_HOST: Joi.string().required(),
        NODE_PORT: Joi.number().required().min(1).max(65535),
        // ============================================
        // DATABASE VALIDATION
        // ============================================
        POSTGRES_HOST: Joi.string().required(),
        POSTGRES_PORT: Joi.number().required().min(1).max(65535),
        POSTGRES_USER: Joi.string().required().min(1),
        POSTGRES_PASSWORD: Joi.string().required().min(1),
        POSTGRES_DB: Joi.string().required().min(1),
        POSTGRES_DB_DEV: Joi.string().required().min(1),
        // ============================================
        // JWT VALIDATION
        // ============================================
        JWT_SECRET: Joi.string().required().min(32),
        JWT_EXPIRES_IN: Joi.string()
          .required()
          .pattern(/^\d+[smhd]$/)
          .messages({
            'string.pattern.base':
              'JWT_EXPIRES_IN must be in format: number + unit (s/m/h/d), e.g., "1d", "2h", "30m"',
          }),
        JWT_RESET_EXPIRES: Joi.string()
          .required()
          .pattern(/^\d+[smhd]$/)
          .messages({
            'string.pattern.base':
              'JWT_RESET_EXPIRES must be in format: number + unit (s/m/h/d), e.g., "1h", "30m"',
          }),
        REFRESH_TOKEN_SECRET: Joi.string().required().min(32),
        REFRESH_TOKEN_EXPIRES_IN: Joi.string()
          .required()
          .pattern(/^\d+[smhd]$/)
          .messages({
            'string.pattern.base':
              'REFRESH_TOKEN_EXPIRES_IN must be in format: number + unit (s/m/h/d), e.g., "7d", "30d"',
          }),
        // ============================================
        // SMTP VALIDATION
        // ============================================
        SMTP_HOST: Joi.string().required().hostname(),
        SMTP_PORT: Joi.number().required().min(1).max(65535),
        SMTP_USERNAME: Joi.string().required().email(),
        SMTP_PASSWORD: Joi.string().required().min(1),
        SMTP_SECURE: Joi.boolean().default(false),
        SMTP_TLS: Joi.boolean().default(false),
        // ============================================
        // REDIS VALIDATION
        // ============================================
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().required().min(1).max(65535),
        REDIS_PASSWORD: Joi.string().required().min(1),
        REDIS_DB: Joi.number().required().min(0).max(15),
        REDIS_KEY_PREFIX: Joi.string().required().min(1),
        REDIS_ENABLE_READY_CHECK: Joi.boolean().required(),
        REDIS_MAX_RETRIES: Joi.number().required().min(1).max(10),
        // ============================================
        // SESSION VALIDATION
        // ============================================
        SESSION_SECRET: Joi.string().required().min(32),
        REDIS_SESSION_PREFIX: Joi.string().required().min(1),
        SESSION_TTL: Joi.number().required().min(60).max(31536000), // 1 minute to 1 year
        // ============================================
        // THROTTLE VALIDATION
        // ============================================
        THROTTLE_DEFAULT_LIMIT: Joi.number().required().min(1).max(10000),
        THROTTLE_DEFAULT_TTL: Joi.number().required().min(1).max(3600), // 1 second to 1 hour
        // ============================================
        // URL VALIDATION
        // ============================================
        FRONTEND_URL: Joi.string().uri().allow('').default(''),
        BACKEND_URL: Joi.string().uri().allow('').default(''),
        CORS_ORIGINS: Joi.string().allow('').default(''), // Comma-separated list of allowed origins
        // ============================================
        // SYSTEM ACCOUNT VALIDATION
        // ============================================
        SYSTEM_USERNAME: Joi.string().required().min(3).max(50),
        SYSTEM_EMAIL: Joi.string().required().email(),
        SYSTEM_PASSWORD: Joi.string().required().min(8),
        // ============================================
        // DIGITALOCEAN SPACES VALIDATION
        // ============================================
        DO_API_SECRET: Joi.string().allow('').default(''),
        DO_SPACES_KEY: Joi.string().required().min(1),
        DO_SPACES_SECRET: Joi.string().required().min(1),
        DO_SPACES_BUCKET: Joi.string().required().min(1),
        DO_SPACES_BUCKET_ENDPOINT: Joi.string().uri().required(),
        // ============================================
        // KAFKA VALIDATION (Optional)
        // ============================================
        KAFKA_BROKERS: Joi.string().allow('').default(''),
        KAFKA_CLIENT_ID: Joi.string()
          .allow('')
          .default('metaenix-kafka-client'),
        KAFKA_LOG_LEVEL: Joi.string()
          .valid('ERROR', 'WARN', 'INFO', 'DEBUG')
          .default('WARN'),
        KAFKA_RETRY_RETRIES: Joi.number().default(8).min(0).max(20),
        KAFKA_RETRY_INITIAL_TIME: Joi.number().default(100).min(10),
        KAFKA_RETRY_MULTIPLIER: Joi.number().default(2).min(1),
        KAFKA_RETRY_MAX_TIME: Joi.number().default(30000).min(1000),
        KAFKA_REQUEST_TIMEOUT: Joi.number().default(30000).min(1000),
        KAFKA_CONNECTION_TIMEOUT: Joi.number().default(3000).min(500),
        KAFKA_SSL_ENABLED: Joi.boolean().default(false),
        KAFKA_SSL_REJECT_UNAUTHORIZED: Joi.boolean().default(true),
        KAFKA_SSL_CA: Joi.string().allow('').default(''),
        KAFKA_SSL_CERT: Joi.string().allow('').default(''),
        KAFKA_SSL_KEY: Joi.string().allow('').default(''),
        KAFKA_SASL_MECHANISM: Joi.string()
          .valid('plain', 'scram-sha-256', 'scram-sha-512')
          .allow('')
          .default(''),
        KAFKA_SASL_USERNAME: Joi.string().allow('').default(''),
        KAFKA_SASL_PASSWORD: Joi.string().allow('').default(''),
      }),
    }),
    DatabaseModule,
    RedisModule,
    ThrottleModule,
    CachingModule,
    AuthModule,
    RolesModule,
    UsersModule,
    WebsocketModule,
    HealthModule,
    StartupModule,
    StorageModule,
    DeveloperModule,
  ],
  controllers: [],
  providers: [
    { provide: 'APP_GUARD', useClass: AuthGuard },
    { provide: 'APP_GUARD', useClass: OAuthGuard },
    { provide: 'APP_GUARD', useClass: ThrottleGuard },
    { provide: 'APP_GUARD', useClass: OAuthRateLimitGuard },
    { provide: 'APP_GUARD', useClass: ScopeGuard },
    SessionStoreConfig,
  ],
})
export class AppModule {}
