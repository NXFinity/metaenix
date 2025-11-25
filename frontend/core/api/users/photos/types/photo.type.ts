// ============================================
// Photo Types
// ============================================

export interface Photo {
  id: string;
  userId: string;
  title: string;
  slug: string | null;
  description: string | null;
  imageUrl: string;
  thumbnailUrl: string | null;
  mimeType: string | null;
  fileSize: number;
  width: number;
  height: number;
  storageKey: string | null;
  isPublic: boolean;
  status: 'processing' | 'ready' | 'failed';
  viewsCount: number;
  tags: string[];
  metadata: Record<string, any> | null;
  dateCreated: string;
  dateUpdated: string;
  dateDeleted: string | null;
  user?: {
    id: string;
    username: string;
    displayName: string;
    profile?: {
      avatar?: string | null;
    };
  };
}

export interface CreatePhotoRequest {
  title: string;
  description?: string | null;
  isPublic?: boolean;
  tags?: string[];
}

export interface UpdatePhotoRequest {
  title?: string;
  description?: string | null;
  isPublic?: boolean;
  tags?: string[];
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
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

export interface PhotoResponse {
  id: string;
  userId: string;
  title: string;
  slug: string | null;
  description: string | null;
  imageUrl: string;
  thumbnailUrl: string | null;
  mimeType: string | null;
  fileSize: number;
  width: number;
  height: number;
  storageKey: string | null;
  isPublic: boolean;
  status: string;
  viewsCount: number;
  tags: string[];
  metadata: Record<string, any> | null;
  dateCreated: string;
  dateUpdated: string;
  dateDeleted: string | null;
}

export interface DeletePhotoResponse {
  message: string;
}

