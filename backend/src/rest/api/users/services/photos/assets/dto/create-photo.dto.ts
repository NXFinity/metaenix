import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
} from 'class-validator';

export class CreatePhotoDto {
  @ApiProperty({
    description: 'Photo title',
    example: 'My Awesome Photo',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({
    description: 'Photo description',
    example: 'This is a description of my photo',
    required: false,
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Description cannot exceed 5000 characters' })
  description?: string | null;

  @ApiProperty({
    description: 'Whether the photo is public',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({
    description: 'Tags for categorization',
    example: ['nature', 'photography', 'landscape'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

