/**
 * Admin Session Token Storage
 * 
 * Stores admin session tokens for the admin client.
 * Uses localStorage with beforeunload handler to clear when browser tab/window closes.
 * Admin sessions are separate from regular user sessions.
 */

const ADMIN_TOKEN_KEYS = {
  SESSION: 'admin_session_token',
  EXPIRES_AT: 'admin_session_expires_at',
  USER: 'admin_user',
} as const;

export interface AdminTokenStorage {
  getAdminSessionToken(): string | null;
  getAdminSessionExpiresAt(): string | null;
  getAdminUser(): any | null;
  setAdminSessionToken(token: string, expiresAt: string, user: any): void;
  clearAdminSession(): void;
  hasAdminSession(): boolean;
  isAdminSessionValid(): boolean;
}

class LocalStorageAdminTokenStorage implements AdminTokenStorage {
  private isClient(): boolean {
    return typeof window !== 'undefined';
  }

  private beforeUnloadHandler: (() => void) | null = null;

  getAdminSessionToken(): string | null {
    if (!this.isClient()) return null;
    return localStorage.getItem(ADMIN_TOKEN_KEYS.SESSION);
  }

  getAdminSessionExpiresAt(): string | null {
    if (!this.isClient()) return null;
    return localStorage.getItem(ADMIN_TOKEN_KEYS.EXPIRES_AT);
  }

  getAdminUser(): any | null {
    if (!this.isClient()) return null;
    const userStr = localStorage.getItem(ADMIN_TOKEN_KEYS.USER);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  setAdminSessionToken(token: string, expiresAt: string, user: any): void {
    if (!this.isClient()) return;
    
    try {
      localStorage.setItem(ADMIN_TOKEN_KEYS.SESSION, token);
      localStorage.setItem(ADMIN_TOKEN_KEYS.EXPIRES_AT, expiresAt);
      localStorage.setItem(ADMIN_TOKEN_KEYS.USER, JSON.stringify(user));
      
      // Remove previous handler if exists
      if (this.beforeUnloadHandler) {
        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      }
      
      // Clear session when page is closed/unloaded
      this.beforeUnloadHandler = () => {
        this.clearAdminSession();
      };
      window.addEventListener('beforeunload', this.beforeUnloadHandler);
    } catch (error) {
      console.error('Failed to store admin session token:', error);
      throw new Error('Failed to store admin session token');
    }
  }

  clearAdminSession(): void {
    if (!this.isClient()) return;
    
    try {
      localStorage.removeItem(ADMIN_TOKEN_KEYS.SESSION);
      localStorage.removeItem(ADMIN_TOKEN_KEYS.EXPIRES_AT);
      localStorage.removeItem(ADMIN_TOKEN_KEYS.USER);
      
      // Remove beforeunload handler
      if (this.beforeUnloadHandler) {
        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
        this.beforeUnloadHandler = null;
      }
    } catch (error) {
      console.error('Failed to clear admin session:', error);
    }
  }

  hasAdminSession(): boolean {
    return !!this.getAdminSessionToken();
  }

  isAdminSessionValid(): boolean {
    const expiresAt = this.getAdminSessionExpiresAt();
    if (!expiresAt) return false;
    
    try {
      const expiryDate = new Date(expiresAt);
      return expiryDate > new Date();
    } catch {
      return false;
    }
  }
}

export const adminTokenStorage: AdminTokenStorage = new LocalStorageAdminTokenStorage();

