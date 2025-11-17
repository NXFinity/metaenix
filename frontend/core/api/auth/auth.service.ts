import { apiClient } from '@/lib/api/client';
import { AUTH_ENDPOINTS } from './auth.endpoints';
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  ResendVerifyEmailRequest,
  ResendVerifyEmailResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  VerifyLogin2faRequest,
  VerifyLogin2faResponse,
  LogoutResponse,
  User,
} from './type/auth.type';

/**
 * Authentication Service
 * 
 * Handles all authentication-related API calls including:
 * - User registration and email verification
 * - Login and logout
 * - Password management (change, forgot, reset)
 * - 2FA verification
 * - Current user retrieval
 */
export const authService = {
  /**
   * Register a new user account
   * @param data - Registration data (username, email, password)
   * @returns Registration response with user data
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>(
      AUTH_ENDPOINTS.REGISTER,
      data,
    );
    return response.data;
  },

  /**
   * Login with email and password
   * @param data - Login credentials (email, password)
   * @returns Login response (may include requiresTwoFactor flag)
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      AUTH_ENDPOINTS.LOGIN,
      data,
    );
    return response.data;
  },

  /**
   * Verify 2FA code and complete login
   * @param data - 2FA verification data (email, code)
   * @returns Login response with user data
   */
  async verifyLogin2fa(
    data: VerifyLogin2faRequest,
  ): Promise<VerifyLogin2faResponse> {
    const response = await apiClient.post<VerifyLogin2faResponse>(
      AUTH_ENDPOINTS.LOGIN_VERIFY_2FA,
      data,
    );
    return response.data;
  },

  /**
   * Logout current user and destroy session
   * @returns Logout confirmation message
   */
  async logout(): Promise<LogoutResponse> {
    const response = await apiClient.post<LogoutResponse>(
      AUTH_ENDPOINTS.LOGOUT,
    );
    return response.data;
  },

  /**
   * Get current authenticated user
   * @returns Current user data with full profile
   */
  async getMe(): Promise<User> {
    const response = await apiClient.get<User>(AUTH_ENDPOINTS.GET_ME);
    return response.data;
  },

  /**
   * Verify email address with verification token
   * @param data - Verification data (token)
   * @returns Verification response with user data
   */
  async verifyEmail(data: VerifyEmailRequest): Promise<VerifyEmailResponse> {
    const response = await apiClient.post<VerifyEmailResponse>(
      AUTH_ENDPOINTS.VERIFY_EMAIL,
      data,
    );
    return response.data;
  },

  /**
   * Resend verification email
   * @param data - Resend verification data (email)
   * @returns Confirmation message
   */
  async resendVerifyEmail(
    data: ResendVerifyEmailRequest,
  ): Promise<ResendVerifyEmailResponse> {
    const response = await apiClient.post<ResendVerifyEmailResponse>(
      AUTH_ENDPOINTS.RESEND_VERIFY_EMAIL,
      data,
    );
    return response.data;
  },

  /**
   * Change password for authenticated user
   * @param data - Password change data (currentPassword, newPassword)
   * @returns Confirmation message
   */
  async changePassword(
    data: ChangePasswordRequest,
  ): Promise<ChangePasswordResponse> {
    const response = await apiClient.post<ChangePasswordResponse>(
      AUTH_ENDPOINTS.CHANGE_PASSWORD,
      data,
    );
    return response.data;
  },

  /**
   * Request password reset email
   * @param data - Forgot password data (email)
   * @returns Confirmation message (does not reveal if email exists)
   */
  async forgotPassword(
    data: ForgotPasswordRequest,
  ): Promise<ForgotPasswordResponse> {
    const response = await apiClient.post<ForgotPasswordResponse>(
      AUTH_ENDPOINTS.FORGOT_PASSWORD,
      data,
    );
    return response.data;
  },

  /**
   * Reset password using reset token
   * @param data - Password reset data (token, newPassword)
   * @returns Confirmation message
   */
  async resetPassword(
    data: ResetPasswordRequest,
  ): Promise<ResetPasswordResponse> {
    const response = await apiClient.post<ResetPasswordResponse>(
      AUTH_ENDPOINTS.RESET_PASSWORD,
      data,
    );
    return response.data;
  },
};

