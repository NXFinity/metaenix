// ============================================
// Request Types
// ============================================

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerifyEmailRequest {
  email: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface VerifyLogin2faRequest {
  email: string;
  code: string;
  tempToken: string; // Temporary token from login response
}

// ============================================
// Response Types
// ============================================

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  websocketId: string;
  role: string;
  dateCreated?: string;
  isPublic?: boolean;
  profile?: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    location?: string;
    website?: string;
  };
  privacy?: {
    isFollowerOnly: boolean;
    isSubscriberOnly: boolean;
    allowMessages: boolean;
  };
  security?: {
    isVerified: boolean;
    isTwoFactorEnabled: boolean;
    isBanned: boolean;
  };
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface LoginResponse {
  message: string;
  user?: User;
  requiresTwoFactor?: boolean;
  email?: string;
  tempToken?: string; // Temporary token for 2FA verification
  accessToken?: string; // JWT access token
  refreshToken?: string; // JWT refresh token
}

export interface VerifyEmailResponse {
  message: string;
  user: User;
}

export interface ResendVerifyEmailResponse {
  message: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface VerifyLogin2faResponse {
  message: string;
  user: User;
  accessToken: string; // JWT access token
  refreshToken: string; // JWT refresh token
}

export interface LogoutResponse {
  message: string;
}

// ============================================
// Error Types
// ============================================

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
