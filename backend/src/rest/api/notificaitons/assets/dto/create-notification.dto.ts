import { IsEnum, IsString, IsOptional, IsObject, MaxLength, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../enum/notification-type.enum';

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationType, example: NotificationType.FOLLOW })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiProperty({ example: 'New Follower' })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ example: 'John Doe started following you' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  message?: string;

  @ApiPropertyOptional({ example: { followerId: 'uuid' } })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ example: 'uuid' })
  @IsUUID()
  @IsOptional()
  relatedUserId?: string;

  @ApiPropertyOptional({ example: 'uuid' })
  @IsUUID()
  @IsOptional()
  relatedPostId?: string;

  @ApiPropertyOptional({ example: 'uuid' })
  @IsUUID()
  @IsOptional()
  relatedCommentId?: string;

  @ApiPropertyOptional({ example: '/users/johndoe' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  actionUrl?: string;
}

