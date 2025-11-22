import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { UsersService } from '../../rest/api/users/users.service';
import { EmailService } from '@email/email';
import { LoggingService } from '@logging/logging';
import { RedisService } from '@redis/redis';
import { TwofaService } from '../../rest/api/users/security/twofa/twofa.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyDto } from './dto/verify.dto';
import { ChangeDto } from './dto/change.dto';
import { ForgotDto } from './dto/forgot.dto';
import { ResetDto } from './dto/reset.dto';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { Security } from '../../rest/api/users/assets/entities/security/security.entity';
import { ROLE } from '../roles/assets/enum/role.enum';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('crypto');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let emailService: jest.Mocked<EmailService>;
  let loggingService: jest.Mocked<LoggingService>;
  let redisService: jest.Mocked<RedisService>;

  const mockUser: Partial<User> = {
    id: 'user-123',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword123',
    websocketId: 'ws-123',
    role: ROLE.Member,
    dateCreated: new Date(),
    dateUpdated: new Date(),
  };

  const mockSecurity: Partial<Security> = {
    id: 'security-123',
    user: mockUser as User,
    isVerified: false,
    isTwoFactorEnabled: false,
    isBanned: false,
    isTimedOut: false,
    verificationToken: 'test-token-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            existsByEmail: jest.fn(),
            existsByUsername: jest.fn(),
            create: jest.fn(),
            findByEmail: jest.fn(),
            findOne: jest.fn(),
            updateSecurityVerification: jest.fn(),
            findSecurityByVerificationToken: jest.fn(),
            updateSecurityVerificationStatus: jest.fn(),
            updateUserPassword: jest.fn(),
            findSecurityByPasswordResetToken: jest.fn(),
            updatePasswordResetToken: jest.fn(),
            clearPasswordResetToken: jest.fn(),
            findSecurityByUserEmail: jest.fn(),
            findUserWithSecurityByEmail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendVerificationEmail: jest.fn(),
            sendPasswordResetEmail: jest.fn(),
            sendForgotPasswordEmail: jest.fn(),
            sendPasswordChangedEmail: jest.fn(),
          },
        },
        {
          provide: LoggingService,
          useValue: {
            error: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
            keyBuilder: {
              build: jest.fn((...args) => args.join(':')),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                USE_HTTPONLY_COOKIES: 'false',
                JWT_EXPIRES_IN: '1h',
                REFRESH_TOKEN_EXPIRES_IN: '7d',
                REFRESH_TOKEN_SECRET: 'refresh-secret',
                JWT_SECRET: 'jwt-secret',
                NODE_ENV: 'test',
                SYSTEM_USERNAME: 'systemadmin',
              };
              return config[key];
            }),
          },
        },
        {
          provide: TwofaService,
          useValue: {
            verifyTwoFactor: jest.fn(),
            isTwoFactorEnabled: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    emailService = module.get(EmailService);
    loggingService = module.get(LoggingService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should successfully register a new user', async () => {
      // Arrange
      usersService.existsByEmail.mockResolvedValue(null);
      usersService.existsByUsername.mockResolvedValue(null);
      (crypto.randomUUID as jest.Mock) = jest.fn(() => 'ws-123');
      (bcrypt.hash as jest.Mock) = jest.fn(() => Promise.resolve('hashedPassword'));
      (crypto.randomBytes as jest.Mock) = jest.fn(() => ({
        toString: () => 'verification-token-123',
      }));
      usersService.create.mockResolvedValue(mockUser as User);
      usersService.updateSecurityVerification.mockResolvedValue(undefined);
      emailService.sendVerificationEmail.mockResolvedValue(true);

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('Registration successful');
      expect(result.user).toBeDefined();
      expect((result.user as any).password).toBeUndefined();
      expect(usersService.existsByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(usersService.existsByUsername).toHaveBeenCalledWith(registerDto.username);
      expect(usersService.create).toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw error if email already exists', async () => {
      // Arrange
      usersService.existsByEmail.mockResolvedValue(mockUser as User);
      usersService.existsByUsername.mockResolvedValue(null);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(HttpException);
      await expect(service.register(registerDto)).rejects.toThrow(
        'Registration failed',
      );
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('should throw error if username already exists', async () => {
      // Arrange
      usersService.existsByEmail.mockResolvedValue(null);
      usersService.existsByUsername.mockResolvedValue(mockUser as User);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(HttpException);
      await expect(service.register(registerDto)).rejects.toThrow(
        'Registration failed',
      );
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('should not fail registration if email sending fails', async () => {
      // Arrange
      usersService.existsByEmail.mockResolvedValue(null);
      usersService.existsByUsername.mockResolvedValue(null);
      (crypto.randomUUID as jest.Mock) = jest.fn(() => 'ws-123');
      (bcrypt.hash as jest.Mock) = jest.fn(() => Promise.resolve('hashedPassword'));
      (crypto.randomBytes as jest.Mock) = jest.fn(() => ({
        toString: () => 'verification-token-123',
      }));
      usersService.create.mockResolvedValue(mockUser as User);
      usersService.updateSecurityVerification.mockResolvedValue(undefined);
      emailService.sendVerificationEmail.mockRejectedValue(
        new Error('Email service unavailable'),
      );

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(result).toHaveProperty('message');
      expect(loggingService.error).toHaveBeenCalled();
      expect(usersService.create).toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    const verifyDto: VerifyDto = {
      token: 'test-token-123',
    };

    it('should successfully verify email', async () => {
      // Arrange
      usersService.findSecurityByVerificationToken.mockResolvedValue(
        mockSecurity as Security,
      );
      usersService.updateSecurityVerificationStatus.mockResolvedValue(undefined);
      usersService.findOne.mockResolvedValue(mockUser as User);

      // Act
      const result = await service.verifyEmail(verifyDto);

      // Assert
      expect(result).toHaveProperty('message');
      expect(result.message).toBe('Email successfully verified');
      expect(result.user).toBeDefined();
      expect((result.user as any).password).toBeUndefined();
      expect(usersService.updateSecurityVerificationStatus).toHaveBeenCalledWith(
        mockSecurity,
        true,
        expect.any(Date),
      );
    });

    it('should throw error if token is invalid', async () => {
      // Arrange
      usersService.findSecurityByVerificationToken.mockResolvedValue(null);

      // Act & Assert
      await expect(service.verifyEmail(verifyDto)).rejects.toThrow(HttpException);
      await expect(service.verifyEmail(verifyDto)).rejects.toThrow(
        'Invalid or expired verification token',
      );
    });

    it('should throw error if email already verified', async () => {
      // Arrange
      const verifiedSecurity = {
        ...mockSecurity,
        isVerified: true,
      };
      usersService.findSecurityByVerificationToken.mockResolvedValue(
        verifiedSecurity as Security,
      );

      // Act & Assert
      await expect(service.verifyEmail(verifyDto)).rejects.toThrow(HttpException);
      await expect(service.verifyEmail(verifyDto)).rejects.toThrow(
        'Email has already been verified',
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should successfully login user without 2FA', async () => {
      // Arrange
      const userWithSecurity = {
        ...mockUser,
        security: {
          ...mockSecurity,
          isVerified: true,
          isTwoFactorEnabled: false,
        },
      };
      usersService.findUserWithSecurityByEmail.mockResolvedValue(
        userWithSecurity as User,
      );
      (bcrypt.compare as jest.Mock) = jest.fn(() => Promise.resolve(true));
      jwtService.sign.mockReturnValue('mock-access-token');
      redisService.set.mockResolvedValue(undefined);

      // Act
      const result = await service.login(loginDto, undefined);

      // Assert
      expect(result).toHaveProperty('message');
      expect(result.message).toBe('Login successful');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('should require 2FA if enabled', async () => {
      // Arrange
      const userWithSecurity = {
        ...mockUser,
        security: {
          ...mockSecurity,
          isVerified: true,
          isTwoFactorEnabled: true,
        },
      };
      usersService.findUserWithSecurityByEmail.mockResolvedValue(
        userWithSecurity as User,
      );
      (bcrypt.compare as jest.Mock) = jest.fn(() => Promise.resolve(true));
      (crypto.randomBytes as jest.Mock) = jest.fn(() => ({
        toString: () => 'temp-token-123',
      }));

      // Act
      const result = await service.login(loginDto, undefined);

      // Assert
      expect(result).toHaveProperty('requiresTwoFactor');
      expect((result as any).requiresTwoFactor).toBe(true);
      expect((result as any).tempToken).toBeDefined();
      expect((result as any).accessToken).toBeUndefined();
    });

    it('should throw error if email not found', async () => {
      // Arrange
      usersService.findUserWithSecurityByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto, undefined)).rejects.toThrow(HttpException);
      await expect(service.login(loginDto, undefined)).rejects.toThrow(
        'Invalid email or password',
      );
    });

    it('should throw error if password is incorrect', async () => {
      // Arrange
      const userWithSecurity = {
        ...mockUser,
        security: {
          ...mockSecurity,
          isVerified: true,
        },
      };
      usersService.findUserWithSecurityByEmail.mockResolvedValue(
        userWithSecurity as User,
      );
      (bcrypt.compare as jest.Mock) = jest.fn(() => Promise.resolve(false));

      // Act & Assert
      await expect(service.login(loginDto, undefined)).rejects.toThrow(HttpException);
      await expect(service.login(loginDto, undefined)).rejects.toThrow(
        'Invalid email or password',
      );
    });

    it('should throw error if email not verified', async () => {
      // Arrange
      const unverifiedUser = {
        ...mockUser,
        security: {
          ...mockSecurity,
          isVerified: false,
        },
      };
      usersService.findUserWithSecurityByEmail.mockResolvedValue(
        unverifiedUser as User,
      );
      (bcrypt.compare as jest.Mock) = jest.fn(() => Promise.resolve(true));

      // Act & Assert
      await expect(service.login(loginDto, undefined)).rejects.toThrow(HttpException);
      await expect(service.login(loginDto, undefined)).rejects.toThrow(
        'Please verify your email',
      );
    });
  });

  describe('changePassword', () => {
    const changeDto: ChangeDto = {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
    };

    const mockRequest = {
      user: { id: 'user-123' },
    } as any;

    it('should successfully change password', async () => {
      // Arrange
      const userWithPassword = {
        ...mockUser,
        password: 'hashedOldPassword',
      };
      usersService.findOne.mockResolvedValue(userWithPassword as User);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // Current password check
        .mockResolvedValueOnce(false); // New password different check
      (bcrypt.hash as jest.Mock) = jest.fn(() => Promise.resolve('hashedNewPassword'));
      usersService.updateUserPassword.mockResolvedValue(undefined);
      emailService.sendPasswordChangedEmail = jest.fn().mockResolvedValue(true);

      // Act
      const result = await service.changePassword(changeDto, mockRequest);

      // Assert
      expect(result).toHaveProperty('message');
      expect(result.message).toBe('Password changed successfully');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        changeDto.currentPassword,
        userWithPassword.password,
      );
      expect(usersService.updateUserPassword).toHaveBeenCalled();
    });

    it('should throw error if current password is incorrect', async () => {
      // Arrange
      const userWithPassword = {
        ...mockUser,
        password: 'hashedOldPassword',
      };
      usersService.findOne.mockResolvedValue(userWithPassword as User);
      (bcrypt.compare as jest.Mock) = jest.fn(() => Promise.resolve(false));

      // Act & Assert
      await expect(
        service.changePassword(changeDto, mockRequest),
      ).rejects.toThrow(HttpException);
      await expect(service.changePassword(changeDto, mockRequest)).rejects.toThrow(
        'Current password is incorrect',
      );
      expect(usersService.updateUserPassword).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    const forgotDto: ForgotDto = {
      email: 'test@example.com',
    };

    it('should send password reset email if user exists', async () => {
      // Arrange
      usersService.existsByEmail.mockResolvedValue(mockUser as User);
      const mockSecurityWithUser = {
        ...mockSecurity,
        user: mockUser as User,
      };
      usersService.findSecurityByUserEmail.mockResolvedValue(
        mockSecurityWithUser as Security,
      );
      (crypto.randomBytes as jest.Mock) = jest.fn(() => ({
        toString: () => 'reset-token-123',
      }));
      usersService.updatePasswordResetToken.mockResolvedValue(undefined);
      emailService.sendForgotPasswordEmail = jest.fn().mockResolvedValue(true);

      // Act
      const result = await service.forgotPassword(forgotDto);

      // Assert
      expect(result).toHaveProperty('message');
      expect(usersService.existsByEmail).toHaveBeenCalledWith(forgotDto.email);
      expect(emailService.sendForgotPasswordEmail).toHaveBeenCalled();
    });

    it('should not reveal if user does not exist', async () => {
      // Arrange
      usersService.existsByEmail.mockResolvedValue(null);

      // Act
      const result = await service.forgotPassword(forgotDto);

      // Assert
      expect(result).toHaveProperty('message');
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const resetDto: ResetDto = {
      token: 'reset-token-123',
      newPassword: 'NewPassword123!',
    };

    it('should successfully reset password', async () => {
      // Arrange
      const securityWithExpiry = {
        ...mockSecurity,
        passwordResetToken: 'reset-token-123',
        passwordResetTokenExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        user: mockUser as User,
      };
      usersService.findSecurityByPasswordResetToken.mockResolvedValue(
        securityWithExpiry as Security,
      );
      (bcrypt.hash as jest.Mock) = jest.fn(() => Promise.resolve('hashedNewPassword'));
      usersService.updateUserPassword.mockResolvedValue(undefined);
      usersService.clearPasswordResetToken.mockResolvedValue(undefined);
      emailService.sendPasswordResetEmail.mockResolvedValue(true);

      // Act
      const result = await service.resetPassword(resetDto);

      // Assert
      expect(result).toHaveProperty('message');
      expect(result.message).toBe('Password has been reset successfully');
      expect(usersService.updateUserPassword).toHaveBeenCalled();
      expect(usersService.clearPasswordResetToken).toHaveBeenCalled();
    });

    it('should throw error if token is invalid', async () => {
      // Arrange
      usersService.findSecurityByPasswordResetToken.mockResolvedValue(null);

      // Act & Assert
      await expect(service.resetPassword(resetDto)).rejects.toThrow(HttpException);
      await expect(service.resetPassword(resetDto)).rejects.toThrow(
        'Invalid or expired password reset token',
      );
    });
  });

  describe('validateUser', () => {
    it('should return user without password if credentials are valid', async () => {
      // Arrange
      usersService.findByEmail.mockResolvedValue(mockUser as User);
      (bcrypt.compare as jest.Mock) = jest.fn(() => Promise.resolve(true));

      // Act
      const result = await service.validateUser('test@example.com', 'password123');

      // Assert
      expect(result).toBeDefined();
      expect((result as any).password).toBeUndefined();
      expect(bcrypt.compare).toHaveBeenCalled();
    });

    it('should throw if user not found', async () => {
      // Arrange
      const { NotFoundException } = await import('@nestjs/common');
      usersService.findByEmail.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      // Act & Assert
      // findByEmail throws, so validateUser will throw, not return undefined
      await expect(
        service.validateUser('test@example.com', 'password123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return undefined if password is incorrect', async () => {
      // Arrange
      usersService.findByEmail.mockResolvedValue(mockUser as User);
      (bcrypt.compare as jest.Mock) = jest.fn(() => Promise.resolve(false));

      // Act
      const result = await service.validateUser('test@example.com', 'wrongpassword');

      // Assert
      expect(result).toBeUndefined();
    });
  });
});

