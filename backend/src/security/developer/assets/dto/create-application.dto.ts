import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsUrl,
  MaxLength,
  MinLength,
  ArrayMaxSize,
} from 'class-validator';
import { ApplicationEnvironment } from '../enum/application-environment.enum';

export class CreateApplicationDto {
  @ApiProperty({
    description: 'Application name',
    example: 'My Awesome App',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'Application description',
    example: 'A social media integration app',
    required: false,
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters' })
  description?: string;

  @ApiProperty({
    description: 'Application environment',
    enum: ApplicationEnvironment,
    example: ApplicationEnvironment.DEVELOPMENT,
  })
  @IsEnum(ApplicationEnvironment)
  environment!: ApplicationEnvironment;

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
    maxLength: 500,
  })
  @IsString()
  @IsUrl({ require_tld: false })
  @IsOptional()
  @MaxLength(500, { message: 'Icon URL cannot exceed 500 characters' })
  iconUrl?: string;

  @ApiProperty({
    description: 'Application website URL',
    example: 'https://yourapp.com',
    required: true,
    maxLength: 500,
  })
  @IsString()
  @IsUrl({ require_tld: false })
  @MaxLength(500, { message: 'Website URL cannot exceed 500 characters' })
  websiteUrl!: string;

  @ApiProperty({
    description: 'Privacy policy URL',
    example: 'https://yourapp.com/privacy',
    required: true,
    maxLength: 500,
  })
  @IsString()
  @IsUrl({ require_tld: false })
  @MaxLength(500, { message: 'Privacy policy URL cannot exceed 500 characters' })
  privacyPolicyUrl!: string;

  @ApiProperty({
    description: 'Terms of service URL',
    example: 'https://yourapp.com/terms',
    required: true,
    maxLength: 500,
  })
  @IsString()
  @IsUrl({ require_tld: false })
  @MaxLength(500, { message: 'Terms of service URL cannot exceed 500 characters' })
  termsOfServiceUrl!: string;

  @ApiProperty({
    description: 'Requested scopes',
    example: ['read:user', 'write:post'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true, message: 'Each scope cannot exceed 100 characters' })
  @IsOptional()
  scopes?: string[];
}

