import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { NotificationType } from '../enum/notification-type.enum';

export class MarkAllReadDto {
  @ApiProperty({
    description: 'Optional: Mark all notifications of a specific type as read',
    enum: NotificationType,
    required: false,
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;
}

