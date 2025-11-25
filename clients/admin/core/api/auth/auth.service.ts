import { apiClient } from '@/lib/api/client';
import { AUTH_ENDPOINTS } from './auth.endpoints';

export interface CreateAdminSessionResponse {
  message: string;
  sessionToken: string;
  expiresAt: string;
}

export interface ExchangeAdminSessionRequest {
  sessionToken: string;
}

export interface ExchangeAdminSessionResponse {
  message: string;
  adminSessionToken: string;
  expiresAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}

/**
 * Auth Service for Admin Client
 * 
 * Handles admin session authentication
 */
export const authService = {
  /**
   * Create an admin session token (called from main app)
   * @returns Session token for admin client authentication
   */
  async createAdminSession(): Promise<CreateAdminSessionResponse> {
    const response = await apiClient.post<CreateAdminSessionResponse>(
      AUTH_ENDPOINTS.CREATE_ADMIN_SESSION,
    );
    return response.data;
  },

  /**
   * Exchange admin session token for admin authentication tokens
   * @param sessionToken - Short-lived session token from main app
   * @returns Admin session token and user data
   */
  async exchangeAdminSession(
    sessionToken: string,
  ): Promise<ExchangeAdminSessionResponse> {
    console.log('Calling exchange endpoint:', AUTH_ENDPOINTS.EXCHANGE_ADMIN_SESSION);
    console.log('Session token length:', sessionToken?.length);
    
    try {
      const response = await apiClient.post<
        ExchangeAdminSessionResponse,
        ExchangeAdminSessionRequest
      >(AUTH_ENDPOINTS.EXCHANGE_ADMIN_SESSION, {
        sessionToken,
      });
      console.log('Exchange response received:', { 
        hasToken: !!response.data.adminSessionToken,
        hasUser: !!response.data.user 
      });
      return response.data;
    } catch (error: any) {
      console.error('Exchange endpoint error:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        url: error?.config?.url,
        method: error?.config?.method,
        data: error?.config?.data,
      });
      throw error;
    }
  },
};

