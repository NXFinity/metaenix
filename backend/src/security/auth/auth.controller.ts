import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyDto } from './dto/verify.dto';
import { ResendVerifyDto } from './dto/resend-verify.dto';
import { ChangeDto } from './dto/change.dto';
import { ForgotDto } from './dto/forgot.dto';
import { ResetDto } from './dto/reset.dto';
import { VerifyLogin2faDto } from './dto/verify-login-2fa.dto';
import { Public } from './decorators/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { Throttle } from '@throttle/throttle';
import {
  RATE_LIMITS,
  VERIFICATION_TOKEN_EXPIRY_MINUTES,
  PASSWORD_RESET_TOKEN_EXPIRY_HOURS,
} from '../../common/constants/app.constants';

@ApiTags('Security Management | Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // #########################################################
  // USER REGISTRATION
  // #########################################################

  @Public()
  @Throttle({
    limit: RATE_LIMITS.REGISTRATION.LIMIT,
    ttl: RATE_LIMITS.REGISTRATION.TTL,
  })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account. A verification email will be sent to the provided email address.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'Registration successful. Please check your email to verify your account.',
        },
        user: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            username: { type: 'string', example: 'johndoe' },
            displayName: { type: 'string', example: 'johndoe' },
            email: { type: 'string', example: 'john.doe@example.com' },
            websocketId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174001',
            },
            role: { type: 'string', example: 'Member' },
            dateCreated: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - User already exists or validation failed',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'Registration failed. Please check your information and try again.',
          ],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // #########################################################
  // EMAIL VERIFICATION
  // #########################################################

  @Public()
  @Throttle({
    limit: RATE_LIMITS.EMAIL_VERIFICATION.LIMIT,
    ttl: RATE_LIMITS.EMAIL_VERIFICATION.TTL,
  })
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify user email with verification token',
    description: `Verifies a user email address using the token sent to their email. Tokens expire after ${VERIFICATION_TOKEN_EXPIRY_MINUTES} minutes.`,
  })
  @ApiBody({ type: VerifyDto })
  @ApiResponse({
    status: 200,
    description: 'Email successfully verified',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Email successfully verified' },
        user: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            username: { type: 'string', example: 'johndoe' },
            displayName: { type: 'string', example: 'johndoe' },
            email: { type: 'string', example: 'john.doe@example.com' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid token or already verified',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['Invalid or expired verification token'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async verifyEmail(@Body() verifyDto: VerifyDto) {
    return this.authService.verifyEmail(verifyDto);
  }

  @Public()
  @Throttle({
    limit: RATE_LIMITS.RESEND_VERIFICATION.LIMIT,
    ttl: RATE_LIMITS.RESEND_VERIFICATION.TTL,
  })
  @Post('resend-verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend verification email with new token',
    description: `Resends a verification email with a new token. Previous tokens are invalidated. Rate limited to ${RATE_LIMITS.RESEND_VERIFICATION.LIMIT} requests per ${RATE_LIMITS.RESEND_VERIFICATION.TTL / 60} minutes.`,
  })
  @ApiBody({ type: ResendVerifyDto })
  @ApiResponse({
    status: 200,
    description: 'Verification email resent successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'Verification email has been resent. Please check your email.',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Email already verified or validation failed',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['Email has already been verified'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['User not found'],
        },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async resendVerifyEmail(@Body() resendVerifyDto: ResendVerifyDto) {
    return this.authService.resendVerifyEmail(resendVerifyDto);
  }

  // #########################################################
  // USER LOGIN & LOGOUT
  // #########################################################

  @Public()
  @Throttle({ limit: RATE_LIMITS.LOGIN.LIMIT, ttl: RATE_LIMITS.LOGIN.TTL })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login user with email and password',
    description: `Authenticates a user with email and password. Creates a session and stores user data including websocketId. Rate limited to ${RATE_LIMITS.LOGIN.LIMIT} attempts per ${RATE_LIMITS.LOGIN.TTL / 60} minutes.`,
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful or 2FA required',
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Login successful' },
            user: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '123e4567-e89b-12d3-a456-426614174000',
                },
                username: { type: 'string', example: 'johndoe' },
                displayName: { type: 'string', example: 'johndoe' },
                email: { type: 'string', example: 'john.doe@example.com' },
                websocketId: {
                  type: 'string',
                  example: '123e4567-e89b-12d3-a456-426614174001',
                },
                role: { type: 'string', example: 'Member' },
              },
            },
          },
        },
        {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Two-factor authentication required',
            },
            requiresTwoFactor: { type: 'boolean', example: true },
            email: { type: 'string', example: 'john.doe@example.com' },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid credentials',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['Invalid email or password'],
        },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Email not verified, banned, or timed out',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['Please verify your email before logging in'],
        },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.login(loginDto, request);
  }

  @Public()
  @Throttle({ limit: RATE_LIMITS.LOGIN.LIMIT, ttl: RATE_LIMITS.LOGIN.TTL })
  @Post('login/verify-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify 2FA code and complete login',
    description:
      'Verifies the 2FA code after initial login. Completes the authentication process and creates a session.',
  })
  @ApiBody({ type: VerifyLogin2faDto })
  @ApiResponse({
    status: 200,
    description: '2FA verified and login successful',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Login successful' },
        user: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            username: { type: 'string', example: 'johndoe' },
            displayName: { type: 'string', example: 'johndoe' },
            email: { type: 'string', example: 'john.doe@example.com' },
            websocketId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174001',
            },
            role: { type: 'string', example: 'Member' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - No pending login or email mismatch',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid 2FA code',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async verifyLogin2fa(
    @Body() verifyDto: VerifyLogin2faDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.verifyLogin2fa(verifyDto, request);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout user and destroy session',
    description:
      'Destroys the current user session and logs them out. Requires authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logout successful' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - User not logged in',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['Unauthorized'],
        },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async logout(@Req() request: AuthenticatedRequest) {
    await this.authService.logout(request);
    return {
      message: 'Logout successful',
    };
  }

  // #########################################################
  // USER CHANGE, FORGOT & RESET PASSWORD
  // #########################################################

  @Throttle({
    limit: RATE_LIMITS.PASSWORD_CHANGE.LIMIT,
    ttl: RATE_LIMITS.PASSWORD_CHANGE.TTL,
  })
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change password for authenticated user',
    description: `Changes the password for the currently authenticated user. Requires current password verification. Rate limited to ${RATE_LIMITS.PASSWORD_CHANGE.LIMIT} changes per hour.`,
  })
  @ApiBody({ type: ChangeDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password changed successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Current password incorrect or new password invalid',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['Current password is incorrect'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - User not logged in',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['Unauthorized'],
        },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async changePassword(
    @Body() changeDto: ChangeDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.changePassword(changeDto, request);
  }

  @Public()
  @Throttle({
    limit: RATE_LIMITS.FORGOT_PASSWORD.LIMIT,
    ttl: RATE_LIMITS.FORGOT_PASSWORD.TTL,
  })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset email',
    description: `Sends a password reset email if an account with the provided email exists. Does not reveal whether the email exists for security. Rate limited to ${RATE_LIMITS.FORGOT_PASSWORD.LIMIT} requests per hour.`,
  })
  @ApiBody({ type: ForgotDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent if account exists',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'If an account with that email exists, a password reset link has been sent.',
        },
      },
    },
  })
  async forgotPassword(@Body() forgotDto: ForgotDto) {
    return this.authService.forgotPassword(forgotDto);
  }

  @Public()
  @Throttle({
    limit: RATE_LIMITS.RESET_PASSWORD.LIMIT,
    ttl: RATE_LIMITS.RESET_PASSWORD.TTL,
  })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password using reset token',
    description: `Resets the user password using the token sent via email. Tokens expire after ${PASSWORD_RESET_TOKEN_EXPIRY_HOURS} hour. Rate limited to ${RATE_LIMITS.RESET_PASSWORD.LIMIT} attempts per ${RATE_LIMITS.RESET_PASSWORD.TTL / 60} minutes.`,
  })
  @ApiBody({ type: ResetDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password has been reset successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid or expired token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['Invalid or expired password reset token'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async resetPassword(@Body() resetDto: ResetDto) {
    return this.authService.resetPassword(resetDto);
  }
}
