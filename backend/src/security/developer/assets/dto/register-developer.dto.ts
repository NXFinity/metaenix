import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class RegisterDeveloperDto {
  @ApiProperty({
    description: 'Acceptance of developer terms and conditions',
    example: true,
  })
  @IsBoolean()
  acceptTerms: boolean;
}

