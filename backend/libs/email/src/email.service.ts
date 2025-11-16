import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { getVerificationEmailTemplate } from './templates/verifyEmail';
import { getWelcomeEmailTemplate } from './templates/welcomeEmail';
import { getPasswordResetEmailTemplate } from './templates/resetPasswordEmail';
import { getPasswordChangedEmailTemplate } from './templates/changePasswordEmail';
import { getForgotPasswordEmailTemplate } from './templates/forgotPasswordEmail';
import { getTwoFactorEmailTemplate } from './templates/twoFactorEmail';

/**
 * Email Service
 *
 * Handles sending emails via SMTP
 * Supports HTML templates for verification, password reset, etc.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<boolean>('SMTP_SECURE') === true,
      auth: {
        user: this.configService.get<string>('SMTP_USERNAME'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
      tls: {
        rejectUnauthorized:
          this.configService.get<boolean>('SMTP_TLS') !== false,
      },
    });
  }

  /**
   * Send email verification email
   *
   * @param to - Recipient email address
   * @param username - User's username
   * @param token - Verification token
   */
  async sendVerificationEmail(
    to: string,
    username: string,
    token: string,
  ): Promise<boolean> {
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/auth/verify-email?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_USERNAME'),
        to,
        subject: 'Verify Your Email - Meta EN|IX',
        html: getVerificationEmailTemplate(
          username,
          verificationUrl,
          token,
          this.configService.get('FRONTEND_URL') || '',
        ),
      });

      this.logger.log(`Verification email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${to}:`, error);

      // Check for various types of invalid email address errors
      const errorMessage = error.response || error.message || '';
      const isInvalidEmail =
        errorMessage.includes('User unknown in virtual mailbox table') ||
        errorMessage.includes('Recipient address rejected') ||
        errorMessage.includes('Invalid recipient') ||
        errorMessage.includes('No such user') ||
        errorMessage.includes('Mailbox not found') ||
        errorMessage.includes('Address not found') ||
        errorMessage.includes('Invalid address') ||
        errorMessage.includes('Recipient not found');

      if (isInvalidEmail) {
        this.logger.warn(
          `Invalid email address: ${to} - email does not exist or is invalid`,
        );
        return false;
      }

      // For other email errors, still return false but don't throw
      return false;
    }
  }

  /**
   * Send password reset email
   *
   * @param to - Recipient email address
   * @param username - User's username
   * @param token - Password reset token
   */
  async sendPasswordResetEmail(
    to: string,
    username: string,
    token: string,
  ): Promise<boolean> {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/auth/reset-password?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_USERNAME'),
        to,
        subject: 'Reset Your Password - Meta EN|IX',
        html: getPasswordResetEmailTemplate(username, resetUrl, token),
      });

      this.logger.log(`Password reset email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}:`, error);

      // Check for various types of invalid email address errors
      const errorMessage = error.response || error.message || '';
      const isInvalidEmail =
        errorMessage.includes('User unknown in virtual mailbox table') ||
        errorMessage.includes('Recipient address rejected') ||
        errorMessage.includes('Invalid recipient') ||
        errorMessage.includes('No such user') ||
        errorMessage.includes('Mailbox not found') ||
        errorMessage.includes('Address not found') ||
        errorMessage.includes('Invalid address') ||
        errorMessage.includes('Recipient not found');

      if (isInvalidEmail) {
        this.logger.warn(
          `Invalid email address: ${to} - email does not exist or is invalid`,
        );
        return false;
      }

      // For other email errors, still return false but don't throw
      return false;
    }
  }

  /**
   * Send forgot password email
   *
   * @param to - Recipient email address
   * @param username - User's username
   * @param token - Password reset token
   */
  async sendForgotPasswordEmail(
    to: string,
    username: string,
    token: string,
  ): Promise<boolean> {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/auth/reset-password?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_USERNAME'),
        to,
        subject: 'Reset Your Password - Meta EN|IX',
        html: getForgotPasswordEmailTemplate(username, resetUrl, token),
      });

      this.logger.log(`Forgot password email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send forgot password email to ${to}:`, error);

      // Check for various types of invalid email address errors
      const errorMessage = error.response || error.message || '';
      const isInvalidEmail =
        errorMessage.includes('User unknown in virtual mailbox table') ||
        errorMessage.includes('Recipient address rejected') ||
        errorMessage.includes('Invalid recipient') ||
        errorMessage.includes('No such user') ||
        errorMessage.includes('Mailbox not found') ||
        errorMessage.includes('Address not found') ||
        errorMessage.includes('Invalid address') ||
        errorMessage.includes('Recipient not found');

      if (isInvalidEmail) {
        this.logger.warn(
          `Invalid email address: ${to} - email does not exist or is invalid`,
        );
        return false;
      }

      // For other email errors, still return false but don't throw
      return false;
    }
  }

  /**
   * Send password changed notification email
   *
   * @param to - Recipient email address
   * @param username - User's username
   */
  async sendPasswordChangedEmail(
    to: string,
    username: string,
  ): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_USERNAME'),
        to,
        subject: 'Password Changed - Meta EN|IX',
        html: getPasswordChangedEmailTemplate(username),
      });

      this.logger.log(`Password changed notification sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send password changed email to ${to}:`,
        error,
      );

      // Check for various types of invalid email address errors
      const errorMessage = error.response || error.message || '';
      const isInvalidEmail =
        errorMessage.includes('User unknown in virtual mailbox table') ||
        errorMessage.includes('Recipient address rejected') ||
        errorMessage.includes('Invalid recipient') ||
        errorMessage.includes('No such user') ||
        errorMessage.includes('Mailbox not found') ||
        errorMessage.includes('Address not found') ||
        errorMessage.includes('Invalid address') ||
        errorMessage.includes('Recipient not found');

      if (isInvalidEmail) {
        this.logger.warn(
          `Invalid email address: ${to} - email does not exist or is invalid`,
        );
        return false;
      }

      // For other email errors, still return false but don't throw
      return false;
    }
  }

  /**
   * Send welcome email
   *
   * @param to - Recipient email address
   * @param username - User's username
   */
  async sendWelcomeEmail(to: string, username: string): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_USERNAME'),
        to,
        subject: 'Welcome to Meta EN|IX!',
        html: getWelcomeEmailTemplate(
          username,
          this.configService.get('FRONTEND_URL') || '',
        ),
      });

      this.logger.log(`Welcome email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${to}:`, error);

      // Check for various types of invalid email address errors
      const errorMessage = error.response || error.message || '';
      const isInvalidEmail =
        errorMessage.includes('User unknown in virtual mailbox table') ||
        errorMessage.includes('Recipient address rejected') ||
        errorMessage.includes('Invalid recipient') ||
        errorMessage.includes('No such user') ||
        errorMessage.includes('Mailbox not found') ||
        errorMessage.includes('Address not found') ||
        errorMessage.includes('Invalid address') ||
        errorMessage.includes('Recipient not found');

      if (isInvalidEmail) {
        this.logger.warn(
          `Invalid email address: ${to} - email does not exist or is invalid`,
        );
        return false;
      }

      // For other email errors, still return false but don't throw
      return false;
    }
  }

  /**
   * Send 2FA activation email with backup codes
   *
   * @param to - Recipient email address
   * @param username - User's username
   * @param backupCodes - Array of backup codes
   */
  async sendTwoFactorEmail(
    to: string,
    username: string,
    backupCodes: string[],
  ): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_USERNAME'),
        to,
        subject: 'Two-Factor Authentication Enabled - Meta EN|IX',
        html: getTwoFactorEmailTemplate(
          username,
          backupCodes,
          this.configService.get('FRONTEND_URL') || '',
        ),
      });

      this.logger.log(`2FA activation email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send 2FA email to ${to}:`, error);

      // Check for various types of invalid email address errors
      const errorMessage = error.response || error.message || '';
      const isInvalidEmail =
        errorMessage.includes('User unknown in virtual mailbox table') ||
        errorMessage.includes('Recipient address rejected') ||
        errorMessage.includes('Invalid recipient') ||
        errorMessage.includes('No such user') ||
        errorMessage.includes('Mailbox not found') ||
        errorMessage.includes('Address not found') ||
        errorMessage.includes('Invalid address') ||
        errorMessage.includes('Recipient not found');

      if (isInvalidEmail) {
        this.logger.warn(
          `Invalid email address: ${to} - email does not exist or is invalid`,
        );
        return false;
      }

      // For other email errors, still return false but don't throw
      return false;
    }
  }

  /**
   * Send generic email
   *
   * @param to - Recipient email
   * @param subject - Email subject
   * @param html - HTML content
   */
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_USERNAME'),
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('SMTP connection failed:', error);
      return false;
    }
  }
}
