// ============================================
// Report Types
// ============================================

export type ReportResourceType = 'post' | 'video' | 'photo';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'violence'
  | 'copyright'
  | 'false_information'
  | 'inappropriate_content'
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  userId: string;
  resourceType: ReportResourceType;
  resourceId: string;
  reason: ReportReason;
  description?: string | null;
  status: ReportStatus;
  dateCreated: string;
  dateUpdated?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reporter?: {
    id: string;
    username: string;
    displayName: string;
    profile?: {
      avatar?: string | null;
    };
  };
}

export interface CreateReportRequest {
  resourceType: ReportResourceType;
  resourceId: string;
  reason: ReportReason;
  description?: string;
}

export interface ReportResponse {
  data: Report;
  message?: string;
}

export interface UpdateReportStatusRequest {
  status: ReportStatus;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

