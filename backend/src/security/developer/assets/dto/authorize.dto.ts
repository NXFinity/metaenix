import { IsString, IsNotEmpty, IsOptional, IsArray, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthorizeDto {
  @ApiProperty({
    description: 'Client ID of the application',
    example: 'abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({
    description: 'Redirect URI where the authorization code will be sent',
    example: 'https://example.com/callback',
  })
  @IsUrl({ require_protocol: true })
  @IsNotEmpty()
  redirectUri: string;

  @ApiProperty({
    description: 'Space-separated list of scopes to request',
    example: 'read:profile write:posts',
  })
  @IsString()
  @IsNotEmpty()
  scope: string;

  @ApiProperty({
    description: 'Response type (must be "code" for Authorization Code flow)',
    example: 'code',
    enum: ['code'],
  })
  @IsString()
  @IsNotEmpty()
  responseType: string;

  @ApiPropertyOptional({
    description: 'State parameter for CSRF protection',
    example: 'random-state-string',
  })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({
    description: 'Code challenge for PKCE (base64url encoded)',
    example: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  })
  @IsString()
  @IsOptional()
  codeChallenge?: string;

  @ApiPropertyOptional({
    description: 'Code challenge method for PKCE',
    example: 'S256',
    enum: ['S256', 'plain'],
  })
  @IsString()
  @IsOptional()
  codeChallengeMethod?: string;
}

