// ============================================
// Like Types
// ============================================

export type LikeResourceType = 'post' | 'video' | 'comment' | 'photo' | 'article';

export interface Like {
  id: string;
  resourceType: string;
  resourceId: string;
  userId: string;
  dateCreated: string;
  dateUpdated: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
    profile?: {
      avatar?: string | null;
    };
  };
}

export interface LikeResponse {
  data: Like;
  message?: string;
  liked?: boolean;
}

export interface LikeStatusResponse {
  liked: boolean;
}

export interface LikeCountResponse {
  count: number;
}

