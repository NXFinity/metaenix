import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';

export class CreatePrivacyDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isFollowerOnly?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isSubscriberOnly?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isMatureContent?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  allowMessages?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  allowNotifications?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  allowFriendRequests?: boolean;
}

export class UpdatePrivacyDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isFollowerOnly?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isSubscriberOnly?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isMatureContent?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  allowMessages?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  allowNotifications?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  allowFriendRequests?: boolean;
}
