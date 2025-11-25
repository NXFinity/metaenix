import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, ValidateIf } from 'class-validator';

export class CreateShareDto {
  @ApiProperty({
    description: 'Optional comment when sharing',
    example: 'Check this out!',
    maxLength: 1000,
    required: false,
  })
  @IsOptional()
  @ValidateIf((o) => o.comment !== undefined && o.comment !== null && o.comment !== '')
  @IsString()
  @MaxLength(1000, { message: 'Share comment cannot exceed 1000 characters' })
  comment?: string;
}

