import { apiClient } from '@/lib/api/client';
import { TWOFA_ENDPOINTS } from './twofa.endpoints';
import type {
  TwoFactorStatus,
  SetupTwoFactorRequest,
  SetupTwoFactorResponse,
  EnableTwoFactorRequest,
  BackupCodesResponse,
  VerifyTwoFactorRequest,
  VerifyTwoFactorResponse,
  DisableTwoFactorRequest,
  DisableTwoFactorResponse,
} from './types/twofa.type';

/**
 * Two-Factor Authentication Service
 * 
 * Handles all 2FA-related API calls including:
 * - Getting 2FA status
 * - Setting up 2FA (generating secret and QR code)
 * - Enabling 2FA (verifying code)
 * - Verifying 2FA codes
 * - Disabling 2FA
 * - Managing backup codes
 */
export const twofaService = {
  /**
   * Get 2FA status
   * @returns 2FA status information
   */
  async getStatus(): Promise<TwoFactorStatus> {
    const response = await apiClient.get<TwoFactorStatus>(
      TWOFA_ENDPOINTS.GET_STATUS,
    );
    return response.data;
  },

  /**
   * Setup 2FA - Generate secret and QR code
   * @param data - Setup data (password)
   * @returns Setup response with secret, QR code, and manual entry key
   */
  async setup(data: SetupTwoFactorRequest): Promise<SetupTwoFactorResponse> {
    const response = await apiClient.post<SetupTwoFactorResponse>(
      TWOFA_ENDPOINTS.SETUP,
      data,
    );
    return response.data;
  },

  /**
   * Enable 2FA - Verify code and enable
   * @param data - Enable data (6-digit code)
   * @returns Backup codes response
   */
  async enable(data: EnableTwoFactorRequest): Promise<BackupCodesResponse> {
    const response = await apiClient.post<BackupCodesResponse>(
      TWOFA_ENDPOINTS.ENABLE,
      data,
    );
    return response.data;
  },

  /**
   * Verify 2FA code (standalone verification)
   * @param data - Verification data (code)
   * @returns Verification response
   */
  async verify(data: VerifyTwoFactorRequest): Promise<VerifyTwoFactorResponse> {
    const response = await apiClient.post<VerifyTwoFactorResponse>(
      TWOFA_ENDPOINTS.VERIFY,
      data,
    );
    return response.data;
  },

  /**
   * Disable 2FA
   * @param data - Disable data (password)
   * @returns Disable confirmation
   */
  async disable(
    data: DisableTwoFactorRequest,
  ): Promise<DisableTwoFactorResponse> {
    const response = await apiClient.post<DisableTwoFactorResponse>(
      TWOFA_ENDPOINTS.DISABLE,
      data,
    );
    return response.data;
  },

  /**
   * Get backup codes (requires 2FA verification)
   * @param data - Verification data (code)
   * @returns Backup codes response
   */
  async getBackupCodes(
    data: VerifyTwoFactorRequest,
  ): Promise<BackupCodesResponse> {
    const response = await apiClient.post<BackupCodesResponse>(
      TWOFA_ENDPOINTS.GET_BACKUP_CODES,
      data,
    );
    return response.data;
  },

  /**
   * Regenerate backup codes (requires 2FA verification)
   * @param data - Verification data (code)
   * @returns New backup codes response
   */
  async regenerateBackupCodes(
    data: VerifyTwoFactorRequest,
  ): Promise<BackupCodesResponse> {
    const response = await apiClient.post<BackupCodesResponse>(
      TWOFA_ENDPOINTS.REGENERATE_BACKUP_CODES,
      data,
    );
    return response.data;
  },
};

