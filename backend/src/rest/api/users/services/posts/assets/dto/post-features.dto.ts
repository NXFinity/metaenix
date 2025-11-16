import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class BookmarkPostDto {
  @ApiProperty({
    description: 'Optional note about why bookmarking',
    example: 'Want to read this later',
    required: false,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class ReportPostDto {
  @ApiProperty({
    description: 'Reason for reporting',
    enum: [
      'spam',
      'harassment',
      'hate_speech',
      'violence',
      'copyright',
      'false_information',
      'inappropriate_content',
      'other',
    ],
    example: 'spam',
  })
  @IsEnum([
    'spam',
    'harassment',
    'hate_speech',
    'violence',
    'copyright',
    'false_information',
    'inappropriate_content',
    'other',
  ])
  reason:
    | 'spam'
    | 'harassment'
    | 'hate_speech'
    | 'violence'
    | 'copyright'
    | 'false_information'
    | 'inappropriate_content'
    | 'other';

  @ApiProperty({
    description: 'Additional details about the report',
    example: 'This post contains spam content',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class ReactToPostDto {
  @ApiProperty({
    description: 'Type of reaction',
    enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry'],
    example: 'love',
  })
  @IsEnum(['like', 'love', 'laugh', 'wow', 'sad', 'angry'])
  reactionType: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';
}

export class CreateCollectionDto {
  @ApiProperty({
    description: 'Collection name',
    example: 'My Favorite Posts',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'Collection description',
    example: 'A collection of my favorite posts',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Whether the collection is public',
    example: false,
    default: false,
    required: false,
  })
  @IsOptional()
  isPublic?: boolean;

  @ApiProperty({
    description: 'Cover image URL for the collection',
    example: 'https://example.com/cover.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  coverImage?: string;
}

export class SchedulePostDto {
  @ApiProperty({
    description: 'Date and time to publish the post',
    example: '2025-12-25T10:00:00Z',
  })
  @IsDateString()
  scheduledDate: string;
}

