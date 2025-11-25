import { apiClient } from '@/lib/api/client';
import { REPORTS_ENDPOINTS } from './reports.endpoints';
import type {
  ReportResourceType,
  ReportReason,
  ReportStatus,
  CreateReportRequest,
  ReportResponse,
  Report,
  UpdateReportStatusRequest,
  PaginationParams,
  PaginationResponse,
} from './types/report.type';

/**
 * Reports Service
 * 
 * Universal reporting service that works with any resource type
 * (posts, videos, photos)
 */
export const reportsService = {
  /**
   * Create a report
   * @param data - Report data (resourceType, resourceId, reason, description)
   * @returns Report response
   */
  async create(data: CreateReportRequest): Promise<Report> {
    const response = await apiClient.post<Report>(
      REPORTS_ENDPOINTS.CREATE,
      data,
    );
    return response.data;
  },

  /**
   * Get all reports (admin only)
   * @param params - Pagination and filter parameters
   * @returns Paginated reports
   */
  async getAll(params?: PaginationParams & {
    status?: ReportStatus;
    resourceType?: ReportResourceType;
    userId?: string;
  }): Promise<PaginationResponse<Report>> {
    const response = await apiClient.get<PaginationResponse<Report>>(
      REPORTS_ENDPOINTS.GET_ALL,
      { params },
    );
    return response.data;
  },

  /**
   * Get a single report by ID (admin only)
   * @param id - Report ID
   * @returns Report
   */
  async getById(id: string): Promise<Report> {
    const response = await apiClient.get<Report>(
      REPORTS_ENDPOINTS.GET_BY_ID(id),
    );
    return response.data;
  },

  /**
   * Get reports for a specific resource (admin only)
   * @param resourceType - Type of resource (post, video, photo)
   * @param resourceId - ID of the resource
   * @param params - Pagination parameters
   * @returns Paginated reports
   */
  async getByResource(
    resourceType: ReportResourceType,
    resourceId: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<Report>> {
    const response = await apiClient.get<PaginationResponse<Report>>(
      REPORTS_ENDPOINTS.GET_BY_RESOURCE(resourceType, resourceId),
      { params },
    );
    return response.data;
  },

  /**
   * Update report status (admin only)
   * @param id - Report ID
   * @param data - Status update data
   * @returns Updated report
   */
  async updateStatus(
    id: string,
    data: UpdateReportStatusRequest,
  ): Promise<Report> {
    const response = await apiClient.patch<Report>(
      REPORTS_ENDPOINTS.UPDATE_STATUS(id),
      data,
    );
    return response.data;
  },
};

export default reportsService;

