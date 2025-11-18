import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TokenTypeHint } from './introspect.dto';

export class RevokeDto {
  @ApiProperty({
    description: 'Token to revoke (access token or refresh token)',
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

