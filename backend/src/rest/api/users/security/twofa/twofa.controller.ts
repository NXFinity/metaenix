import {
  Controller,
  Get,
  Post,
  Body,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { TwofaService } from './twofa.service';
import { CurrentUser } from 'src/security/auth/decorators/currentUser.decorator';
import { User } from '../../assets/entities/user.entity';
import {
  SetupTwoFactorDto,
  EnableTwoFactorDto,
  VerifyTwoFactorDto,
  DisableTwoFactorDto,
} from './assets/dto';
import { Throttle } from '@throttle/throttle';

@ApiTags('Account Management | Two Factor')
@Controller('twofa')
@ApiBearerAuth()
export class TwofaController {
  constructor(private readonly twofaService: TwofaService) {}

  // #########################################################
  // STATUS
  // #########################################################

  @Get('status')
  @ApiOperation({ summary: 'Get 2FA status' })
  @ApiResponse({
    status: 200,
    description: '2FA status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        enabledAt: { type: 'string', format: 'date-time', nullable: true },
        lastVerified: { type: 'string', format: 'date-time', nullable: true },
        backupCodesCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getStatus(@CurrentUser() user: User) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.twofaService.getTwoFactorStatus(userId);
  }

  // #########################################################
  // SETUP & ENABLE
  // #########################################################

  @Post('setup')
  @Throttle({ limit: 5, ttl: 300 }) // 5 setups per 5 minutes
  @ApiOperation({ summary: 'Setup 2FA - Generate secret and QR code' })
  @ApiBody({ type: SetupTwoFactorDto })
  @ApiResponse({
    status: 201,
    description: '2FA setup initiated successfully',
    schema: {
      type: 'object',
      properties: {
        secret: { type: 'string', description: 'TOTP secret (base32)' },
        qrCode: { type: 'string', description: 'QR code data URL' },
        manualEntryKey: { type: 'string', description: 'Manual entry key' },
      },
    },
  })
  @ApiResponse({ status: 400, description: '2FA already enabled' })
  @ApiResponse({ status: 401, description: 'Unauthorized or invalid password' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async setup(@CurrentUser() user: User, @Body() dto: SetupTwoFactorDto) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.twofaService.setupTwoFactor(userId, dto.password);
  }

  @Post('enable')
  @Throttle({ limit: 10, ttl: 300 }) // 10 attempts per 5 minutes
  @ApiOperation({ summary: 'Enable 2FA - Verify code and enable' })
  @ApiBody({ type: EnableTwoFactorDto })
  @ApiResponse({
    status: 201,
    description: '2FA enabled successfully',
    schema: {
      type: 'object',
      properties: {
        codes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Backup codes (shown only once)',
        },
        generatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid code or 2FA already enabled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async enable(@CurrentUser() user: User, @Body() dto: EnableTwoFactorDto) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.twofaService.enableTwoFactor(userId, dto);
  }

  // #########################################################
  // VERIFY
  // #########################################################

  @Post('verify')
  @Throttle({ limit: 10, ttl: 300 }) // 10 verifications per 5 minutes
  @ApiOperation({ summary: 'Verify 2FA code (standalone verification)' })
  @ApiBody({ type: VerifyTwoFactorDto })
  @ApiResponse({
    status: 200,
    description: '2FA code verified successfully',
    schema: {
      type: 'object',
      properties: {
        verified: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid code' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async verify(@CurrentUser() user: User, @Body() dto: VerifyTwoFactorDto) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    const verified = await this.twofaService.verifyTwoFactor(userId, dto);
    return { verified };
  }

  // #########################################################
  // DISABLE
  // #########################################################

  @Post('disable')
  @Throttle({ limit: 5, ttl: 300 }) // 5 attempts per 5 minutes
  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiBody({ type: DisableTwoFactorDto })
  @ApiResponse({
    status: 200,
    description: '2FA disabled successfully',
  })
  @ApiResponse({ status: 400, description: '2FA not enabled' })
  @ApiResponse({ status: 401, description: 'Unauthorized or invalid password' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async disable(@CurrentUser() user: User, @Body() dto: DisableTwoFactorDto) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    await this.twofaService.disableTwoFactor(userId, dto.password);
    return { message: 'Two-factor authentication disabled successfully' };
  }

  // #########################################################
  // BACKUP CODES
  // #########################################################

  @Post('backup-codes')
  @Throttle({ limit: 5, ttl: 300 }) // 5 requests per 5 minutes
  @ApiOperation({
    summary: 'Get backup codes (requires 2FA verification)',
    description:
      'Regenerates and returns new backup codes. Old codes are invalidated.',
  })
  @ApiBody({ type: VerifyTwoFactorDto })
  @ApiResponse({
    status: 200,
    description: 'Backup codes retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        codes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Backup codes (shown only once)',
        },
        generatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid 2FA code or no backup codes' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getBackupCodes(
    @CurrentUser() user: User,
    @Body() dto: VerifyTwoFactorDto,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.twofaService.getBackupCodes(userId, dto);
  }

  @Post('regenerate-backup-codes')
  @Throttle({ limit: 5, ttl: 300 }) // 5 regenerations per 5 minutes
  @ApiOperation({
    summary: 'Regenerate backup codes (requires 2FA verification)',
    description:
      'Regenerates backup codes. Old codes are invalidated. Requires 2FA verification.',
  })
  @ApiBody({ type: VerifyTwoFactorDto })
  @ApiResponse({
    status: 201,
    description: 'Backup codes regenerated successfully',
    schema: {
      type: 'object',
      properties: {
        codes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Backup codes (shown only once)',
        },
        generatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid 2FA code' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async regenerateBackupCodes(
    @CurrentUser() user: User,
    @Body() dto: VerifyTwoFactorDto,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.twofaService.regenerateBackupCodes(userId, dto);
  }
}
