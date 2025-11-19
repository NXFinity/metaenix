import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../enum/notification-type.enum';

export class MarkAllReadDto {
  @ApiPropertyOptional({ enum: NotificationType, description: 'Optional: Mark only specific notification type as read' })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;
}

