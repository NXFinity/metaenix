import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { RedisService } from '@redis/redis';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Try cookie first (for httpOnly cookies)
        (request: any) => {
          return request?.cookies?.accessToken || null;
        },
        // Fallback to Authorization header (for legacy Bearer tokens)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Check token version - if token version doesn't match current version, token is invalidated
    const tokenVersionKey = this.redisService.keyBuilder.build(
      'auth',
      'token-version',
      payload.sub,
    );
    const currentVersionStr = await this.redisService.get<string>(tokenVersionKey, false);
    
    // STRICT: If a version exists in Redis, the token MUST have a matching version
    // Old tokens without tokenVersion are invalid if a version exists (session was terminated)
    if (currentVersionStr !== null) {
      const currentVersion = parseInt(currentVersionStr, 10) || 0;
      const tokenVersion = payload.tokenVersion ?? 0; // Old tokens without version default to 0
      
      // Token version MUST match current version
      if (tokenVersion !== currentVersion) {
        throw new UnauthorizedException('Token has been invalidated - session terminated');
      }
    } else if (payload.tokenVersion !== undefined && payload.tokenVersion > 0) {
      // Token has version but Redis doesn't - this shouldn't happen, but invalidate to be safe
      throw new UnauthorizedException('Token has been invalidated - session reset');
    }
    // If no version in Redis and token has no version, allow it (legacy tokens before versioning)

    // Return user data to be attached to request.user
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      roles: payload.roles,
      websocketId: payload.websocketId,
    };
  }
}
