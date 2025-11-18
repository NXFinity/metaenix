import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { OAuthService } from './oauth.service';
import {
  AuthorizeDto,
  TokenDto,
  RevokeDto,
  IntrospectDto,
} from '../../assets/dto';
import { AuthGuard } from '../../../auth/guards/auth.guard';
import { AdminGuard } from '../../../auth/guards/admin.guard';
import { CurrentUser } from '../../../auth/decorators/currentUser.decorator';
import { User } from '../../../../rest/api/users/assets/entities/user.entity';
import { Public } from '../../../auth/decorators/public.decorator';

@ApiTags('OAuth')
@Controller('oauth')
@UseGuards(AuthGuard, AdminGuard)
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  /**
   * Authorization endpoint
   * GET /oauth/authorize
   * Requires user authentication and Administrator role
   */
  @Get('authorize')
  @ApiOperation({
    summary: 'OAuth 2.0 Authorization Endpoint',
    description:
      'Generates an authorization code for the OAuth 2.0 Authorization Code flow. User must be authenticated.',
  })
  @ApiQuery({ name: 'client_id', description: 'Client ID', required: true })
  @ApiQuery({ name: 'redirect_uri', description: 'Redirect URI', required: true })
  @ApiQuery({ name: 'response_type', description: 'Must be "code"', required: true })
  @ApiQuery({ name: 'scope', description: 'Space-separated scopes', required: true })
  @ApiQuery({ name: 'state', description: 'CSRF protection state', required: false })
  @ApiQuery({ name: 'code_challenge', description: 'PKCE code challenge', required: false })
  @ApiQuery({ name: 'code_challenge_method', description: 'PKCE method (S256 or plain)', required: false })
  @ApiResponse({
    status: 200,
    description: 'Authorization code generated successfully',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'abc123def456' },
        state: { type: 'string', example: 'random-state-string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async authorize(
    @Query() query: {
      client_id: string;
      redirect_uri: string;
      response_type: string;
      scope: string;
      state?: string;
      code_challenge?: string;
      code_challenge_method?: string;
    },
    @CurrentUser() user: User,
  ) {
    const authorizeDto: AuthorizeDto = {
      clientId: query.client_id,
      redirectUri: query.redirect_uri,
      responseType: query.response_type,
      scope: query.scope,
      state: query.state,
      codeChallenge: query.code_challenge,
      codeChallengeMethod: query.code_challenge_method,
    };

    return this.oauthService.authorize(authorizeDto, user.id);
  }

  /**
   * Token endpoint
   * POST /oauth/token
   * Public endpoint (requires client credentials in body)
   */
  @Post('token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'OAuth 2.0 Token Endpoint',
    description:
      'Exchanges authorization code for access token, refreshes access token, or issues client credentials token.',
  })
  @ApiBody({ type: TokenDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens issued successfully',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        tokenType: { type: 'string', example: 'Bearer' },
        expiresIn: { type: 'number', example: 3600 },
        scope: { type: 'string', example: 'read:profile write:posts' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async token(@Body() tokenDto: TokenDto) {
    return this.oauthService.token(tokenDto);
  }

  /**
   * Revocation endpoint
   * POST /oauth/revoke
   * Public endpoint (token is in body)
   */
  @Post('revoke')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'OAuth 2.0 Token Revocation Endpoint',
    description: 'Revokes an access token or refresh token.',
  })
  @ApiBody({ type: RevokeDto })
  @ApiResponse({
    status: 200,
    description: 'Token revoked successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async revoke(@Body() revokeDto: RevokeDto) {
    await this.oauthService.revoke(revokeDto);
    return { message: 'Token revoked successfully' };
  }

  /**
   * Introspection endpoint
   * POST /oauth/introspect
   * Public endpoint (token is in body)
   */
  @Post('introspect')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'OAuth 2.0 Token Introspection Endpoint',
    description: 'Returns information about a token (RFC 7662).',
  })
  @ApiBody({ type: IntrospectDto })
  @ApiResponse({
    status: 200,
    description: 'Token introspection result',
    schema: {
      type: 'object',
      properties: {
        active: { type: 'boolean', example: true },
        scope: { type: 'string', example: 'read:profile write:posts' },
        clientId: { type: 'string', example: 'abc123def456' },
        username: { type: 'string', example: 'john_doe' },
        exp: { type: 'number', example: 1234567890 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async introspect(@Body() introspectDto: IntrospectDto) {
    return this.oauthService.introspect(introspectDto);
  }
}

