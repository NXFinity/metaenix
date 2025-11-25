import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '@redis/redis';

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
import { LoggingService, AuditLogService } from '@logging/logging';
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
    private readonly auditLogService: AuditLogService,
    private readonly twofaService: TwofaService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  // #########################################################
  // HELPER METHODS
  // #########################################################

  /**
   * Generate JWT access token and refresh token for a user
   * @param user - User entity
   * @param response - Express response object (optional, for setting cookies)
   * @returns Auth response with tokens (or sets cookies if response provided)
   */
  private async generateAuthResponse(user: User, response?: any) {
    const { password: _, security, ...userWithoutPassword } = user;

    // Check if using httpOnly cookies (declare once at top of function)
    const useCookies = this.configService.get<string>('USE_HTTPONLY_COOKIES') === 'true';

    // Get or initialize token version for this user
    const tokenVersionKey = this.redisService.keyBuilder.build(
      'auth',
      'token-version',
      user.id,
    );
    let tokenVersionStr = await this.redisService.get<string>(tokenVersionKey, false);
    let tokenVersion: number;
    if (tokenVersionStr === null) {
      tokenVersion = 1;
      // Store version with long expiry (1 year)
      await this.redisService.set(tokenVersionKey, tokenVersion.toString(), 365 * 24 * 60 * 60);
    } else {
      tokenVersion = parseInt(tokenVersionStr, 10) || 1;
    }

    // Generate JWT access token with version
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      websocketId: user.websocketId,
      tokenVersion,
    };

    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token (longer expiry)
    const refreshTokenExpiresIn = this.configService.get<string>(
      'REFRESH_TOKEN_EXPIRES_IN',
    ) || '7d';
    const refreshTokenSecret = this.configService.get<string>(
      'REFRESH_TOKEN_SECRET',
    ) || this.configService.get<string>('JWT_SECRET'); // Fallback to JWT_SECRET if not set

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: refreshTokenSecret,
        expiresIn: refreshTokenExpiresIn as any,
      },
    );

    // Store refresh token in Redis for blacklisting (optional, for logout functionality)
    const refreshTokenKey = this.redisService.keyBuilder.build(
      'auth',
      'refresh-token',
      user.id,
      refreshToken.substring(refreshToken.length - 20), // Last 20 chars as identifier
    );
    await this.redisService.set(
      refreshTokenKey,
      'valid',
      this.parseExpiryToSeconds(refreshTokenExpiresIn),
    );

    // Set httpOnly cookies if response object is provided
    if (useCookies && response) {
      const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
      const cookieDomain = this.configService.get<string>('COOKIE_DOMAIN');
      
      // Parse access token expiry (default 1 hour)
      const accessTokenExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '1h';
      const accessTokenMaxAge = this.parseExpiryToSeconds(accessTokenExpiresIn);
      const refreshTokenMaxAge = this.parseExpiryToSeconds(refreshTokenExpiresIn);

      // Set access token cookie
      response.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: isProduction, // HTTPS only in production
        sameSite: 'strict',
        maxAge: accessTokenMaxAge * 1000, // Convert to milliseconds
        path: '/',
        ...(cookieDomain && { domain: cookieDomain }),
      });

      // Set refresh token cookie
      response.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction, // HTTPS only in production
        sameSite: 'strict',
        maxAge: refreshTokenMaxAge * 1000, // Convert to milliseconds
        path: '/',
        ...(cookieDomain && { domain: cookieDomain }),
      });
    }

    // If using cookies, don't return tokens in response body
    if (useCookies && response) {
      return {
        message: 'Login successful',
        user: userWithoutPassword,
        // Tokens are in httpOnly cookies, not in response body
      };
    }

    // Return tokens in response body (legacy behavior)
    return {
      message: 'Login successful',
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Parse expiry string (e.g., "7d", "2h", "30m") to seconds
   */
  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60; // Default 7 days

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 7 * 24 * 60 * 60;
    }
  }

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

  async login(loginDto: LoginDto, response?: any) {
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

    // Check if user has a websocketId (created during registration)
    // The websocketId is used to establish WebSocket connections AFTER login
    // The WebSocket connection is established by the frontend after receiving the login response
    if (!user.websocketId) {
      throw new HttpException(
        'Account configuration error: websocketId missing',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Check if 2FA is enabled
    if (user.security.isTwoFactorEnabled) {
      // Generate temporary token for 2FA verification
      const tempToken = crypto.randomBytes(32).toString('hex');
      const PENDING_LOGIN_TIMEOUT = 5 * 60; // 5 minutes in seconds

      // Store temporary login data in Redis
      await this.redisService.set(
        this.redisService.keyBuilder.build('auth', 'pending-login', tempToken),
        JSON.stringify({
          userId: user.id,
          email: user.email,
          passwordVerified: true,
          createdAt: new Date().toISOString(),
        }),
        PENDING_LOGIN_TIMEOUT,
      );

      // Return requiresTwoFactor flag with temp token
      return {
        message: 'Two-factor authentication required',
        requiresTwoFactor: true,
        email: user.email,
        tempToken, // Client will send this back with 2FA code
      };
    }

    // No 2FA - proceed with normal login and generate JWT tokens
    return this.generateAuthResponse(user, response);
  }

  /**
   * Verify 2FA code and complete login
   */
  async verifyLogin2fa(verifyDto: {
    email: string;
    code: string;
    tempToken: string;
  }, response?: any) {
    const { email, code, tempToken } = verifyDto;

    // Retrieve pending login from Redis
    const pendingLoginKey = this.redisService.keyBuilder.build(
      'auth',
      'pending-login',
      tempToken,
    );
    const pendingLogin = await this.redisService.get<{
      userId: string;
      email: string;
      passwordVerified: boolean;
      createdAt: string;
    }>(pendingLoginKey);

    if (!pendingLogin) {
      throw new HttpException(
        'No pending login found. Please login again.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check timeout (already handled by Redis TTL, but verify)
    const createdAt = new Date(pendingLogin.createdAt);
    const PENDING_LOGIN_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    if (Date.now() - createdAt.getTime() > PENDING_LOGIN_TIMEOUT) {
      await this.redisService.del(pendingLoginKey);
      throw new HttpException(
        'Login session expired. Please login again.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Verify email matches
    if (pendingLogin.email !== email) {
      throw new HttpException('Email mismatch', HttpStatus.BAD_REQUEST);
    }

    // Find user
    const user = await this.usersService.findUserWithSecurityByEmail(email);
    if (!user || user.id !== pendingLogin.userId) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Verify 2FA is still enabled (prevent bypass)
    if (!user.security || !user.security.isTwoFactorEnabled) {
      await this.redisService.del(pendingLoginKey);
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
      throw new HttpException('Invalid 2FA code', HttpStatus.UNAUTHORIZED);
    }

    // Clear pending login from Redis
    await this.redisService.del(pendingLoginKey);

    // Generate JWT tokens and return
    return this.generateAuthResponse(user, response);
  }

  async logout(userId: string, refreshToken?: string, response?: any) {
    // If refresh token provided, blacklist it
    if (refreshToken) {
      const refreshTokenKey = this.redisService.keyBuilder.build(
        'auth',
        'refresh-token',
        userId,
        refreshToken.substring(refreshToken.length - 20),
      );
      await this.redisService.del(refreshTokenKey);
    }

    // Clear httpOnly cookies if using cookies
    const useCookies = this.configService.get<string>('USE_HTTPONLY_COOKIES') === 'true';
    if (useCookies && response) {
      response.clearCookie('accessToken', { path: '/' });
      response.clearCookie('refreshToken', { path: '/' });
    }

    // Optionally: Blacklist all tokens for this user (if implementing token revocation)
    // For now, we'll just log the logout
    this.loggingService.log(
      `User logged out: ${userId}`,
      'AuthService',
      {
        category: LogCategory.AUTHENTICATION,
        metadata: { userId },
      },
    );

    return Promise.resolve();
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

  // #########################################################
  // ADMIN SESSION AUTHENTICATION
  // #########################################################

  /**
   * Create an admin session token for cross-app authentication
   * @param userId - Authenticated user ID (must be admin)
   * @returns Admin session token
   */
  async createAdminSession(userId: string): Promise<{ sessionToken: string; expiresAt: string }> {
    // Fetch full user entity
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Verify user is admin
    const adminRoles = [ROLE.Administrator, ROLE.Founder, ROLE.Chief_Executive];
    if (!adminRoles.includes(user.role as ROLE)) {
      throw new HttpException(
        'Access denied. Administrator privileges required.',
        HttpStatus.FORBIDDEN,
      );
    }

    // Generate session token (short-lived, 15 minutes - just for exchange)
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store session token in Redis
    const sessionKey = this.redisService.keyBuilder.build(
      'auth',
      'admin-session',
      sessionToken,
    );
    await this.redisService.set(
      sessionKey,
      JSON.stringify({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: new Date().toISOString(),
      }),
      15 * 60, // 15 minutes in seconds
    );

    // Log admin session creation
    await this.auditLogService.saveAuditLog({
      message: `Admin session token created for ${user.username}`,
      userId: user.id,
      category: LogCategory.SECURITY,
      metadata: {
        action: 'admin_session_create',
        username: user.username,
        email: user.email,
        role: user.role,
        sessionToken: sessionToken.substring(0, 8) + '...', // Partial token for logging
      },
    });

    return {
      sessionToken,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Exchange admin session token for admin authentication tokens
   * @param sessionToken - Admin session token
   * @returns Admin authentication tokens and user data
   */
  async exchangeAdminSession(sessionToken: string): Promise<{
    adminSessionToken: string;
    expiresAt: string; // ISO string for frontend
    user: {
      id: string;
      username: string;
      email: string;
      role: string;
    };
  }> {
    // Retrieve session from Redis
    const sessionKey = this.redisService.keyBuilder.build(
      'auth',
      'admin-session',
      sessionToken,
    );
    const sessionData = await this.redisService.get<string>(sessionKey, false);

    if (!sessionData) {
      throw new HttpException(
        'Invalid or expired admin session token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const session = JSON.parse(sessionData);

    // Verify user still exists and is still admin
    const user = await this.usersService.findOne(session.userId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const adminRoles = [ROLE.Administrator, ROLE.Founder, ROLE.Chief_Executive];
    if (!adminRoles.includes(user.role as ROLE)) {
      throw new HttpException(
        'User no longer has administrator privileges',
        HttpStatus.FORBIDDEN,
      );
    }

    // Delete the one-time session token
    await this.redisService.del(sessionKey);

    // Generate admin session token (long-lived, 24 hours - persists until browser closes)
    // Client-side will clear from localStorage when page closes
    const adminSessionToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        websocketId: user.websocketId,
        type: 'admin-session',
      },
      {
        expiresIn: '24h', // 24 hours - persists during work session
      },
    );

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store admin session in Redis for tracking (24 hours)
    const adminSessionKey = this.redisService.keyBuilder.build(
      'auth',
      'admin-active-session',
      user.id,
      adminSessionToken.substring(0, 16), // Store partial token for reference
    );
    await this.redisService.set(
      adminSessionKey,
      JSON.stringify({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      }),
      24 * 60 * 60, // 24 hours in seconds
    );

    // Log admin session exchange (session established)
    await this.auditLogService.saveAuditLog({
      message: `Admin session established for ${user.username}`,
      userId: user.id,
      category: LogCategory.SECURITY,
      metadata: {
        action: 'admin_session_exchange',
        username: user.username,
        email: user.email,
        role: user.role,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return {
      adminSessionToken,
      expiresAt: expiresAt.toISOString(), // Convert to ISO string for frontend
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }
}
