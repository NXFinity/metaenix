import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
// import * as bcrypt from 'bcrypt'; // Reserved for future use
import { OAuthToken } from '../../assets/entities/oauth-token.entity';
// import { Application } from '../../assets/entities/application.entity'; // Reserved for future use
import { ApplicationStatus } from '../../assets/enum/application-status.enum';
// import { User } from '../../../../rest/api/users/assets/entities/user.entity'; // Reserved for future use

interface OAuthPayload {
  sub: string;
  app: string;
  scopes?: string[];
  type: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class OAuthStrategy extends PassportStrategy(Strategy, 'oauth') {
  private readonly oauthTokenRepository: Repository<OAuthToken>;

  constructor(
    configService: ConfigService,
    @InjectRepository(OAuthToken)
    oauthTokenRepository: Repository<OAuthToken>,
    // @InjectRepository(Application)
    // private readonly applicationRepository: Repository<Application>, // Reserved for future use
    // @InjectRepository(User)
    // private readonly userRepository: Repository<User>, // Reserved for future use
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
    this.oauthTokenRepository = oauthTokenRepository;
  }

  async validate(payload: OAuthPayload) {
    // Check if this is an OAuth token (not a regular JWT)
    if (payload.type !== 'oauth') {
      throw new UnauthorizedException('Invalid token type');
    }

    if (!payload.sub || !payload.app) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Find token in database by application and user
    // For client credentials, userId is null, so we need to handle that
    const whereCondition: any = {
      applicationId: payload.app,
    };
    if (payload.sub) {
      whereCondition.userId = payload.sub;
    } else {
      whereCondition.userId = IsNull();
    }

    const oauthToken = await this.oauthTokenRepository.findOne({
      where: whereCondition,
      relations: ['application', 'user'],
      order: { dateCreated: 'DESC' }, // Get most recent token
    });

    if (!oauthToken) {
      throw new UnauthorizedException('Token not found');
    }

    // Check if token is revoked
    if (oauthToken.revoked) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Check if token is expired
    if (oauthToken.expiresAt && oauthToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Token has expired');
    }

    // Check application status
    if (oauthToken.application.status !== ApplicationStatus.ACTIVE) {
      throw new UnauthorizedException('Application is not active');
    }

    // Update last used timestamp
    oauthToken.lastUsed = new Date();
    await this.oauthTokenRepository.save(oauthToken);

    // Return OAuth token info to be attached to request
    return {
      id: oauthToken.userId || oauthToken.applicationId,
      userId: oauthToken.userId,
      applicationId: oauthToken.applicationId,
      application: oauthToken.application,
      user: oauthToken.user,
      scopes: oauthToken.scopes,
      tokenType: 'oauth',
    };
  }
}

