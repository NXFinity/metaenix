import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '../enum/notification-type.enum';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class NotificationFiltersDto extends PaginationDto {
  @ApiProperty({
    name: 'type',
    enum: NotificationType,
    required: false,
    description: 'Filter by notification type',
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiProperty({
    name: 'isRead',
    type: Boolean,
    required: false,
    description: 'Filter by read status (true/false)',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRead?: boolean;
}

