import { apiClient } from '@/lib/api/client';
import { ADMIN_ENDPOINTS } from '../admin.endpoints';
import type {
  SecurityAlert,
  SecurityEvent,
  Session,
  BlockIPRequest,
} from '../types/admin.type';
import type { PaginationParams, PaginationResponse } from '@/core/api/users/posts/types/post.type';

/**
 * Admin Security Service
 * 
 * Handles all admin security operations including:
 * - Security alerts
 * - Security events
 * - Audit logs
 * - Session management
 * - IP blocking
 */
export const adminSecurityService = {
  /**
   * Get security alerts
   */
  async getAlerts(): Promise<SecurityAlert[]> {
    const response = await apiClient.get<SecurityAlert[]>(
      ADMIN_ENDPOINTS.GET_SECURITY_ALERTS,
    );
    return response.data;
  },

  /**
   * Get security events
   */
  async getEvents(
    params?: PaginationParams & { severity?: 'low' | 'medium' | 'high' | 'critical' },
  ): Promise<PaginationResponse<SecurityEvent>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.severity) queryParams.append('severity', params.severity);

    const response = await apiClient.get<PaginationResponse<SecurityEvent>>(
      `${ADMIN_ENDPOINTS.GET_SECURITY_EVENTS}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
    );
    return response.data;
  },

  /**
   * Get audit logs
   */
  async getAuditLogs(
    params?: PaginationParams & { category?: string },
  ): Promise<PaginationResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.category) queryParams.append('category', params.category);

    const response = await apiClient.get<PaginationResponse<any>>(
      `${ADMIN_ENDPOINTS.GET_AUDIT_LOGS}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
    );
    return response.data;
  },

  /**
   * Get specific audit log entry
   */
  async getAuditLog(id: string): Promise<any> {
    const response = await apiClient.get<any>(ADMIN_ENDPOINTS.GET_AUDIT_LOG(id));
    return response.data;
  },

  /**
   * Get active sessions
   */
  async getSessions(params?: PaginationParams): Promise<PaginationResponse<Session>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get<PaginationResponse<Session>>(
      `${ADMIN_ENDPOINTS.GET_SESSIONS}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
    );
    return response.data;
  },

  /**
   * Terminate session
   */
  async terminateSession(userId: string): Promise<void> {
    await apiClient.delete(ADMIN_ENDPOINTS.TERMINATE_SESSION(userId));
  },

  /**
   * Get blocked IPs
   */
  async getBlockedIPs(): Promise<Array<{ ip: string; blockedAt: string; reason?: string }>> {
    const response = await apiClient.get<Array<{ ip: string; blockedAt: string; reason?: string }>>(
      ADMIN_ENDPOINTS.GET_BLOCKED_IPS,
    );
    return response.data;
  },

  /**
   * Block IP
   */
  async blockIP(data: BlockIPRequest): Promise<void> {
    await apiClient.post(ADMIN_ENDPOINTS.BLOCK_IP, data);
  },

  /**
   * Unblock IP
   */
  async unblockIP(ip: string): Promise<void> {
    await apiClient.delete(ADMIN_ENDPOINTS.UNBLOCK_IP(ip));
  },
};

