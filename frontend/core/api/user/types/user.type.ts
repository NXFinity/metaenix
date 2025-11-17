// ============================================
// User Types
// ============================================

export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  websocketId: string;
  role: string;
  isPublic?: boolean;
  dateCreated?: string;
  dateUpdated?: string;
  dateDeleted?: string | null;
  followersCount?: number;
  followingCount?: number;
  isDeveloper?: boolean;
  developerTermsAcceptedAt?: string | null;
  profile?: {
    id?: string;
    dateCreated?: string;
    dateUpdated?: string;
    dateDeleted?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    bio?: string | null;
    avatar?: string | null;
    cover?: string | null;
    banner?: string | null;
    offline?: string | null;
    chat?: string | null;
    location?: string | null;
    website?: string | null;
    dateOfBirth?: string | null;
  };
  privacy?: {
    id?: string;
    dateCreated?: string;
    dateUpdated?: string;
    dateDeleted?: string | null;
    isFollowerOnly: boolean;
    isSubscriberOnly: boolean;
    isMatureContent?: boolean;
    allowMessages: boolean;
    allowNotifications?: boolean;
    allowFriendRequests?: boolean;
    notifyOnFollow?: boolean;
  };
  security?: {
    id?: string;
    dateCreated?: string;
    dateUpdated?: string;
    dateDeleted?: string | null;
    verificationToken?: string | null;
    isVerified: boolean;
    dateVerified?: string | null;
    refreshToken?: string | null;
    passwordResetToken?: string | null;
    passwordResetTokenExpires?: string | null;
    isTwoFactorEnabled: boolean;
    twoFactorSecret?: string | null;
    twoFactorToken?: string | null;
    twoFactorBackupCodes?: string[] | null;
    twoFactorEnabledAt?: string | null;
    twoFactorLastVerified?: string | null;
    twoFactorBackupCodesGeneratedAt?: string | null;
    isBanned: boolean;
    banReason?: string | null;
    bannedUntil?: string | null;
    bannedAt?: string | null;
    isTimedOut: boolean;
    timeoutReason?: string | null;
    timedOutUntil?: string | null;
    isAgedVerified?: boolean;
    agedVerifiedDate?: string | null;
  };
}

export interface UpdateUserRequest {
  username?: string;
  displayName?: string;
  isPublic?: boolean;
  profile?: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    location?: string;
    website?: string;
    dateOfBirth?: string;
    avatar?: string;
    cover?: string;
    banner?: string;
  };
  privacy?: {
    isFollowerOnly?: boolean;
    isSubscriberOnly?: boolean;
    isMatureContent?: boolean;
    allowMessages?: boolean;
    allowNotifications?: boolean;
    allowFriendRequests?: boolean;
  };
}

export interface UpdateUserResponse {
  message: string;
  user: User;
}

export interface DeleteUserResponse {
  message: string;
}

