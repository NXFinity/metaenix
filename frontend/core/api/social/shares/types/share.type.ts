// ============================================
// Share Types
// ============================================

export type ShareResourceType = 'post' | 'video' | 'photo' | 'article';

export interface Share {
  id: string;
  comment?: string | null;
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

export interface CreateShareRequest {
  comment?: string;
}

export interface ShareResponse {
  data: Share;
  message?: string;
}

export interface ShareStatusResponse {
  shared: boolean;
}

export interface ShareCountResponse {
  count: number;
}

