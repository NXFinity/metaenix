import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Authentication Services
import { UsersService } from '../../rest/api/users/users.service';

// Encryption
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// Security DTO's
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyDto } from './dto/verify.dto';
import { ResendVerifyDto } from './dto/resend-verify.dto';
import { ChangeDto } from './dto/change.dto';
import { ForgotDto } from './dto/forgot.dto';
import { ResetDto } from './dto/reset.dto';
import { EmailService } from '@email/email';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import {
  BCRYPT_SALT_ROUNDS,
  PASSWORD_RESET_TOKEN_EXPIRY_HOURS,
} from '../../common/constants/app.constants';
import { TwofaService } from '../../rest/api/users/security/twofa/twofa.service';
import { VerifyTwoFactorDto } from '../../rest/api/users/security/twofa/assets/dto';

// Enum
import { ROLE } from '../roles/assets/enum/role.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly loggingService: LoggingService,
    private readonly twofaService: TwofaService,
  ) {}

  // #########################################################
  // VALIDATE USER - ALWAYS AT THE TOP
  // #########################################################

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
  }
  // #########################################################
  // USER REGISTRATION & VERIFY EMAIL
  // #########################################################

  async register(registerDto: RegisterDto) {
    const { username, email, password } = registerDto;

    // Check if user already exists
    const existingEmail = await this.usersService.existsByEmail(email);
    const existingUsername = await this.usersService.existsByUsername(username);

    // Generic error message to prevent user enumeration
    if (existingEmail || existingUsername) {
      throw new HttpException(
        'Registration failed. Please check your information and try again.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Generate websocketId (UUID)
    const websocketId = crypto.randomUUID();

    // Hash password
    const saltRounds = BCRYPT_SALT_ROUNDS;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = await this.usersService.create({
      username,
      displayName: username, // Use username as displayName initially
      email,
      password: hashedPassword,
      websocketId,
      role: ROLE.Member,
    });

    // Update Security entity with verification token
    await this.usersService.updateSecurityVerification(
      user.id,
      verificationToken,
    );

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(
        email,
        username,
        verificationToken,
      );
    } catch (error) {
      // Log error but don't fail registration if email fails
      this.loggingService.error(
        'Failed to send verification email',
        error instanceof Error ? error.stack : undefined,
        'AuthService',
        {
          category: LogCategory.EMAIL,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { email, username },
        },
      );
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return {
      message:
        'Registration successful. Please check your email to verify your account.',
      user: userWithoutPassword,
    };
  }

  async verifyEmail(verifyDto: VerifyDto) {
    const { token } = verifyDto;

    // Find security entity with this verification token
    const security =
      await this.usersService.findSecurityByVerificationToken(token);

    if (!security) {
      throw new HttpException(
        'Invalid or expired verification token',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if already verified
    if (security.isVerified) {
      throw new HttpException(
        'Email has already been verified',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Verify the email
    await this.usersService.updateSecurityVerificationStatus(
      security,
      true,
      new Date(),
    );

    // Get user info for response
    const user = await this.usersService.findOne(security.user.id);
    const { password: _, ...userWithoutPassword } = user;

    return {
      message: 'Email successfully verified',
      user: userWithoutPassword,
    };
  }

  async resendVerifyEmail(resendVerifyDto: ResendVerifyDto) {
    const { email } = resendVerifyDto;

    // Find user by email
    const user = await this.usersService.existsByEmail(email);
    // Generic error message to prevent user enumeration
    if (!user) {
      throw new HttpException(
        'If an account with that email exists and is not verified, a verification email will be sent.',
        HttpStatus.OK, // Return 200 to prevent enumeration
      );
    }

    // Find security entity for this user
    const security = await this.usersService.findSecurityByUserEmail(email);
    if (!security) {
      throw new HttpException(
        'Security record not found for this user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Check if already verified
    if (security.isVerified) {
      throw new HttpException(
        'Email has already been verified',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Generate new verification token (tokens expire after configured minutes)
    const newVerificationToken = crypto.randomBytes(32).toString('hex');

    // Update Security entity with new verification token
    await this.usersService.updateSecurityVerification(
      user.id,
      newVerificationToken,
    );

    // Send verification email with new token
    try {
      await this.emailService.sendVerificationEmail(
        email,
        user.username,
        newVerificationToken,
      );
    } catch (error) {
      this.loggingService.error(
        'Failed to send verification email',
        error instanceof Error ? error.stack : undefined,
        'AuthService',
        {
          category: LogCategory.EMAIL,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { email, username: user.username },
        },
      );
      throw new HttpException(
        'Failed to send verification email. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      message: 'Verification email has been resent. Please check your email.',
    };
  }

  // #########################################################
  // USER LOGIN & LOGOUT
  // #########################################################

  async login(loginDto: LoginDto, request: AuthenticatedRequest) {
    const { email, password } = loginDto;

    // Find user with security relation
    const user = await this.usersService.findUserWithSecurityByEmail(email);

    // Verify password - use same generic error for both cases to prevent enumeration
    const isPasswordValid =
      user && (await bcrypt.compare(password, user.password));
    if (!user || !isPasswordValid) {
      throw new HttpException(
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Check if email is verified
    if (!user.security || !user.security.isVerified) {
      throw new HttpException(
        'Please verify your email before logging in',
        HttpStatus.FORBIDDEN,
      );
    }

    // Check if user is banned
    if (user.security.isBanned) {
      throw new HttpException(
        'Your account has been banned',
        HttpStatus.FORBIDDEN,
      );
    }

    // Check if user is timed out
    if (user.security.isTimedOut) {
      const timeoutUntil = user.security.timedOutUntil;
      if (timeoutUntil && timeoutUntil > new Date()) {
        throw new HttpException(
          'Your account is temporarily timed out',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    // Check if 2FA is enabled
    if (user.security.isTwoFactorEnabled) {
      // Store temporary login data in session (not authenticated yet)
      if (request.session) {
        request.session.pendingLogin = {
          userId: user.id,
          email: user.email,
          passwordVerified: true,
          createdAt: new Date(), // Timestamp for timeout checking
        };
      }

      // Save session temporarily
      if (request.session) {
        await new Promise<void>((resolve, reject) => {
          request.session!.save((err: any) => {
            if (err) {
              this.loggingService.error(
                'Session save error',
                err instanceof Error ? err.stack : undefined,
                'AuthService',
                {
                  category: LogCategory.AUTHENTICATION,
                  error: err instanceof Error ? err : new Error(String(err)),
                  metadata: { userId: user.id, email: user.email },
                },
              );
              reject(
                new HttpException(
                  'Failed to save session',
                  HttpStatus.INTERNAL_SERVER_ERROR,
                ),
              );
            } else {
              resolve();
            }
          });
        });
      }

      // Return requiresTwoFactor flag
      return {
        message: 'Two-factor authentication required',
        requiresTwoFactor: true,
        email: user.email,
      };
    }

    // No 2FA - proceed with normal login
    // Store user in session (without password)
    const { password: _, security, ...userWithoutPassword } = user;
    if (request.session) {
      request.session.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        websocketId: user.websocketId,
        isVerified: user.security.isVerified,
      };
    }

    // Save session - await to ensure session is saved before returning
    if (!request.session) {
      throw new HttpException(
        'Session not available',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    await new Promise<void>((resolve, reject) => {
      request.session!.save((err: any) => {
        if (err) {
          this.loggingService.error(
            'Session save error',
            err instanceof Error ? err.stack : undefined,
            'AuthService',
            {
              category: LogCategory.AUTHENTICATION,
              error: err instanceof Error ? err : new Error(String(err)),
              metadata: { userId: user.id, email: user.email },
            },
          );
          reject(
            new HttpException(
              'Failed to save session',
              HttpStatus.INTERNAL_SERVER_ERROR,
            ),
          );
        } else {
          resolve();
        }
      });
    });

    return {
      message: 'Login successful',
      user: userWithoutPassword,
    };
  }

  /**
   * Verify 2FA code and complete login
   */
  async verifyLogin2fa(
    verifyDto: { email: string; code: string },
    request: AuthenticatedRequest,
  ) {
    const { email, code } = verifyDto;

    // Check session for pending login
    if (!request.session || !request.session.pendingLogin) {
      throw new HttpException(
        'No pending login found. Please login again.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const pendingLogin = request.session.pendingLogin;

    // Check session timeout (5 minutes)
    const PENDING_LOGIN_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    if (
      pendingLogin.createdAt &&
      Date.now() - new Date(pendingLogin.createdAt).getTime() >
        PENDING_LOGIN_TIMEOUT
    ) {
      delete request.session.pendingLogin;
      throw new HttpException(
        'Login session expired. Please login again.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Verify email matches
    if (pendingLogin.email !== email) {
      throw new HttpException(
        'Email mismatch',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Find user
    const user = await this.usersService.findUserWithSecurityByEmail(email);
    if (!user || user.id !== pendingLogin.userId) {
      throw new HttpException(
        'User not found',
        HttpStatus.NOT_FOUND,
      );
    }

    // Verify 2FA is still enabled (prevent bypass)
    if (!user.security || !user.security.isTwoFactorEnabled) {
      delete request.session.pendingLogin;
      throw new HttpException(
        '2FA is no longer enabled. Please login again.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Verify 2FA code
    const verifyTwoFactorDto: VerifyTwoFactorDto = { code };
    try {
      await this.twofaService.verifyTwoFactor(user.id, verifyTwoFactorDto);
    } catch (error) {
      throw new HttpException(
        'Invalid 2FA code',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Clear pending login
    delete request.session.pendingLogin;

    // Store user in session (without password)
    const { password: _, security, ...userWithoutPassword } = user;
    if (request.session) {
      request.session.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        websocketId: user.websocketId,
        isVerified: user.security.isVerified,
      };
    }

    // Save session
    await new Promise<void>((resolve, reject) => {
      request.session!.save((err: any) => {
        if (err) {
          this.loggingService.error(
            'Session save error',
            err instanceof Error ? err.stack : undefined,
            'AuthService',
            {
              category: LogCategory.AUTHENTICATION,
              error: err instanceof Error ? err : new Error(String(err)),
              metadata: { userId: user.id, email: user.email },
            },
          );
          reject(
            new HttpException(
              'Failed to save session',
              HttpStatus.INTERNAL_SERVER_ERROR,
            ),
          );
        } else {
          resolve();
        }
      });
    });

    return {
      message: 'Login successful',
      user: userWithoutPassword,
    };
  }

  async logout(request: AuthenticatedRequest) {
    if (!request.session) {
      // Session already destroyed or doesn't exist
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      request.session!.destroy((err: any) => {
        if (err) {
          this.loggingService.error(
            'Session destroy error',
            err instanceof Error ? err.stack : undefined,
            'AuthService',
            {
              category: LogCategory.AUTHENTICATION,
              error: err instanceof Error ? err : new Error(String(err)),
            },
          );
          reject(
            new HttpException(
              'Failed to logout',
              HttpStatus.INTERNAL_SERVER_ERROR,
            ),
          );
        } else {
          resolve();
        }
      });
    });
  }

  // #########################################################
  // USER CHANGE, FORGOT & RESET PASSWORD
  // #########################################################

  async changePassword(changeDto: ChangeDto, request: AuthenticatedRequest) {
    const { currentPassword, newPassword } = changeDto;
    const userId = request.user?.id || request.session?.user?.id;

    if (!userId) {
      throw new HttpException(
        'User not found in session',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Get user with password
    const user = await this.usersService.findOne(userId);

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new HttpException(
        'Current password is incorrect',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if new password is different from current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new HttpException(
        'New password must be different from current password',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Hash new password
    const saltRounds = BCRYPT_SALT_ROUNDS;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await this.usersService.updateUserPassword(userId, hashedPassword);

    // Send password changed notification email
    try {
      await this.emailService.sendPasswordChangedEmail(
        user.email,
        user.username,
      );
    } catch (error) {
      this.loggingService.error(
        'Failed to send password changed email',
        error instanceof Error ? error.stack : undefined,
        'AuthService',
        {
          category: LogCategory.EMAIL,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { userId, email: user.email },
        },
      );
      // Don't fail the operation if email fails
    }

    return {
      message: 'Password changed successfully',
    };
  }

  async forgotPassword(forgotDto: ForgotDto) {
    const { email } = forgotDto;

    // Find user by email
    const user = await this.usersService.existsByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not for security
      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };
    }

    // Find security entity
    const security = await this.usersService.findSecurityByUserEmail(email);
    if (!security) {
      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };
    }

    // Generate password reset token (expires in configured hours)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + PASSWORD_RESET_TOKEN_EXPIRY_HOURS);

    // Update Security entity with reset token
    await this.usersService.updatePasswordResetToken(
      user.id,
      resetToken,
      expiresAt,
    );

    // Send forgot password email
    try {
      await this.emailService.sendForgotPasswordEmail(
        email,
        user.username,
        resetToken,
      );
    } catch (error) {
      this.loggingService.error(
        'Failed to send forgot password email',
        error instanceof Error ? error.stack : undefined,
        'AuthService',
        {
          category: LogCategory.EMAIL,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { email },
        },
      );
      // Don't reveal if email failed
    }

    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(resetDto: ResetDto) {
    const { token, newPassword } = resetDto;

    // Find security entity with this reset token
    const security =
      await this.usersService.findSecurityByPasswordResetToken(token);

    if (!security) {
      throw new HttpException(
        'Invalid or expired password reset token',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if token has expired
    if (
      !security.passwordResetTokenExpires ||
      security.passwordResetTokenExpires < new Date()
    ) {
      throw new HttpException(
        'Password reset token has expired',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Hash new password
    const saltRounds = BCRYPT_SALT_ROUNDS;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await this.usersService.updateUserPassword(
      security.user.id,
      hashedPassword,
    );

    // Clear reset token
    await this.usersService.clearPasswordResetToken(security.user.id);

    // Send password reset confirmation email
    try {
      await this.emailService.sendPasswordResetEmail(
        security.user.email,
        security.user.username,
        token,
      );
    } catch (error) {
      this.loggingService.error(
        'Failed to send password reset confirmation email',
        error instanceof Error ? error.stack : undefined,
        'AuthService',
        {
          category: LogCategory.EMAIL,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { email: security.user.email },
        },
      );
      // Don't fail the operation if email fails
    }

    return {
      message: 'Password has been reset successfully',
    };
  }
}
