import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ReportResourceType } from '../enum/resource-type.enum';
import { ReportReason } from '../enum/report-reason.enum';

export class CreateReportDto {
  @IsEnum(ReportResourceType)
  @IsNotEmpty()
  resourceType!: ReportResourceType;

  @IsUUID()
  @IsNotEmpty()
  resourceId!: string;

  @IsEnum(ReportReason)
  @IsNotEmpty()
  reason!: ReportReason;

  @IsString()
  @IsOptional()
  description?: string;
}

