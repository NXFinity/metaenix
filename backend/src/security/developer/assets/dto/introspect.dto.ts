import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TokenTypeHint {
  ACCESS_TOKEN = 'access_token',
  REFRESH_TOKEN = 'refresh_token',
}

export class IntrospectDto {
  @ApiProperty({
    description: 'Token to introspect (access token or refresh token)',
    example: 'access_token_123',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  token!: string;

  @ApiPropertyOptional({
    description: 'Token type hint (optional)',
    example: 'access_token',
    enum: TokenTypeHint,
  })
  @IsEnum(TokenTypeHint)
  @IsOptional()
  tokenTypeHint?: TokenTypeHint;
}

