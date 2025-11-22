import { IsOptional, IsString, MaxLength, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSocialDto {
  @ApiProperty({ required: false, example: 'https://twitter.com/username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'Twitter must be a valid URL' })
  twitter?: string;

  @ApiProperty({ required: false, example: 'https://instagram.com/username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'Instagram must be a valid URL' })
  instagram?: string;

  @ApiProperty({ required: false, example: 'https://facebook.com/username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'Facebook must be a valid URL' })
  facebook?: string;

  @ApiProperty({ required: false, example: 'https://github.com/username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'GitHub must be a valid URL' })
  github?: string;

  @ApiProperty({ required: false, example: 'https://linkedin.com/in/username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'LinkedIn must be a valid URL' })
  linkedin?: string;

  @ApiProperty({ required: false, example: 'https://youtube.com/@username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'YouTube must be a valid URL' })
  youtube?: string;

  @ApiProperty({ required: false, example: 'https://tiktok.com/@username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'TikTok must be a valid URL' })
  tiktok?: string;

  @ApiProperty({ required: false, example: 'https://discord.gg/username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'Discord must be a valid URL' })
  discord?: string;

  @ApiProperty({ required: false, example: 'https://twitch.tv/username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'Twitch must be a valid URL' })
  twitch?: string;

  @ApiProperty({ required: false, example: 'username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  snapchat?: string;

  @ApiProperty({ required: false, example: 'https://pinterest.com/username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'Pinterest must be a valid URL' })
  pinterest?: string;

  @ApiProperty({ required: false, example: 'https://reddit.com/user/username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'Reddit must be a valid URL' })
  reddit?: string;
}

export class UpdateSocialDto {
  @ApiProperty({ required: false, example: 'https://twitter.com/username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'Twitter must be a valid URL' })
  twitter?: string;

  @ApiProperty({ required: false, example: 'https://instagram.com/username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'Instagram must be a valid URL' })
  instagram?: string;

  @ApiProperty({ required: false, example: 'https://facebook.com/username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'Facebook must be a valid URL' })
  facebook?: string;

  @ApiProperty({ required: false, example: 'https://github.com/username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'GitHub must be a valid URL' })
  github?: string;

  @ApiProperty({ required: false, example: 'https://linkedin.com/in/username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'LinkedIn must be a valid URL' })
  linkedin?: string;

  @ApiProperty({ required: false, example: 'https://youtube.com/@username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'YouTube must be a valid URL' })
  youtube?: string;

  @ApiProperty({ required: false, example: 'https://tiktok.com/@username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'TikTok must be a valid URL' })
  tiktok?: string;

  @ApiProperty({ required: false, example: 'https://discord.gg/username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'Discord must be a valid URL' })
  discord?: string;

  @ApiProperty({ required: false, example: 'https://twitch.tv/username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'Twitch must be a valid URL' })
  twitch?: string;

  @ApiProperty({ required: false, example: 'username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  snapchat?: string;

  @ApiProperty({ required: false, example: 'https://pinterest.com/username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'Pinterest must be a valid URL' })
  pinterest?: string;

  @ApiProperty({ required: false, example: 'https://reddit.com/user/username' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({}, { message: 'Reddit must be a valid URL' })
  reddit?: string;
}

