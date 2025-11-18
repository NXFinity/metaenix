import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum GrantType {
  AUTHORIZATION_CODE = 'authorization_code',
  REFRESH_TOKEN = 'refresh_token',
  CLIENT_CREDENTIALS = 'client_credentials',
}

export class TokenDto {
  @ApiProperty({
    description: 'Grant type',
    enum: GrantType,
    example: GrantType.AUTHORIZATION_CODE,
  })
  @IsEnum(GrantType)
  @IsNotEmpty()
  grantType!: GrantType;

  @ApiPropertyOptional({
    description: 'Client ID (required for authorization_code and client_credentials)',
    example: 'abc123def456',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Client secret (required for authorization_code and client_credentials)',
    example: 'secret123',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  clientSecret?: string;

  @ApiPropertyOptional({
    description: 'Authorization code (required for authorization_code grant)',
    example: 'auth_code_123',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  code?: string;

  @ApiPropertyOptional({
    description: 'Redirect URI (required for authorization_code grant)',
    example: 'https://example.com/callback',
  })
  @IsUrl({ require_protocol: true })
  @IsOptional()
  @MaxLength(500)
  redirectUri?: string;

  @ApiPropertyOptional({
    description: 'Code verifier for PKCE (required if PKCE was used)',
    example: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  codeVerifier?: string;

  @ApiPropertyOptional({
    description: 'Refresh token (required for refresh_token grant)',
    example: 'refresh_token_123',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  refreshToken?: string;

  @ApiPropertyOptional({
    description: 'Scope (optional for refresh_token grant)',
    example: 'read:profile write:posts',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  scope?: string;
}

