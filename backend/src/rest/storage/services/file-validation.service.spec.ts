import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FileValidationService } from './file-validation.service';
import { LoggingService } from '@logging/logging';

describe('FileValidationService', () => {
  let service: FileValidationService;
  let loggingService: jest.Mocked<LoggingService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileValidationService,
        {
          provide: LoggingService,
          useValue: {
            error: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FileValidationService>(FileValidationService);
    loggingService = module.get(LoggingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateFileContent', () => {
    it('should validate JPEG file content', () => {
      // JPEG magic bytes: FFD8FF
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
      
      expect(() => {
        service.validateFileContent(jpegBuffer, 'image/jpeg');
      }).not.toThrow();
    });

    it('should validate PNG file content', () => {
      // PNG magic bytes: 89504E47
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      
      expect(() => {
        service.validateFileContent(pngBuffer, 'image/png');
      }).not.toThrow();
    });

    it('should validate GIF file content', () => {
      // GIF magic bytes: 47494638
      const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      
      expect(() => {
        service.validateFileContent(gifBuffer, 'image/gif');
      }).not.toThrow();
    });

    it('should validate PDF file content', () => {
      // PDF magic bytes: 255044462D (%PDF-)
      const pdfBuffer = Buffer.from('%PDF-1.4\n');
      
      expect(() => {
        service.validateFileContent(pdfBuffer, 'application/pdf');
      }).not.toThrow();
    });

    it('should validate text file content', () => {
      const textBuffer = Buffer.from('This is a plain text file\nWith multiple lines\n');
      
      expect(() => {
        service.validateFileContent(textBuffer, 'text/plain');
      }).not.toThrow();
    });

    it('should validate SVG file content', () => {
      const svgBuffer = Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>');
      
      expect(() => {
        service.validateFileContent(svgBuffer, 'image/svg+xml');
      }).not.toThrow();
    });

    it('should throw error if file content does not match MIME type', () => {
      // PNG buffer declared as JPEG
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      
      expect(() => {
        service.validateFileContent(pngBuffer, 'image/jpeg');
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateFileContent(pngBuffer, 'image/jpeg');
      }).toThrow('File content does not match declared type');
    });

    it('should throw error if file is empty', () => {
      const emptyBuffer = Buffer.alloc(0);
      
      expect(() => {
        service.validateFileContent(emptyBuffer, 'image/jpeg');
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateFileContent(emptyBuffer, 'image/jpeg');
      }).toThrow('File is empty');
    });

    it('should throw error if text file contains binary data', () => {
      // Text file with null bytes (binary)
      const binaryBuffer = Buffer.from([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x00, 0x57, 0x6F, 0x72, 0x6C, 0x64]);
      
      expect(() => {
        service.validateFileContent(binaryBuffer, 'text/plain');
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateFileContent(binaryBuffer, 'text/plain');
      }).toThrow('File appears to be binary');
    });

    it('should allow JPEG and JPG as same type', () => {
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      
      expect(() => {
        service.validateFileContent(jpegBuffer, 'image/jpg');
      }).not.toThrow();
    });

    it('should allow MPEG and MP3 as same type', () => {
      // MP3 with ID3 tag
      const mp3Buffer = Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00]);
      
      expect(() => {
        service.validateFileContent(mp3Buffer, 'audio/mp3');
      }).not.toThrow();
    });

    it('should allow ZIP-based Office formats', () => {
      // ZIP magic bytes: 504B0304
      const zipBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
      
      expect(() => {
        service.validateFileContent(zipBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      }).not.toThrow();
    });

    it('should skip validation for unknown MIME types (TEMP storage)', () => {
      const unknownBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      
      expect(() => {
        service.validateFileContent(unknownBuffer, 'application/x-unknown');
      }).not.toThrow();
      expect(loggingService.log).toHaveBeenCalled();
    });
  });

  describe('detectFileType', () => {
    it('should detect JPEG from buffer', () => {
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      const detected = service.detectFileType(jpegBuffer);
      expect(detected).toBe('image/jpeg');
    });

    it('should detect PNG from buffer', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
      const detected = service.detectFileType(pngBuffer);
      expect(detected).toBe('image/png');
    });

    it('should detect PDF from buffer', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4');
      const detected = service.detectFileType(pdfBuffer);
      expect(detected).toBe('application/pdf');
    });

    it('should return null for unknown file types', () => {
      const unknownBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      const detected = service.detectFileType(unknownBuffer);
      expect(detected).toBeNull();
    });
  });
});

