import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;
}

