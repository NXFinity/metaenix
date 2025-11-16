import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggingService } from './logging.service';
import { StructuredLoggerService } from './services/structured-logger.service';
import { AuditLogService } from './services/audit-log.service';
import { AuditLog } from './entities/audit-log.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [
    LoggingService,
    StructuredLoggerService,
    AuditLogService,
  ],
  exports: [LoggingService, AuditLogService],
})
export class LoggingModule {}
