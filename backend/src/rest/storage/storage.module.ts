import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { FileValidationService } from './services/file-validation.service';
import { ClamAVScannerService } from './services/clamav-scanner.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [StorageService, FileValidationService, ClamAVScannerService],
  exports: [StorageService],
})
export class StorageModule {}
