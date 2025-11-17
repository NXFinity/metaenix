// ============================================
// Post Types
// ============================================

export interface Post {
  id: string;
  content: string;
  mediaUrl?: string | null;
  mediaUrls?: string[];
  linkUrl?: string | null;
  linkTitle?: string | null;
  linkDescription?: string | null;
  linkImage?: string | null;
  isPublic: boolean;
  allowComments: boolean;
  isPinned: boolean;
  isEdited: boolean;
  isDraft: boolean;
  isArchived: boolean;
  scheduledDate?: string | null;
  hashtags?: string[];
  mentions?: string[];
  postType?: 'text' | 'image' | 'video' | 'document' | 'mixed' | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  bookmarksCount: number;
  reportsCount: number;
  userId: string;
  parentPostId?: string | null;
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
  parentPost?: Post | null;
  replies?: Post[];
}

export interface Comment {
  id: string;
  content: string;
  isEdited: boolean;
  likesCount: number;
  repliesCount: number;
  postId: string;
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

export interface CreatePostRequest {
  content: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  linkImage?: string;
  isPublic?: boolean;
  allowComments?: boolean;
  isDraft?: boolean;
  parentPostId?: string;
  scheduledDate?: string;
}

export interface UpdatePostRequest {
  content?: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  linkImage?: string;
  isPublic?: boolean;
  allowComments?: boolean;
  isDraft?: boolean;
}

export interface CreateCommentRequest {
  content: string;
  parentCommentId?: string;
}

export interface UpdateCommentRequest {
  content?: string;
}

export interface CreateShareRequest {
  comment?: string;
}

export interface BookmarkPostRequest {
  note?: string;
}

export interface ReportPostRequest {
  reason:
    | 'spam'
    | 'harassment'
    | 'hate_speech'
    | 'violence'
    | 'copyright'
    | 'false_information'
    | 'inappropriate_content'
    | 'other';
  description?: string;
}

export interface ReactToPostRequest {
  reactionType: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';
}

export interface CreateCollectionRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
  coverImage?: string;
}

export interface SchedulePostRequest {
  scheduledDate: string;
}

export interface PinPostRequest {
  isPinned: boolean;
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

export interface PostResponse {
  message: string;
  post: Post;
}

export interface CommentResponse {
  message: string;
  comment: Comment;
}

export interface DeleteResponse {
  message: string;
}

export interface LikeResponse {
  message: string;
  liked: boolean;
}

export interface ShareResponse {
  message: string;
  shareId: string;
}

export interface BookmarkResponse {
  message: string;
  bookmarked: boolean;
}

export interface ReportResponse {
  message: string;
  reportId: string;
}

export interface ReactionResponse {
  message: string;
  reactionType: string;
}

export interface CollectionResponse {
  message: string;
  collection: {
    id: string;
    name: string;
    description?: string;
    isPublic: boolean;
    coverImage?: string;
    postsCount: number;
    dateCreated: string;
  };
}

export interface PostAnalytics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  bookmarks: number;
  engagementRate: number;
  reach: number;
  impressions: number;
}

