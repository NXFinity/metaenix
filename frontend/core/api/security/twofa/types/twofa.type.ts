/**
 * Two-Factor Authentication Types
 */

export interface TwoFactorStatus {
  enabled: boolean;
  enabledAt: string | null;
  lastVerified: string | null;
  backupCodesCount: number;
}

export interface SetupTwoFactorRequest {
  password: string;
}

export interface SetupTwoFactorResponse {
  secret: string; // Temporary secret (not encrypted yet)
  qrCode: string; // QR code data URL
  manualEntryKey: string; // Manual entry key for authenticator apps
}

export interface EnableTwoFactorRequest {
  code: string; // 6-digit TOTP code
}

export interface BackupCodesResponse {
  codes: string[]; // Plain text codes (shown only once)
  generatedAt: string;
}

export interface VerifyTwoFactorRequest {
  code: string; // TOTP code or backup code
}

export interface VerifyTwoFactorResponse {
  message: string;
  verified: boolean;
}

export interface DisableTwoFactorRequest {
  password: string;
}

export interface DisableTwoFactorResponse {
  message: string;
}

