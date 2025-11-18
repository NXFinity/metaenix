import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsUrl,
  MaxLength,
  MinLength,
  ArrayMaxSize,
} from 'class-validator';

export class UpdateApplicationDto {
  @ApiProperty({
    description: 'Application name',
    example: 'My Updated App',
    minLength: 3,
    maxLength: 255,
    required: false,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Application description',
    example: 'An updated description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Redirect URIs for OAuth (max 10)',
    example: ['https://yourapp.com/callback'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  @ArrayMaxSize(10)
  @IsOptional()
  redirectUris?: string[];

  @ApiProperty({
    description: 'Application icon URL',
    example: 'https://yourapp.com/icon.png',
    required: false,
  })
  @IsUrl({ require_tld: false })
  @IsOptional()
  iconUrl?: string;

  @ApiProperty({
    description: 'Application website URL',
    example: 'https://yourapp.com',
    required: false,
  })
  @IsUrl({ require_tld: false })
  @IsOptional()
  websiteUrl?: string;

  @ApiProperty({
    description: 'Privacy policy URL',
    example: 'https://yourapp.com/privacy',
    required: false,
  })
  @IsUrl({ require_tld: false })
  @IsOptional()
  privacyPolicyUrl?: string;

  @ApiProperty({
    description: 'Terms of service URL',
    example: 'https://yourapp.com/terms',
    required: false,
  })
  @IsUrl({ require_tld: false })
  @IsOptional()
  termsOfServiceUrl?: string;

  @ApiProperty({
    description: 'Requested scopes',
    example: ['read:user', 'write:post'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];
}

