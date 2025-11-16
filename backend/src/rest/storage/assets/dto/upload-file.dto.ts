import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { StorageType } from '../enum/storage-type.enum';

export class UploadFileDto {
  @ApiProperty({
    description: 'Storage type for the file',
    enum: StorageType,
    example: StorageType.PROFILE,
  })
  @IsEnum(StorageType)
  storageType: StorageType;

  @ApiProperty({
    description: 'Sub-type for profile images (avatar, cover, offline, chat)',
    enum: ['avatar', 'cover', 'offline', 'chat'],
    required: false,
    example: 'avatar',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  subType?: string;

  @ApiProperty({
    description: 'Optional custom filename (without extension)',
    required: false,
    example: 'my-custom-filename',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  filename?: string;
}

export class UploadResponseDto {
  @ApiProperty({
    description: 'File URL in Digital Ocean Spaces',
    example: 'https://lon1.digitaloceanspaces.com/bucket/userId/profile/avatar/image.jpg',
  })
  url: string;

  @ApiProperty({
    description: 'File key/path in storage',
    example: 'userId/profile/avatar/image.jpg',
  })
  key: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1024000,
  })
  size: number;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'image/jpeg',
  })
  mimeType: string;

  @ApiProperty({
    description: 'Storage type',
    enum: StorageType,
    example: StorageType.PROFILE,
  })
  storageType: StorageType;

  @ApiProperty({
    description: 'Sub-type if applicable',
    required: false,
    example: 'avatar',
  })
  subType?: string;
}

