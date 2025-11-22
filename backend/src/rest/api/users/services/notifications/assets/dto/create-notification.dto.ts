import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject, MaxLength } from 'class-validator';
import { NotificationType } from '../enum/notification-type.enum';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
    example: NotificationType.FOLLOW,
  })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type!: NotificationType;

  @ApiProperty({
    description: 'Notification title',
    example: 'New Follower',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'John Doe started following you',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Notification message cannot exceed 1000 characters' })
  message?: string | null;

  @ApiProperty({
    description: 'Additional metadata as JSON object',
    example: { followerUsername: 'johndoe' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any> | null;

  @ApiProperty({
    description: 'Related user ID (e.g., follower ID, liker ID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(36, { message: 'Related user ID cannot exceed 36 characters (UUID format)' })
  relatedUserId?: string | null;

  @ApiProperty({
    description: 'Related post ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(36, { message: 'Related post ID cannot exceed 36 characters (UUID format)' })
  relatedPostId?: string | null;

  @ApiProperty({
    description: 'Related comment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(36, { message: 'Related comment ID cannot exceed 36 characters (UUID format)' })
  relatedCommentId?: string | null;

  @ApiProperty({
    description: 'Action URL to navigate to when notification is clicked',
    example: '/johndoe',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  actionUrl?: string | null;
}

