import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { TwofaService } from './twofa.service';
import { Security } from '../../assets/entities/security/security.entity';
import { User } from '../../assets/entities/user.entity';
import { LoggingService } from '@logging/logging';
import { AuditLogService } from '@logging/logging';
import { RedisService } from '@redis/redis';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';

jest.mock('speakeasy');
jest.mock('qrcode');
jest.mock('bcrypt');

describe('TwofaService', () => {
  let service: TwofaService;
  let securityRepository: jest.Mocked<Repository<Security>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let redisService: jest.Mocked<RedisService>;

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashed-password',
    security: {
      id: 'security-123',
      userId: 'user-123',
      isTwoFactorEnabled: false,
      twoFactorToken: null,
      backupCodes: null,
    } as unknown as Security,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwofaService,
        {
          provide: getRepositoryToken(Security),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') {
                return 'test-secret-key-that-is-at-least-32-characters-long';
              }
              return null;
            }),
          },
        },
        {
          provide: LoggingService,
          useValue: {
            error: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            log: jest.fn(),
            saveAuditLog: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            incr: jest.fn(),
            ttl: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TwofaService>(TwofaService);
    securityRepository = module.get(getRepositoryToken(Security));
    userRepository = module.get(getRepositoryToken(User));
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setupTwoFactor', () => {
    it('should successfully setup 2FA', async () => {
      const userId = 'user-123';
      const password = 'correct-password';
      const mockSecret = { base32: 'test-secret-base32' };
      const mockQrCode = 'data:image/png;base64,test-qr-code';

      userRepository.findOne.mockResolvedValue(mockUser as User);
      (bcrypt.compare as jest.Mock) = jest.fn().mockResolvedValue(true);
      (speakeasy.generateSecret as jest.Mock) = jest.fn().mockReturnValue(mockSecret);
      (speakeasy.otpauthURL as jest.Mock) = jest.fn().mockReturnValue('otpauth://totp/test');
      (QRCode.toDataURL as jest.Mock) = jest.fn().mockResolvedValue(mockQrCode);
      securityRepository.save.mockResolvedValue(mockUser.security as Security);

      const result = await service.setupTwoFactor(userId, password);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(result.qrCode).toBe(mockQrCode);
    });

    it('should throw error if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.setupTwoFactor('user-123', 'password')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error if password invalid', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as User);
      (bcrypt.compare as jest.Mock) = jest.fn().mockResolvedValue(false);

      await expect(service.setupTwoFactor('user-123', 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw error if 2FA already enabled', async () => {
      const userWith2FA = {
        ...mockUser,
        security: { ...mockUser.security, isTwoFactorEnabled: true } as Security,
      };
      userRepository.findOne.mockResolvedValue(userWith2FA as User);
      (bcrypt.compare as jest.Mock) = jest.fn().mockResolvedValue(true);

      await expect(service.setupTwoFactor('user-123', 'password')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('enableTwoFactor', () => {
    it('should successfully enable 2FA', async () => {
      const userId = 'user-123';
      const code = '123456';
      const userWithTempSecret = {
        ...mockUser,
        security: {
          ...mockUser.security,
          twoFactorToken: 'temp-secret',
        } as Security,
      };

      userRepository.findOne.mockResolvedValue(userWithTempSecret as User);
      (speakeasy.totp.verify as jest.Mock) = jest.fn().mockReturnValue(true);
      redisService.del.mockResolvedValue(1);
      securityRepository.save.mockResolvedValue(userWithTempSecret.security as Security);

      const result = await service.enableTwoFactor(userId, { code });

      expect(result).toHaveProperty('backupCodes');
      expect(Array.isArray(result.backupCodes)).toBe(true);
      expect(result.backupCodes.length).toBeGreaterThan(0);
    });

    it('should throw error if code invalid', async () => {
      const userId = 'user-123';
      const userWithTempSecret = {
        ...mockUser,
        security: {
          ...mockUser.security,
          twoFactorToken: 'temp-secret',
        } as Security,
      };

      userRepository.findOne.mockResolvedValue(userWithTempSecret as User);
      (speakeasy.totp.verify as jest.Mock) = jest.fn().mockReturnValue(false);
      redisService.incr.mockResolvedValue(1);

      await expect(service.enableTwoFactor(userId, { code: 'wrong' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyTwoFactor', () => {
    it('should successfully verify 2FA code', async () => {
      const userId = 'user-123';
      const code = '123456';
      const userWith2FA = {
        ...mockUser,
        security: {
          ...mockUser.security,
          isTwoFactorEnabled: true,
          twoFactorSecret: 'encrypted-secret',
        } as Security,
      };

      userRepository.findOne.mockResolvedValue(userWith2FA as User);
      (speakeasy.totp.verify as jest.Mock) = jest.fn().mockReturnValue(true);

      const result = await service.verifyTwoFactor(userId, { code });

      expect(result).toBe(true);
    });

    it('should verify backup code', async () => {
      const userId = 'user-123';
      const backupCode = 'BACKUP123';
      const hashedBackupCodes = ['$2b$10$hashed1', '$2b$10$hashed2'];
      const userWith2FA = {
        ...mockUser,
        security: {
          ...mockUser.security,
          isTwoFactorEnabled: true,
          backupCodes: hashedBackupCodes,
        } as unknown as Security,
      };

      userRepository.findOne.mockResolvedValue(userWith2FA as User);
      (bcrypt.compare as jest.Mock) = jest.fn().mockResolvedValue(true);
      securityRepository.save.mockResolvedValue(userWith2FA.security as Security);

      const result = await service.verifyTwoFactor(userId, { code: backupCode });

      expect(result).toBe(true);
    });
  });

  describe('disableTwoFactor', () => {
    it('should successfully disable 2FA', async () => {
      const userId = 'user-123';
      const password = 'correct-password';
      const userWith2FA = {
        ...mockUser,
        security: {
          ...mockUser.security,
          isTwoFactorEnabled: true,
        } as Security,
      };

      userRepository.findOne.mockResolvedValue(userWith2FA as User);
      (bcrypt.compare as jest.Mock) = jest.fn().mockResolvedValue(true);
      securityRepository.save.mockResolvedValue(userWith2FA.security as Security);

      await service.disableTwoFactor(userId, password);

      expect(securityRepository.save).toHaveBeenCalled();
    });

    it('should throw error if password invalid', async () => {
      const userWith2FA = {
        ...mockUser,
        security: {
          ...mockUser.security,
          isTwoFactorEnabled: true,
        } as Security,
      };

      userRepository.findOne.mockResolvedValue(userWith2FA as User);
      (bcrypt.compare as jest.Mock) = jest.fn().mockResolvedValue(false);

      await expect(service.disableTwoFactor('user-123', 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

