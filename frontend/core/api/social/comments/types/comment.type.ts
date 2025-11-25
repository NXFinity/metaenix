// ============================================
// Comment Types
// ============================================

export type CommentResourceType = 'post' | 'video' | 'photo' | 'article';

export interface Comment {
  id: string;
  content: string;
  isEdited: boolean;
  likesCount: number;
  repliesCount: number;
  isLiked?: boolean;
  resourceType: string;
  resourceId: string;
  userId: string;
  parentCommentId?: string | null;
  dateCreated: string;
  dateUpdated: string;
  dateDeleted?: string | null;
  user?: {
    id: string;
    username: string;
    displayName: string;
    profile?: {
      avatar?: string | null;
    };
  };
  parentComment?: Comment | null;
  replies?: Comment[];
}

export interface CreateCommentRequest {
  content: string;
  parentCommentId?: string;
}

export interface UpdateCommentRequest {
  content?: string;
}

export interface CommentResponse {
  data: Comment;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginationResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

