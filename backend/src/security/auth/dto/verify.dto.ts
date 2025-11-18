import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VerifyDto {
  @ApiProperty({ example: 'a1b2c3d4e5f6...' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  token!: string;
}
