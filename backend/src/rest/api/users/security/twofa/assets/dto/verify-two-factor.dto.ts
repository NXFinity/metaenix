import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyTwoFactorDto {
  @ApiProperty({
    description: '6-digit TOTP code or backup code',
    example: '123456',
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 10)
  code: string;
}

