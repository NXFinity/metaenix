import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
// import { ConfigService } from '@nestjs/config'; // Reserved for future use
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Application } from '../../assets/entities/application.entity';
import { OAuthToken } from '../../assets/entities/oauth-token.entity';
// import { User } from '../../../../rest/api/users/assets/entities/user.entity'; // Reserved for future use
import {
  AuthorizeDto,
  TokenDto,
  RevokeDto,
  IntrospectDto,
  GrantType,
} from '../../assets/dto';
import { ApplicationStatus } from '../../assets/enum/application-status.enum';
import { TokenType } from '../../assets/enum/token-type.enum';
import { BCRYPT_SALT_ROUNDS } from '../../../../common/constants/app.constants';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { ScopeService } from '../scopes/scope.service';
import { RedisService } from '@redis/redis';

@Injectable()
export class OAuthService {
  private readonly ACCESS_TOKEN_EXPIRES_IN = '1h'; // 1 hour
  private readonly REFRESH_TOKEN_EXPIRES_IN = '2h'; // 2 hours
  private readonly AUTHORIZATION_CODE_EXPIRES_IN = 600; // 10 minutes in seconds

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(OAuthToken)
    private readonly oauthTokenRepository: Repository<OAuthToken>,
    // @InjectRepository(User)
    // private readonly userRepository: Repository<User>, // Reserved for future use
    private readonly jwtService: JwtService,
    // private readonly configService: ConfigService, // Reserved for future use
    private readonly loggingService: LoggingService,
    private readonly scopeService: ScopeService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Generate authorization code
   */
  async authorize(
    authorizeDto: AuthorizeDto,
    userId: string,
  ): Promise<{ code: string; state?: string }> {
    const { clientId, redirectUri, scope, state, codeChallenge, codeChallengeMethod } =
      authorizeDto;

    // Validate response type
    if (authorizeDto.responseType !== 'code') {
      throw new BadRequestException('response_type must be "code"');
    }

    // Find application
    const application = await this.applicationRepository.findOne({
      where: { clientId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Check application status
    if (application.status !== ApplicationStatus.ACTIVE) {
      throw new ForbiddenException('Application is not active');
    }

    // Validate redirect URI
    if (!application.redirectUris || !application.redirectUris.includes(redirectUri)) {
      throw new BadRequestException('Invalid redirect URI');
    }

    // Parse and validate scopes
    const requestedScopes = scope.split(' ').filter((s) => s.length > 0);
    
    if (requestedScopes.length === 0) {
      throw new BadRequestException('At least one scope must be requested');
    }

    // Check if scopes are valid
    const { valid: validScopeIds, invalid: invalidScopeIds } = 
      this.scopeService.validateScopesList(requestedScopes);
    
    if (invalidScopeIds.length > 0) {
      const allScopes = this.scopeService.getAllScopes().map(s => s.id);
      throw new BadRequestException(
        `Invalid scopes requested: ${invalidScopeIds.join(', ')}. ` +
        `Available scopes: ${allScopes.join(', ')}`
      );
    }

    // Check if scopes are approved for this application
    const approvedScopes = application.scopes || [];
    const validScopes = validScopeIds.filter((scopeId) => approvedScopes.includes(scopeId));
    
    if (validScopes.length === 0) {
      const unapprovedScopes = validScopeIds.filter((scopeId) => !approvedScopes.includes(scopeId));
      throw new BadRequestException(
        `No approved scopes found. ` +
        `Requested scopes: ${requestedScopes.join(', ')}. ` +
        `Approved scopes for this application: ${approvedScopes.length > 0 ? approvedScopes.join(', ') : 'none'}. ` +
        `Unapproved scopes: ${unapprovedScopes.join(', ')}. ` +
        `Please update your application to include the requested scopes.`
      );
    }

    // Generate authorization code
    const code = crypto.randomBytes(32).toString('hex');
    const codeExpiresAt = new Date(
      Date.now() + this.AUTHORIZATION_CODE_EXPIRES_IN * 1000,
    );

    // Store authorization code
    const oauthToken = this.oauthTokenRepository.create({
      code,
      codeExpiresAt,
      applicationId: application.id,
      userId,
      scopes: validScopes,
      tokenType: TokenType.BEARER,
      expiresAt: codeExpiresAt, // Temporary, will be updated when exchanged
      revoked: false,
    });

    // Store PKCE challenge if provided
    if (codeChallenge && codeChallengeMethod) {
      // Store codeChallenge in a way that can be verified later
      // For now, we'll store it in the code field temporarily (not ideal, but works)
      // In production, you might want a separate table for PKCE challenges
      oauthToken.code = `${code}:${codeChallenge}:${codeChallengeMethod}`;
    }

    await this.oauthTokenRepository.save(oauthToken);

    this.loggingService.log('Authorization code generated', 'OAuthService', {
      category: LogCategory.SECURITY,
      metadata: {
        applicationId: application.id,
        userId,
        scopes: validScopes,
      },
    });

    return { code, state };
  }

  /**
   * Exchange authorization code for access token
   */
  async token(tokenDto: TokenDto): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    scope: string;
  }> {
    switch (tokenDto.grantType) {
      case GrantType.AUTHORIZATION_CODE:
        return this.handleAuthorizationCodeGrant(tokenDto);
      case GrantType.REFRESH_TOKEN:
        return this.handleRefreshTokenGrant(tokenDto);
      case GrantType.CLIENT_CREDENTIALS:
        return this.handleClientCredentialsGrant(tokenDto);
      default:
        throw new BadRequestException('Unsupported grant type');
    }
  }

  /**
   * Handle authorization code grant
   */
  private async handleAuthorizationCodeGrant(
    tokenDto: TokenDto,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    scope: string;
  }> {
    const { code, clientId, clientSecret, redirectUri, codeVerifier } = tokenDto;

    if (!code || !clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException('Missing required parameters');
    }

    // Find application
    const application = await this.applicationRepository.findOne({
      where: { clientId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Verify client secret
    const isSecretValid = await bcrypt.compare(clientSecret, application.clientSecret);
    if (!isSecretValid) {
      throw new UnauthorizedException('Invalid client credentials');
    }

    // Check application status
    if (application.status !== ApplicationStatus.ACTIVE) {
      throw new ForbiddenException('Application is not active');
    }

    // Find authorization code
    const oauthToken = await this.oauthTokenRepository.findOne({
      where: { code: code.includes(':') ? code.split(':')[0] : code },
      relations: ['application', 'user'],
    });

    if (!oauthToken) {
      throw new BadRequestException('Invalid authorization code');
    }

    // Check if code is expired
    if (oauthToken.codeExpiresAt && oauthToken.codeExpiresAt < new Date()) {
      throw new BadRequestException('Authorization code has expired');
    }

    // Check if code was already used
    if (oauthToken.accessToken) {
      throw new BadRequestException('Authorization code has already been used');
    }

    // Validate redirect URI
    if (oauthToken.application.redirectUris && !oauthToken.application.redirectUris.includes(redirectUri)) {
      throw new BadRequestException('Invalid redirect URI');
    }

    // Verify PKCE if code challenge was provided
    if (code.includes(':')) {
      const [, codeChallenge, codeChallengeMethod] = code.split(':');
      if (!codeVerifier) {
        throw new BadRequestException('Code verifier required for PKCE');
      }

      let expectedChallenge: string;
      if (codeChallengeMethod === 'S256') {
        expectedChallenge = crypto
          .createHash('sha256')
          .update(codeVerifier)
          .digest('base64url');
      } else if (codeChallengeMethod === 'plain') {
        expectedChallenge = codeVerifier;
      } else {
        throw new BadRequestException('Unsupported code challenge method');
      }

      if (expectedChallenge !== codeChallenge) {
        throw new BadRequestException('Invalid code verifier');
      }
    }

    // Generate tokens
    return this.generateTokens(oauthToken, application);
  }

  /**
   * Handle refresh token grant
   */
  private async handleRefreshTokenGrant(
    tokenDto: TokenDto,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    scope: string;
  }> {
    const { refreshToken } = tokenDto;

    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    // Generate SHA-256 hash for fast indexed lookup
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Find token by hash using indexed column (fast lookup - O(1) instead of O(n))
    const oauthToken = await this.oauthTokenRepository.findOne({
      where: { refreshTokenHash, revoked: false },
      relations: ['application', 'user'],
    });

    if (!oauthToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify with bcrypt for security (defense in depth)
    if (!oauthToken.refreshToken || !(await bcrypt.compare(refreshToken, oauthToken.refreshToken))) {
      // Hash matched but bcrypt verification failed (shouldn't happen, but security check)
      this.loggingService.error(
        'Refresh token hash collision detected',
        undefined,
        'OAuthService',
        {
          category: LogCategory.SECURITY,
          metadata: { tokenId: oauthToken.id },
        },
      );
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if refresh token is expired
    if (oauthToken.refreshExpiresAt && oauthToken.refreshExpiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Check if token is revoked
    if (oauthToken.revoked) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Revoke old token (token rotation)
    oauthToken.revoked = true;
    await this.oauthTokenRepository.save(oauthToken);

    // Create new token with same scopes
    const newOAuthToken = this.oauthTokenRepository.create({
      applicationId: oauthToken.applicationId,
      userId: oauthToken.userId,
      scopes: oauthToken.scopes,
      tokenType: TokenType.BEARER,
    });

    const application = await this.applicationRepository.findOne({
      where: { id: oauthToken.applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Generate new tokens
    return this.generateTokens(newOAuthToken, application);
  }

  /**
   * Handle client credentials grant
   */
  private async handleClientCredentialsGrant(
    tokenDto: TokenDto,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    scope: string;
  }> {
    const { clientId, clientSecret, scope } = tokenDto;

    if (!clientId || !clientSecret) {
      throw new BadRequestException('Client ID and secret are required');
    }

    // Find application
    const application = await this.applicationRepository.findOne({
      where: { clientId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Verify client secret
    const isSecretValid = await bcrypt.compare(clientSecret, application.clientSecret);
    if (!isSecretValid) {
      throw new UnauthorizedException('Invalid client credentials');
    }

    // Check application status
    if (application.status !== ApplicationStatus.ACTIVE) {
      throw new ForbiddenException('Application is not active');
    }

    // Parse and validate scopes
    const requestedScopes = scope ? scope.split(' ').filter((s) => s.length > 0) : [];
    const validScopes = requestedScopes.length > 0
      ? this.scopeService.validateRequestedScopes(requestedScopes, application.scopes || [])
      : application.scopes || []; // If no scopes requested, use all approved scopes

    // Create token (no user for client credentials)
    const oauthToken = this.oauthTokenRepository.create({
      applicationId: application.id,
      userId: null,
      scopes: validScopes,
      tokenType: TokenType.BEARER,
    });

    // Generate tokens
    return this.generateTokens(oauthToken, application);
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    oauthToken: OAuthToken,
    application: Application,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    scope: string;
  }> {
    // Calculate expiration times
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour
    const refreshExpiresAt = new Date(Date.now() + 7200 * 1000); // 2 hours

    // Generate JWT access token
    const accessTokenPayload = {
      sub: oauthToken.userId || application.id, // Use app ID for client credentials
      app: application.id,
      scopes: oauthToken.scopes,
      type: 'oauth',
    };

    const accessToken = this.jwtService.sign(accessTokenPayload, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
    });

    // Generate JWT refresh token
    const refreshTokenPayload = {
      sub: oauthToken.userId || application.id,
      app: application.id,
      type: 'oauth_refresh',
    };

    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
    });

    // Hash tokens before storing
    // Use bcrypt for secure storage (slow, but secure for verification)
    const hashedAccessToken = await bcrypt.hash(accessToken, BCRYPT_SALT_ROUNDS);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, BCRYPT_SALT_ROUNDS);

    // Generate SHA-256 hashes for fast indexed lookup (performance optimization)
    const accessTokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Save token to database
    oauthToken.accessToken = hashedAccessToken;
    oauthToken.refreshToken = hashedRefreshToken;
    oauthToken.accessTokenHash = accessTokenHash;
    oauthToken.refreshTokenHash = refreshTokenHash;
    oauthToken.expiresAt = expiresAt;
    oauthToken.refreshExpiresAt = refreshExpiresAt;
    oauthToken.code = null; // Clear authorization code
    oauthToken.codeExpiresAt = null;

    await this.oauthTokenRepository.save(oauthToken);

    this.loggingService.log('OAuth tokens generated', 'OAuthService', {
      category: LogCategory.SECURITY,
      metadata: {
        applicationId: application.id,
        userId: oauthToken.userId,
        scopes: oauthToken.scopes,
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600, // 1 hour in seconds
      scope: oauthToken.scopes.join(' '),
    };
  }

  /**
   * Revoke token
   */
  async revoke(revokeDto: RevokeDto): Promise<void> {
    const { token } = revokeDto;

    // Generate SHA-256 hash for fast indexed lookup
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find token by hash using indexed column (fast lookup)
    const oauthToken = await this.oauthTokenRepository.findOne({
      where: [
        { accessTokenHash: tokenHash, revoked: false },
        { refreshTokenHash: tokenHash, revoked: false },
      ],
      relations: ['application', 'user'],
    });

    if (!oauthToken) {
      // Return success even if token not found (security best practice)
      return;
    }

    // Verify with bcrypt for security (defense in depth)
    const isAccessToken = oauthToken.accessToken && await bcrypt.compare(token, oauthToken.accessToken);
    const isRefreshToken = oauthToken.refreshToken && await bcrypt.compare(token, oauthToken.refreshToken);

    if (!isAccessToken && !isRefreshToken) {
      // Hash matched but bcrypt verification failed (shouldn't happen, but security check)
      this.loggingService.error(
        'Token hash collision detected',
        undefined,
        'OAuthService',
        {
          category: LogCategory.SECURITY,
          metadata: { tokenId: oauthToken.id },
        },
      );
      return;
    }

    // Revoke token
    oauthToken.revoked = true;
    await this.oauthTokenRepository.save(oauthToken);

    this.loggingService.log('OAuth token revoked', 'OAuthService', {
      category: LogCategory.SECURITY,
      metadata: {
        tokenId: oauthToken.id,
      },
    });
  }

  /**
   * Introspect token
   */
  async introspect(introspectDto: IntrospectDto): Promise<{
    active: boolean;
    scope?: string;
    clientId?: string;
    username?: string;
    exp?: number;
  }> {
    const { token } = introspectDto;

    // Try to decode JWT first
    try {
      const payload = this.jwtService.decode(token) as any;
      if (payload && payload.exp && payload.exp * 1000 < Date.now()) {
        return { active: false };
      }
    } catch (error) {
      // Not a JWT, continue to database lookup
      // Track metrics for JWT decode failures
      const metricsKey = 'oauth:metrics:jwt_decode_failures';
      try {
        await this.redisService.incr(metricsKey);
        // Set TTL to 24 hours if this is the first increment
        const count = await this.redisService.get<number>(metricsKey, false);
        if (count === 1) {
          await this.redisService.expire(metricsKey, 86400); // 24 hours
        }
      } catch (metricsError) {
        // Don't fail the request if metrics tracking fails
        this.loggingService.warn(
          'Failed to track JWT decode failure metrics',
          'OAuthService',
          {
            category: LogCategory.SYSTEM,
            metadata: {
              error: metricsError instanceof Error ? metricsError.message : String(metricsError),
            },
          },
        );
      }

      // Log at debug level for normal operation
      this.loggingService.debug('JWT decode failed, using database lookup', 'OAuthService', {
        category: LogCategory.SECURITY,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          tokenLength: token.length,
          tokenPrefix: token.substring(0, Math.min(10, token.length)), // First 10 chars for pattern detection
        },
      });

      // Log at info level for security monitoring (potential attacks or misconfigurations)
      this.loggingService.log('JWT decode failed during token introspection', 'OAuthService', {
        category: LogCategory.SECURITY,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          tokenLength: token.length,
          tokenPrefix: token.substring(0, Math.min(10, token.length)), // First 10 chars for pattern detection
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Generate SHA-256 hash for fast indexed lookup
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find token by hash using indexed column (fast lookup - O(1) instead of O(n))
    const oauthToken = await this.oauthTokenRepository.findOne({
      where: [
        { accessTokenHash: tokenHash, revoked: false },
        { refreshTokenHash: tokenHash, revoked: false },
      ],
      relations: ['application', 'user'],
    });

    if (!oauthToken) {
      return { active: false };
    }

    // Verify with bcrypt for security (defense in depth)
    const isAccessToken = oauthToken.accessToken && await bcrypt.compare(token, oauthToken.accessToken);
    const isRefreshToken = oauthToken.refreshToken && await bcrypt.compare(token, oauthToken.refreshToken);

    if (!isAccessToken && !isRefreshToken) {
      // Hash matched but bcrypt verification failed (shouldn't happen, but security check)
      this.loggingService.error(
        'Token hash collision detected',
        undefined,
        'OAuthService',
        {
          category: LogCategory.SECURITY,
          metadata: { tokenId: oauthToken.id },
        },
      );
      return { active: false };
    }

    // Check if token is expired
    const isExpired =
      (oauthToken.expiresAt && oauthToken.expiresAt < new Date()) ||
      (oauthToken.refreshExpiresAt && oauthToken.refreshExpiresAt < new Date());

    if (isExpired || oauthToken.revoked) {
      return { active: false };
    }

    return {
      active: true,
      scope: oauthToken.scopes.join(' '),
      clientId: oauthToken.application.clientId,
      username: oauthToken.user?.username,
      exp: oauthToken.expiresAt ? Math.floor(oauthToken.expiresAt.getTime() / 1000) : undefined,
    };
  }

}

