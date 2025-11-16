import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@redis/redis';
import * as session from 'express-session';
import RedisStore from 'connect-redis';

@Injectable()
export class SessionStoreConfig implements OnModuleInit {
  private store: session.Store | null = null;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Wait for Redis to be connected before creating store
    // Retry logic in case Redis isn't ready yet
    let retries = 50; // Increased retries for slower connections
    while (!this.redisService.isRedisConnected() && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries--;
    }

    if (!this.redisService.isRedisConnected()) {
      throw new Error('Redis is not connected. Cannot create session store.');
    }

    const redisClient = this.redisService.getClient();
    
    // connect-redis v7 exports RedisStore as a class directly
    // This version supports ioredis clients
    const sessionPrefix = this.configService.get<string>('REDIS_SESSION_PREFIX');
    const sessionTtl = this.configService.get<number>('SESSION_TTL');
    
    if (!sessionPrefix) {
      throw new Error('REDIS_SESSION_PREFIX environment variable is required');
    }
    if (sessionTtl === undefined) {
      throw new Error('SESSION_TTL environment variable is required');
    }
    
    this.store = new RedisStore({
      client: redisClient,
      prefix: sessionPrefix,
      ttl: sessionTtl,
    });
  }

  /**
   * Get Redis session store
   */
  getStore(): session.Store {
    if (!this.store) {
      throw new Error('Session store not initialized. Redis may not be connected.');
    }
    return this.store;
  }
}

