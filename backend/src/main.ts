import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getCorsOriginFunction, getCorsOrigins } from './config/cors.config';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setupSwagger } from './functions/swagger.function';

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
        'Access-Control-Allow-Origin',
      ],
    },
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
  await app.listen(port);

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
