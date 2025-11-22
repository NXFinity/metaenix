import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { CommentResourceType } from '../enum/resource-type.enum';

export class CreateCommentDto {
  @ApiProperty({
    description: 'Comment content',
    example: 'Great post!',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000, { message: 'Comment cannot exceed 5000 characters' })
  content!: string;

  @ApiProperty({
    description: 'ID of parent comment if this is a reply',
    example: 'uuid-of-parent-comment',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(36, { message: 'Parent comment ID cannot exceed 36 characters (UUID format)' })
  parentCommentId?: string;
}

export class CreateCommentForResourceDto extends CreateCommentDto {
  @ApiProperty({
    description: 'Type of resource this comment is for',
    enum: CommentResourceType,
    example: CommentResourceType.POST,
  })
  @IsEnum(CommentResourceType)
  resourceType!: CommentResourceType;

  @ApiProperty({
    description: 'ID of the resource this comment is for',
    example: 'uuid-of-resource',
  })
  @IsString()
  @IsNotEmpty()
  resourceId!: string;
}

