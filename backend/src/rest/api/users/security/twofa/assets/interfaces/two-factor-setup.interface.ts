export interface TwoFactorSetupResponse {
  secret: string; // Temporary secret (not encrypted yet)
  qrCode: string; // QR code data URL
  manualEntryKey: string; // Manual entry key for authenticator apps
}

export interface BackupCodesResponse {
  codes: string[]; // Plain text codes (shown only once)
  generatedAt: Date;
}

