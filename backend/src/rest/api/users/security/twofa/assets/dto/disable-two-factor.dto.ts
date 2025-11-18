import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class DisableTwoFactorDto {
  @ApiProperty({
    description: 'User password for verification',
    example: 'SecurePassword123!',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}

