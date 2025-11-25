import { IsEnum, IsNotEmpty } from 'class-validator';
import { ReportStatus } from '../enum/report-status.enum';

export class UpdateReportStatusDto {
  @IsEnum(ReportStatus)
  @IsNotEmpty()
  status!: ReportStatus;
}

