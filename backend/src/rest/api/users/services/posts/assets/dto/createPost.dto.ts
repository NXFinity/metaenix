import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUrl,
  IsArray,
  MaxLength,
  IsNotEmpty,
  IsDateString,
  ValidateIf,
} from 'class-validator';

export class CreatePostDto {
  @ApiProperty({
    description: 'Post content text (optional if media is provided)',
    example: 'This is my first post!',
    maxLength: 10000,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(10000, { message: 'Content cannot exceed 10000 characters' })
  @ValidateIf((o) => !o.mediaUrl && (!o.mediaUrls || o.mediaUrls.length === 0) && !o.videoIds?.length)
  @IsNotEmpty({ message: 'Content is required when no media is provided' })
  content?: string;

  @ApiProperty({
    description: 'Single media URL (image/video)',
    example: 'https://example.com/image.jpg',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  mediaUrl?: string;

  @ApiProperty({
    description: 'Array of media URLs',
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  mediaUrls?: string[];

  @ApiProperty({
    description: 'Array of video IDs from user library to include in post',
    example: ['uuid-video-1', 'uuid-video-2'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videoIds?: string[];

  @ApiProperty({
    description: 'Link URL if post contains a link',
    example: 'https://example.com/article',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  linkUrl?: string;

  @ApiProperty({
    description: 'Link title',
    example: 'Interesting Article',
    required: false,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  linkTitle?: string;

  @ApiProperty({
    description: 'Link description',
    example: 'This article discusses...',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Link description cannot exceed 1000 characters' })
  linkDescription?: string;

  @ApiProperty({
    description: 'Link preview image URL',
    example: 'https://example.com/preview.jpg',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  linkImage?: string;

  @ApiProperty({
    description: 'Whether the post is public',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({
    description: 'Whether comments are allowed on this post',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @ApiProperty({
    description: 'Whether this post is a draft',
    example: false,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;

  @ApiProperty({
    description: 'ID of parent post if this is a reply',
    example: 'uuid-of-parent-post',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(36, { message: 'Parent post ID cannot exceed 36 characters (UUID format)' })
  parentPostId?: string;

  @ApiProperty({
    description: 'Scheduled date for the post (ISO 8601 format). Must be in the future.',
    example: '2025-12-31T10:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  @ValidateIf((o) => o.scheduledDate !== undefined)
  scheduledDate?: string;
}

export class UpdatePostDto extends PartialType(CreatePostDto) {}

export class CreateShareDto {
  @ApiProperty({
    description: 'Optional comment when sharing',
    example: 'Check this out!',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
