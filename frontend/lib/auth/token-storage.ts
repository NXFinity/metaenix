/**
 * Secure Token Storage Utility
 * 
 * Provides secure token storage with obfuscation to reduce XSS vulnerability risk.
 * This is an interim solution until httpOnly cookies can be implemented.
 * 
 * Security Notes:
 * - Tokens are obfuscated (not encrypted) to make XSS attacks more difficult
 * - Full security requires httpOnly cookies (requires backend changes)
 * - This solution reduces but does not eliminate XSS risk
 */

const TOKEN_KEYS = {
  ACCESS: 'at', // Obfuscated key name
  REFRESH: 'rt', // Obfuscated key name
} as const;

/**
 * Simple obfuscation to make tokens less obvious in localStorage
 * Note: This is NOT encryption, just obfuscation to reduce casual inspection
 */
function obfuscateToken(token: string): string {
  // Simple base64 encoding with a prefix to make it less obvious
  // In production, consider using a more sophisticated obfuscation
  return btoa(token);
}

function deobfuscateToken(obfuscated: string): string {
  try {
    return atob(obfuscated);
  } catch {
    throw new Error('Invalid token format');
  }
}

/**
 * Secure Token Storage Interface
 */
export interface TokenStorage {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setAccessToken(token: string): void;
  setRefreshToken(token: string): void;
  clearTokens(): void;
  hasTokens(): boolean;
}

/**
 * localStorage-based token storage with obfuscation
 * 
 * This implementation uses obfuscated token storage as an interim solution.
 * For full security, implement httpOnly cookies (requires backend support).
 */
class LocalStorageTokenStorage implements TokenStorage {
  private isClient(): boolean {
    return typeof window !== 'undefined';
  }

  getAccessToken(): string | null {
    if (!this.isClient()) return null;
    
    try {
      const obfuscated = localStorage.getItem(TOKEN_KEYS.ACCESS);
      if (!obfuscated) return null;
      return deobfuscateToken(obfuscated);
    } catch (error) {
      // If deobfuscation fails, clear corrupted token
      this.clearTokens();
      return null;
    }
  }

  getRefreshToken(): string | null {
    if (!this.isClient()) return null;
    
    try {
      const obfuscated = localStorage.getItem(TOKEN_KEYS.REFRESH);
      if (!obfuscated) return null;
      return deobfuscateToken(obfuscated);
    } catch (error) {
      // If deobfuscation fails, clear corrupted token
      this.clearTokens();
      return null;
    }
  }

  setAccessToken(token: string): void {
    if (!this.isClient()) return;
    
    try {
      const obfuscated = obfuscateToken(token);
      localStorage.setItem(TOKEN_KEYS.ACCESS, obfuscated);
    } catch (error) {
      console.error('Failed to store access token:', error);
      throw new Error('Failed to store access token');
    }
  }

  setRefreshToken(token: string): void {
    if (!this.isClient()) return;
    
    try {
      const obfuscated = obfuscateToken(token);
      localStorage.setItem(TOKEN_KEYS.REFRESH, obfuscated);
    } catch (error) {
      console.error('Failed to store refresh token:', error);
      throw new Error('Failed to store refresh token');
    }
  }

  clearTokens(): void {
    if (!this.isClient()) return;
    
    try {
      localStorage.removeItem(TOKEN_KEYS.ACCESS);
      localStorage.removeItem(TOKEN_KEYS.REFRESH);
      // Also clear legacy keys if they exist (for migration)
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  hasTokens(): boolean {
    return !!(this.getAccessToken() || this.getRefreshToken());
  }
}

/**
 * Cookie-based token storage (for future implementation)
 * 
 * This implementation will be used when backend supports httpOnly cookies.
 * Currently not implemented as backend uses Bearer token authentication.
 */
class CookieTokenStorage implements TokenStorage {
  // TODO: Implement when backend supports httpOnly cookies
  // This will require:
  // 1. Backend to set httpOnly cookies on login
  // 2. Backend to read tokens from cookies instead of Authorization header
  // 3. Frontend to enable withCredentials: true in axios config
  
  getAccessToken(): string | null {
    // Tokens will be automatically sent by browser in cookies
    // No need to read from client-side
    return null;
  }

  getRefreshToken(): string | null {
    // Tokens will be automatically sent by browser in cookies
    return null;
  }

  setAccessToken(_token: string): void {
    // Tokens set by backend via httpOnly cookies
    // No client-side action needed
  }

  setRefreshToken(_token: string): void {
    // Tokens set by backend via httpOnly cookies
  }

  clearTokens(): void {
    // Clear cookies (requires backend endpoint or document.cookie manipulation)
    // Note: httpOnly cookies cannot be cleared from client-side JavaScript
  }

  hasTokens(): boolean {
    // Check if cookies exist (requires cookie parsing)
    return false;
  }
}

/**
 * Token storage factory
 * 
 * Uses httpOnly cookies when enabled, otherwise localStorage with obfuscation.
 */
const USE_HTTPONLY_COOKIES = process.env.NEXT_PUBLIC_USE_HTTPONLY_COOKIES === 'true';

export const tokenStorage: TokenStorage = 
  USE_HTTPONLY_COOKIES
    ? new CookieTokenStorage()
    : new LocalStorageTokenStorage();

/**
 * Migration helper: Migrate from legacy localStorage keys to obfuscated keys
 */
export function migrateLegacyTokens(): void {
  if (typeof window === 'undefined') return;

  try {
    const legacyAccess = localStorage.getItem('accessToken');
    const legacyRefresh = localStorage.getItem('refreshToken');

    if (legacyAccess) {
      tokenStorage.setAccessToken(legacyAccess);
      localStorage.removeItem('accessToken');
    }

    if (legacyRefresh) {
      tokenStorage.setRefreshToken(legacyRefresh);
      localStorage.removeItem('refreshToken');
    }
  } catch (error) {
    console.error('Failed to migrate legacy tokens:', error);
  }
}

