import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      email: string;
      username: string;
      displayName: string;
      role: string;
      websocketId: string;
      isVerified: boolean;
    };
    pendingLogin?: {
      userId: string;
      email: string;
      passwordVerified: boolean;
      createdAt: Date;
    };
  }
}

