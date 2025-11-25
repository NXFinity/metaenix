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
  social?: {
    id?: string;
    dateCreated?: string;
    dateUpdated?: string;
    dateDeleted?: string | null;
    twitter?: string | null;
    instagram?: string | null;
    facebook?: string | null;
    github?: string | null;
    linkedin?: string | null;
    youtube?: string | null;
    tiktok?: string | null;
    discord?: string | null;
    twitch?: string | null;
    snapchat?: string | null;
    pinterest?: string | null;
    reddit?: string | null;
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
    notifyOnFollow?: boolean;
  };
  social?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    github?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
    discord?: string;
    twitch?: string;
    snapchat?: string;
    pinterest?: string;
    reddit?: string;
  };
}

export interface UpdateUserResponse {
  message: string;
  user: User;
}

export interface DeleteUserResponse {
  message: string;
}

