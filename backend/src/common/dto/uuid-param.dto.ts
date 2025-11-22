import { IsUUID } from 'class-validator';

/**
 * DTO for validating UUID path parameters
 * Use this as a base class for path parameter validation
 */
export class UuidParamDto {
  @IsUUID('4', { message: 'Invalid UUID format' })
  id!: string;
}

