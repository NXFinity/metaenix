import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getCorsOriginFunction, getCorsOrigins } from './config/cors.config';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setupSwagger } from './functions/swagger.function';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';

const chalk = require('chalk');
const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // logger: ['error'],
    snapshot: true,
    cors: {
      origin: getCorsOriginFunction(process.env.NODE_ENV || 'development'),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      credentials: true,
      allowedHeaders: [
        'Content-Type',
        'Accept',
        'Authorization',
        'X-Requested-With',
        'X-Socket-Id',
        'X-Request-Id',
        'X-Correlation-Id',
        'Access-Control-Allow-Origin',
      ],
    },
  });

  // Configure security headers using Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Disable for API compatibility
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin resources
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      xFrameOptions: { action: 'deny' },
      xContentTypeOptions: true,
      xXssProtection: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      permittedCrossDomainPolicies: false,
    }),
  );

  // Enable cookie parser for httpOnly cookie support
  app.use(cookieParser());

  // Request ID middleware - generates or extracts request ID for tracing
  app.use((req: any, res: any, next: any) => {
    // Extract request ID from headers (support both X-Request-Id and X-Correlation-Id)
    const requestId =
      req.headers['x-request-id'] ||
      req.headers['x-correlation-id'] ||
      require('crypto').randomUUID();

    // Ensure requestId is a string
    const requestIdString = Array.isArray(requestId)
      ? requestId[0]
      : String(requestId);

    // Attach request ID to request object
    req.requestId = requestIdString;
    req.correlationId = requestIdString;

    // Include request ID and correlation ID in response headers
    res.setHeader('X-Request-Id', requestIdString);
    res.setHeader('X-Correlation-Id', requestIdString);

    next();
  });

  // CORS error handling middleware - provides informative error responses for CORS failures
  app.use((req: any, _res: any, next: any) => {
    // Handle CORS preflight (OPTIONS) requests with better error messages
    if (req.method === 'OPTIONS') {
      const origin = req.headers.origin;
      if (origin) {
        // CORS middleware will handle the response, but we can log here if needed
        // The actual CORS validation happens in the CORS configuration
      }
    }
    next();
  });

  // Increase timeout for file upload endpoints to allow large file uploads
  app.use((req: any, _res: any, next: any) => {
    // Increase timeout for file upload endpoints
    if (req.url.includes('/posts/upload')) {
      // Set timeout to 10 minutes for large video uploads
      req.setTimeout(600000); // 10 minute timeout
    }
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const configService = app.get(ConfigService);

  // V1 PREFIX FOR ALL ROUTES
  const globalPrefix = 'v1';
  app.setGlobalPrefix(globalPrefix);
  if (process.env.NODE_ENV === 'development') {
    // SWAGGER
    setupSwagger(app);
  }

  // Initialize the app to ensure all modules are initialized (including Redis)
  await app.init();

  // Determine which database is being used
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  const isProductionEnv = nodeEnv === 'production';
  const database = isProductionEnv
    ? configService.get('POSTGRES_DB')
    : configService.get('POSTGRES_DB_DEV');

  // VERSIONING
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // PORT
  const port = process.env.NODE_PORT || 3021;
  // Configure HTTP server for large file uploads
  const server = await app.listen(port);
  // Increase max request size for large file uploads (default is usually ~1MB)
  // This sets the max request headers size (in bytes)
  server.maxHeadersCount = 1000;
  // Note: For multipart/form-data, multer handles parsing and has its own limits
  // configured in the FileFieldsInterceptor in posts.controller.ts
  // The actual file size limit is set there (currently 600MB per file)

  // Get CORS configuration
  let corsOriginsList = '\n   CORS Origins: Loading...';
  try {
    const corsOrigins = getCorsOrigins(process.env.NODE_ENV || 'development');
    const corsMode =
      process.env.NODE_ENV === 'production'
        ? chalk.green('Production')
        : chalk.yellow('Development');
    const originCount = corsOrigins.length;
    corsOriginsList =
      `\n   CORS Origins (${corsMode}) - ${originCount} origins:\n` +
      corsOrigins
        .map((origin) => `     ${chalk.gray('•')} ${chalk.cyan(origin)}`)
        .join('\n');
  } catch (error: any) {
    logger.error('CORS CONFIG ERROR', error);
    logger.error(`Error message: ${error?.message}`);
    if (error?.stack) {
      logger.error(`Error stack: ${error.stack}`);
    }
    corsOriginsList = `\n   CORS Origins: ${chalk.red('ERROR - Check logs above')}`;
  }

  // Log startup information using NestJS Logger (LoggingService not available in bootstrap)
  logger.log(`
  ------------------------------------------------------

   Application is running on: ${chalk.blue(`http://localhost:${port}/${globalPrefix}`)}
   Environment: ${chalk.blue(process.env.NODE_ENV)}
   Database: ${chalk.blue(database)}
   Swagger: ${chalk.blue(`http://localhost:${port}/v1`)}
   ${corsOriginsList}

  ------------------------------------------------------
  `);
}
void bootstrap();
