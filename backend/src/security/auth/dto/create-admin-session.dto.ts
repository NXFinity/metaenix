import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAdminSessionDto {
  @IsNotEmpty()
  @IsString()
  sessionToken!: string;
}
