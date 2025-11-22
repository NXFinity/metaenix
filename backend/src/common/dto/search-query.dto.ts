import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export class SearchQueryDto extends PaginationDto {
  @ApiProperty({
    description: 'Search query string',
    example: 'example search',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  q!: string;
}

