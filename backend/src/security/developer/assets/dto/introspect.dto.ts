import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IntrospectDto {
  @ApiProperty({
    description: 'Token to introspect (access token or refresh token)',
    example: 'access_token_123',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiPropertyOptional({
    description: 'Token type hint (optional)',
    example: 'access_token',
    enum: ['access_token', 'refresh_token'],
  })
  @IsString()
  @IsOptional()
  tokenTypeHint?: string;
}

