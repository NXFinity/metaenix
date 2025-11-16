import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Refresh Token Strategy
 *
 * Validates JWT refresh tokens for obtaining new access tokens
 * Extracts refresh token from request body
 */
@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Extract refresh token from request body
          return request?.body?.refreshToken;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: (() => {
        const refreshSecret = configService.get<string>('REFRESH_TOKEN_SECRET');
        if (!refreshSecret) {
          throw new Error('REFRESH_TOKEN_SECRET environment variable is required');
        }
        return refreshSecret;
      })(),
      passReqToCallback: true, // Pass request to validate method
    });
  }

  /**
   * Validate refresh token payload
   *
   * This method is called after JWT signature is verified
   * Return value is attached to request.user
   *
   * @param req - Express request object
   * @param payload - Decoded JWT payload
   * @returns User object with refresh token
   */
  async validate(req: Request, payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    const refreshToken = req.body?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    // Return user data and refresh token
    return {
      id: payload.sub,
      refreshToken,
    };
  }
}
