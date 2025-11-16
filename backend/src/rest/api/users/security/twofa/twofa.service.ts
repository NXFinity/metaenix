import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Security } from '../../assets/entities/security/security.entity';
import { User } from '../../assets/entities/user.entity';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { AuditLogService } from '@logging/logging';
import { RedisService } from '@redis/redis';
import {
  SetupTwoFactorDto,
  EnableTwoFactorDto,
  VerifyTwoFactorDto,
  DisableTwoFactorDto,
} from './assets/dto';
import {
  TwoFactorSetupResponse,
  BackupCodesResponse,
} from './assets/interfaces/two-factor-setup.interface';

@Injectable()
export class TwofaService {
  private readonly encryptionKey: Buffer;
  private readonly encryptionAlgorithm = 'aes-256-gcm';
  private readonly ivLength = 16;
  private readonly authTagLength = 16;
  private readonly saltLength = 64;

  constructor(
    @InjectRepository(Security)
    private readonly securityRepository: Repository<Security>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly loggingService: LoggingService,
    private readonly auditLogService: AuditLogService,
    private readonly redisService: RedisService,
  ) {
    // Use JWT_SECRET as encryption key (or create dedicated key)
    const key = this.configService.get<string>('JWT_SECRET');
    if (!key || key.length < 32) {
      throw new Error(
        'JWT_SECRET must be at least 32 characters for 2FA encryption',
      );
    }
    // Derive a 32-byte key from JWT_SECRET using SHA-256
    // SHA-256 produces 32 bytes, which is perfect for AES-256
    this.encryptionKey = crypto.createHash('sha256').update(key).digest();
  }

  // #########################################################
  // ENCRYPTION UTILITIES
  // #########################################################

