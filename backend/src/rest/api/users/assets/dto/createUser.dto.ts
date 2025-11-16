import { PartialType } from '@nestjs/swagger';
import { CreateProfileDto, UpdateProfileDto } from './createProfile.dto';
import { CreatePrivacyDto, UpdatePrivacyDto } from './createPrivacy.dto';
import { ROLE } from 'src/security/roles/assets/enum/role.enum';
import {
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  SanitizeUsername,
  SanitizeDisplayName,
} from '../../../../../utils/sanitize-dto.util';

export class CreateUserDto {
  username: string;
  email: string;
  password: string;

  displayName?: string;

  role?: ROLE;

  profile: CreateProfileDto;
  privacy: CreatePrivacyDto;
}

export class UpdateUserDto {
  @ApiProperty({ required: false, example: 'johndoe' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, and hyphens',
  })
  @SanitizeUsername()
  username?: string;

  @ApiProperty({ required: false, example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @SanitizeDisplayName()
  displayName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  profile?: UpdateProfileDto;

  @ApiProperty({ required: false })
  @IsOptional()
  privacy?: UpdatePrivacyDto;

  // Explicitly exclude these fields - users cannot update:
  // - email (use separate email change process)
  // - password (use changePassword endpoint)
  // - role (admin only)
  // - websocketId (set during registration)
  // - id, dateCreated, dateUpdated, dateDeleted (auto-managed)
}
