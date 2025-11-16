import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class SetupTwoFactorDto {
  @ApiProperty({
    description: 'User password for verification',
    example: 'SecurePassword123!',
  })
  @IsNotEmpty()
  password: string;
}