  /**
   * Encrypt TOTP secret before storing in database
   */
  private encryptSecret(secret: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(
      this.encryptionAlgorithm,
      this.encryptionKey,
      iv,
    );

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Combine IV + authTag + encrypted data
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt TOTP secret from database
   */
  private decryptSecret(encryptedSecret: string): string {
    const parts = encryptedSecret.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted secret format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(
      this.encryptionAlgorithm,
      this.encryptionKey,
      iv,
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // #########################################################
  // BACKUP CODE UTILITIES
  // #########################################################

  /**
   * Generate backup codes (10 codes, 8 characters each)
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Hash backup codes with bcrypt
   */
  private async hashBackupCodes(codes: string[]): Promise<string[]> {
    return Promise.all(
      codes.map((code) => bcrypt.hash(code, 10)),
    );
  }

  /**
   * Verify backup code
   */
  private async verifyBackupCode(
    code: string,
    hashedCodes: string[],
  ): Promise<boolean> {
    for (const hashedCode of hashedCodes) {
      if (await bcrypt.compare(code, hashedCode)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Remove used backup code from array
   */
  private async removeBackupCode(
    code: string,
    hashedCodes: string[],
  ): Promise<string[]> {
    const updatedCodes: string[] = [];
    let found = false;

    for (const hashedCode of hashedCodes) {
      if (!found && (await bcrypt.compare(code, hashedCode))) {
        found = true;
        continue; // Skip this code (remove it)
      }
      updatedCodes.push(hashedCode);
    }

    return updatedCodes;
  }

  // #########################################################
  // RATE LIMITING
  // #########################################################

  /**
   * Check rate limit for 2FA verification attempts
   */
  private async checkRateLimit(userId: string): Promise<void> {
    const key = `2fa:rate-limit:${userId}`;
    const attempts = await this.redisService.get<number>(key);

    if (attempts && attempts >= 5) {
      throw new BadRequestException(
        'Too many failed attempts. Please try again in 15 minutes.',
      );
    }
  }

  /**
   * Increment rate limit counter
   */
  private async incrementRateLimit(userId: string): Promise<void> {
    const key = `2fa:rate-limit:${userId}`;
    const attempts = await this.redisService.get<number>(key) || 0;
    await this.redisService.set(key, attempts + 1, 900); // 15 minutes
  }

  /**
   * Reset rate limit counter
   */
  private async resetRateLimit(userId: string): Promise<void> {
    const key = `2fa:rate-limit:${userId}`;
    await this.redisService.del(key);
  }

  // #########################################################
  // 2FA SETUP & ENABLE
  // #########################################################

  /**
   * Setup 2FA - Generate secret and QR code
   */
  async setupTwoFactor(
    userId: string,
    password: string,
  ): Promise<TwoFactorSetupResponse> {
    try {
      // Verify user exists and password is correct
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['security'],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.security) {
        throw new NotFoundException('Security record not found');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid password');
      }

      // Check if 2FA is already enabled
      if (user.security.isTwoFactorEnabled) {
        throw new BadRequestException('Two-factor authentication is already enabled');
      }

      // Generate TOTP secret
      const secret = speakeasy.generateSecret({
        name: `Meta EN|IX (${user.email})`,
        length: 32,
      });

      // Generate QR code
      const otpAuthUrl = speakeasy.otpauthURL({
        secret: secret.base32,
        label: user.email,
        issuer: 'Meta EN|IX',
        encoding: 'base32',
      });

      const qrCode = await QRCode.toDataURL(otpAuthUrl);

      // Store temporary secret (not encrypted yet, will be encrypted on enable)
      user.security.twoFactorToken = secret.base32;

      await this.securityRepository.save(user.security);

      this.loggingService.log('2FA setup initiated', 'TwofaService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
      });

      return {
        secret: secret.base32,
        qrCode,
        manualEntryKey: secret.base32,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error setting up 2FA',
        error instanceof Error ? error.stack : undefined,
        'TwofaService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to setup 2FA');
    }
  }

  /**
   * Enable 2FA - Verify code and enable
   */
  async enableTwoFactor(
    userId: string,
    enableDto: EnableTwoFactorDto,
  ): Promise<BackupCodesResponse> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['security'],
      });

      if (!user || !user.security) {
        throw new NotFoundException('User or security record not found');
      }

      // Check if 2FA is already enabled
      if (user.security.isTwoFactorEnabled) {
        throw new BadRequestException('Two-factor authentication is already enabled');
      }

      // Get temporary secret from setup
      const tempSecret = user.security.twoFactorToken;
      if (!tempSecret) {
        throw new BadRequestException(
          '2FA setup not initiated. Please run setup first.',
        );
      }

      // Verify TOTP code
      const verified = speakeasy.totp.verify({
        secret: tempSecret,
        encoding: 'base32',
        token: enableDto.code,
        window: 1, // Allow ±1 time step (30 seconds)
      });

      if (!verified) {
        await this.incrementRateLimit(userId);
        throw new BadRequestException('Invalid verification code');
      }

      // Reset rate limit on success
      await this.resetRateLimit(userId);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      const hashedBackupCodes = await this.hashBackupCodes(backupCodes);

      // Encrypt and store secret
      const encryptedSecret = this.encryptSecret(tempSecret);

      // Enable 2FA
      user.security.isTwoFactorEnabled = true;
      user.security.twoFactorSecret = encryptedSecret;
      user.security.twoFactorToken = null; // Clear temporary token
      user.security.twoFactorBackupCodes = hashedBackupCodes;
      user.security.twoFactorEnabledAt = new Date();
      user.security.twoFactorBackupCodesGeneratedAt = new Date();

      await this.securityRepository.save(user.security);

      // Audit log
      await this.auditLogService.saveAuditLog({
        message: '2FA enabled',
        userId,
        category: LogCategory.SECURITY,
        metadata: {
          enabledAt: user.security.twoFactorEnabledAt,
        },
      });

      this.loggingService.log('2FA enabled', 'TwofaService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
      });

      return {
        codes: backupCodes,
        generatedAt: user.security.twoFactorBackupCodesGeneratedAt,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error enabling 2FA',
        error instanceof Error ? error.stack : undefined,
        'TwofaService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to enable 2FA');
    }
  }

  // #########################################################
  // 2FA VERIFICATION
  // #########################################################

  /**
   * Verify 2FA code (TOTP or backup code)
   */
  async verifyTwoFactor(
    userId: string,
    verifyDto: VerifyTwoFactorDto,
  ): Promise<boolean> {
    try {
      await this.checkRateLimit(userId);

      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['security'],
      });

      if (!user || !user.security) {
        throw new NotFoundException('User or security record not found');
      }

      if (!user.security.isTwoFactorEnabled) {
        throw new BadRequestException('Two-factor authentication is not enabled');
      }

      const code = verifyDto.code.toUpperCase();

      // Check if it's a backup code (8 characters)
      if (code.length === 8) {
        if (!user.security.twoFactorBackupCodes || user.security.twoFactorBackupCodes.length === 0) {
          await this.incrementRateLimit(userId);
          throw new BadRequestException('Invalid backup code');
        }

        const isValid = await this.verifyBackupCode(
          code,
          user.security.twoFactorBackupCodes,
        );

        if (!isValid) {
          await this.incrementRateLimit(userId);
          throw new BadRequestException('Invalid backup code');
        }

        // Remove used backup code
        const updatedCodes = await this.removeBackupCode(
          code,
          user.security.twoFactorBackupCodes,
        );
        user.security.twoFactorBackupCodes = updatedCodes;
        user.security.twoFactorLastVerified = new Date();

        await this.securityRepository.save(user.security);

        // Audit log
        await this.auditLogService.saveAuditLog({
          message: '2FA verified with backup code',
          userId,
          category: LogCategory.SECURITY,
        });

        await this.resetRateLimit(userId);
        return true;
      }

      // Verify TOTP code (6 digits)
      if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        await this.incrementRateLimit(userId);
        throw new BadRequestException('Invalid code format');
      }

      const encryptedSecret = user.security.twoFactorSecret;
      if (!encryptedSecret) {
        await this.incrementRateLimit(userId);
        throw new BadRequestException('2FA secret not found');
      }

      const decryptedSecret = this.decryptSecret(encryptedSecret);

      const verified = speakeasy.totp.verify({
        secret: decryptedSecret,
        encoding: 'base32',
        token: code,
        window: 1, // Allow ±1 time step (30 seconds)
      });

      if (!verified) {
        await this.incrementRateLimit(userId);
        throw new BadRequestException('Invalid verification code');
      }

      // Update last verified timestamp
      user.security.twoFactorLastVerified = new Date();
      await this.securityRepository.save(user.security);

      // Audit log
      await this.auditLogService.saveAuditLog({
        message: '2FA verified',
        userId,
        category: LogCategory.SECURITY,
      });

      await this.resetRateLimit(userId);
      return true;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error verifying 2FA',
        error instanceof Error ? error.stack : undefined,
        'TwofaService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to verify 2FA');
    }
  }

  // #########################################################
  // 2FA DISABLE
  // #########################################################

  /**
   * Disable 2FA
   */
  async disableTwoFactor(
    userId: string,
    password: string,
  ): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['security'],
      });

      if (!user || !user.security) {
        throw new NotFoundException('User or security record not found');
      }

      if (!user.security.isTwoFactorEnabled) {
        throw new BadRequestException('Two-factor authentication is not enabled');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid password');
      }

      // Disable 2FA
      user.security.isTwoFactorEnabled = false;
      user.security.twoFactorSecret = null;
      user.security.twoFactorToken = null;
      user.security.twoFactorBackupCodes = null;
      user.security.twoFactorEnabledAt = null;
      user.security.twoFactorLastVerified = null;
      user.security.twoFactorBackupCodesGeneratedAt = null;

      await this.securityRepository.save(user.security);

      // Clear rate limit
      await this.resetRateLimit(userId);

      // Audit log
      await this.auditLogService.saveAuditLog({
        message: '2FA disabled',
        userId,
        category: LogCategory.SECURITY,
      });

      this.loggingService.log('2FA disabled', 'TwofaService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error disabling 2FA',
        error instanceof Error ? error.stack : undefined,
        'TwofaService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to disable 2FA');
    }
  }

  // #########################################################
  // BACKUP CODES
  // #########################################################

  /**
   * Get backup codes (requires 2FA verification)
   */
  async getBackupCodes(
    userId: string,
    verifyDto: VerifyTwoFactorDto,
  ): Promise<BackupCodesResponse> {
    try {
      // Verify 2FA code first
      await this.verifyTwoFactor(userId, verifyDto);

      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['security'],
      });

      if (!user || !user.security) {
        throw new NotFoundException('User or security record not found');
      }

      if (!user.security.twoFactorBackupCodes || user.security.twoFactorBackupCodes.length === 0) {
        throw new BadRequestException('No backup codes available');
      }

      // Generate new backup codes
      const backupCodes = this.generateBackupCodes();
      const hashedBackupCodes = await this.hashBackupCodes(backupCodes);

      user.security.twoFactorBackupCodes = hashedBackupCodes;
      user.security.twoFactorBackupCodesGeneratedAt = new Date();

      await this.securityRepository.save(user.security);

      // Audit log
      await this.auditLogService.saveAuditLog({
        message: '2FA backup codes regenerated',
        userId,
        category: LogCategory.SECURITY,
      });

      return {
        codes: backupCodes,
        generatedAt: user.security.twoFactorBackupCodesGeneratedAt,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error getting backup codes',
        error instanceof Error ? error.stack : undefined,
        'TwofaService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to get backup codes');
    }
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(
    userId: string,
    verifyDto: VerifyTwoFactorDto,
  ): Promise<BackupCodesResponse> {
    // Same as getBackupCodes (regenerates codes)
    return this.getBackupCodes(userId, verifyDto);
  }

  // #########################################################
  // STATUS CHECK
  // #########################################################

  /**
   * Get 2FA status
   */
  async getTwoFactorStatus(userId: string): Promise<{
    enabled: boolean;
    enabledAt: Date | null;
    lastVerified: Date | null;
    backupCodesCount: number;
  }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['security'],
      });

      if (!user || !user.security) {
        throw new NotFoundException('User or security record not found');
      }

      return {
        enabled: user.security.isTwoFactorEnabled,
        enabledAt: user.security.twoFactorEnabledAt,
        lastVerified: user.security.twoFactorLastVerified,
        backupCodesCount: user.security.twoFactorBackupCodes?.length || 0,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error getting 2FA status',
        error instanceof Error ? error.stack : undefined,
        'TwofaService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to get 2FA status');
    }
  }

  /**
   * Check if user has 2FA enabled (for AuthService)
   */
  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    try {
      const security = await this.securityRepository.findOne({
        where: { user: { id: userId } },
      });

      return security?.isTwoFactorEnabled || false;
    } catch (error) {
      this.loggingService.error(
        'Error checking 2FA status',
        error instanceof Error ? error.stack : undefined,
        'TwofaService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      return false;
    }
  }
}
